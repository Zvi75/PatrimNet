import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { requireFeature } from "@/lib/feature-gate";
import { anthropic, AI_MODEL } from "@/lib/ai/client";
import { buildPortfolioContext, SYSTEM_PROMPT } from "@/lib/ai/portfolio-context";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  question: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();

    // 20 AI queries per workspace per hour
    if (isRateLimited(`ai:query:${ctx.workspaceId}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Limite de requêtes atteinte. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    requireFeature(workspace.plan.toUpperCase() as never, "ai");

    const body = await req.json();
    const { question, history = [] } = schema.parse(body);

    // Build portfolio context (cached per request, not per token)
    const portfolioContext = await buildPortfolioContext(ctx.workspaceId);

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...history,
      { role: "user", content: question },
    ];

    // Streaming response
    const stream = await anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${portfolioContext}`,
      messages,
    });

    const textStream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(enc.encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/ai/query]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
