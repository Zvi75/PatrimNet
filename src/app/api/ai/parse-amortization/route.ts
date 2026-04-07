import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { getLoanById, updateLoan } from "@/lib/notion/loans";
import { deleteAmortizationLines, bulkCreateAmortizationLines } from "@/lib/notion/amortization-lines";
import { requireFeature } from "@/lib/feature-gate";
import { anthropic, AI_MODEL } from "@/lib/ai/client";

const schema = z.object({
  loanId: z.string().min(1),
  fileBase64: z.string().min(1), // base64-encoded PDF or image
  mediaType: z.enum([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]),
});

const PARSE_PROMPT = `Analyse ce tableau d'amortissement et extrait TOUTES les lignes.
Retourne un tableau JSON valide (et rien d'autre) avec ce format exact :
[
  {
    "periodDate": "YYYY-MM-DD",
    "capitalPayment": 1234.56,
    "interestPayment": 234.56,
    "insurancePayment": 50.00,
    "totalPayment": 1519.12,
    "remainingCapital": 248765.44
  }
]

Règles :
- periodDate : premier jour du mois concerné au format ISO 8601
- Tous les montants sont en euros (nombres décimaux)
- insurancePayment est optionnel (null si absent)
- Ne retourne QUE le tableau JSON, sans texte supplémentaire ni balises markdown`;

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace)
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    requireFeature(workspace.plan.toUpperCase() as never, "ai");

    const body = await req.json();
    const { loanId, fileBase64, mediaType } = schema.parse(body);

    const loan = await getLoanById(loanId);
    if (!loan || loan.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    // Build content block depending on media type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentBlock: any;
    if (mediaType === "application/pdf") {
      contentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
      };
    } else {
      contentBlock = {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      };
    }

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: PARSE_PROMPT },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON — strip any markdown fences if present
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let rows: {
      periodDate: string;
      capitalPayment: number;
      interestPayment: number;
      insurancePayment?: number | null;
      totalPayment: number;
      remainingCapital: number;
    }[];

    try {
      rows = JSON.parse(jsonText);
      if (!Array.isArray(rows)) throw new Error("Not an array");
    } catch {
      return NextResponse.json(
        { error: "Claude n'a pas pu extraire le tableau. Vérifiez la qualité du document.", raw },
        { status: 422 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucune ligne extraite du document." }, { status: 422 });
    }

    // Replace existing amortization lines
    await deleteAmortizationLines(loanId);
    await bulkCreateAmortizationLines(
      rows.map((r) => ({
        periodDate: r.periodDate,
        capitalPayment: r.capitalPayment,
        interestPayment: r.interestPayment,
        totalPayment: r.totalPayment,
        remainingCapital: r.remainingCapital,
        ...(r.insurancePayment != null && { insurancePayment: r.insurancePayment }),
      })),
      loanId,
      ctx.workspaceId,
    );

    // Mark loan as parsed + store outstanding capital from last line
    const lastLine = rows[rows.length - 1];
    const today = new Date().toISOString().slice(0, 10);
    const passedRows = rows.filter((r) => r.periodDate <= today);
    const currentOutstanding =
      passedRows.length > 0
        ? passedRows[passedRows.length - 1].remainingCapital
        : rows[0].remainingCapital;

    await updateLoan(loanId, { parsed: true, outstandingCapital: currentOutstanding });

    return NextResponse.json({
      ok: true,
      linesCreated: rows.length,
      currentOutstanding,
      lastRemainingCapital: lastLine.remainingCapital,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/ai/parse-amortization]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
