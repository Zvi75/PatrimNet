import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createLoan, listLoans } from "@/lib/notion/loans";

const schema = z.object({
  reference: z.string().min(1).max(100),
  assetId: z.string().min(1),
  legalEntityId: z.string().min(1),
  bank: z.string().min(1).max(100),
  initialAmount: z.number().positive(),
  interestRate: z.number().nonnegative(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyPayment: z.number().nonnegative(),
  outstandingCapital: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const ctx = await getApiContext();
    const loans = await listLoans(ctx.workspaceId);
    return NextResponse.json({ loans });
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
    const loan = await createLoan({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ loan }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/loans]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
