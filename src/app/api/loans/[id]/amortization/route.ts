import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/auth";
import { getLoanById } from "@/lib/notion/loans";
import { listAmortizationLines } from "@/lib/notion/amortization-lines";
import { generateAmortizationSchedule } from "@/lib/amortization";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    const loan = await getLoanById(id);
    if (!loan || loan.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If table was parsed from PDF, return stored lines
    if (loan.parsed) {
      const lines = await listAmortizationLines(id);
      return NextResponse.json({ lines, source: "parsed" });
    }

    // Otherwise compute theoretically
    const lines = generateAmortizationSchedule({
      loanId: id,
      initialAmount: loan.initialAmount,
      annualInterestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      startDate: loan.startDate,
      endDate: loan.endDate,
    });

    return NextResponse.json({ lines, source: "theoretical" });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
