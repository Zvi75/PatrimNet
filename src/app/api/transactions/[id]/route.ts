import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "@/lib/notion/transactions";
import { TRANSACTION_TYPES, TRANSACTION_DIRECTIONS } from "@/lib/constants";

const schema = z.object({
  label: z.string().min(1).max(200).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  amount: z.number().nonnegative().optional(),
  direction: z.enum(TRANSACTION_DIRECTIONS).optional(),
  date: z.string().optional(),
  assetId: z.string().optional(),
  legalEntityId: z.string().optional(),
  leaseId: z.string().optional(),
  loanId: z.string().optional(),
  reconciled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    const tx = await getTransactionById(id);
    if (!tx || tx.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tx = await getTransactionById(id);
    if (!tx || tx.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);
    await updateTransaction(id, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tx = await getTransactionById(id);
    if (!tx || tx.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
