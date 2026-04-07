import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createTransaction, listTransactions } from "@/lib/notion/transactions";
import { TRANSACTION_TYPES, TRANSACTION_DIRECTIONS } from "@/lib/constants";

const schema = z.object({
  label: z.string().min(1).max(200),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().nonnegative(),
  direction: z.enum(TRANSACTION_DIRECTIONS),
  date: z.string().min(1),
  assetId: z.string().optional(),
  legalEntityId: z.string().optional(),
  leaseId: z.string().optional(),
  loanId: z.string().optional(),
  reconciled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getApiContext();
    const { searchParams } = new URL(req.url);
    const transactions = await listTransactions(ctx.workspaceId, {
      assetId: searchParams.get("assetId") ?? undefined,
      legalEntityId: searchParams.get("legalEntityId") ?? undefined,
      type: (searchParams.get("type") as never) ?? undefined,
      direction: (searchParams.get("direction") as never) ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });
    return NextResponse.json({ transactions });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = schema.parse(body);
    const transaction = await createTransaction({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/transactions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
