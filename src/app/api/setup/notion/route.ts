import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { setupNotionDatabases } from "@/lib/notion/setup";

const schema = z.object({
  parentPageId: z.string().min(32).max(36),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { parentPageId } = schema.parse(body);

    // Normalise Notion page ID (remove hyphens if present)
    const cleanId = parentPageId.replace(/-/g, "");
    const formattedId = [
      cleanId.slice(0, 8),
      cleanId.slice(8, 12),
      cleanId.slice(12, 16),
      cleanId.slice(16, 20),
      cleanId.slice(20),
    ].join("-");

    const result = await setupNotionDatabases(formattedId);

    return NextResponse.json({
      ok: true,
      databases: result,
      envBlock: Object.entries(result)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/setup/notion]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
