import type { AmortizationLine } from "@/types";

export interface AmortizationScheduleInput {
  loanId: string;
  initialAmount: number;
  annualInterestRate: number; // percent, e.g. 3.5
  monthlyPayment: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  insuranceMonthly?: number;
}

/**
 * Generates a theoretical French constant-annuity amortization schedule.
 * If monthlyPayment is 0 or missing, it is computed from the loan parameters.
 */
export function generateAmortizationSchedule(
  input: AmortizationScheduleInput,
): Omit<AmortizationLine, "id" | "notionId">[] {
  const { loanId, initialAmount, annualInterestRate, startDate, endDate, insuranceMonthly } = input;

  const monthlyRate = annualInterestRate / 100 / 12;
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Number of payments
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  if (months <= 0 || initialAmount <= 0) return [];

  // Compute monthly payment if not provided
  let payment = input.monthlyPayment;
  if (!payment || payment <= 0) {
    if (monthlyRate === 0) {
      payment = initialAmount / months;
    } else {
      payment =
        (initialAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
    }
  }

  const lines: Omit<AmortizationLine, "id" | "notionId">[] = [];
  let remaining = initialAmount;

  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periodDate = d.toISOString().slice(0, 10);

    const interestPayment = remaining * monthlyRate;
    const capitalPayment = Math.min(payment - interestPayment, remaining);
    remaining = Math.max(0, remaining - capitalPayment);

    lines.push({
      loanId,
      periodDate,
      capitalPayment: Math.round(capitalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      insurancePayment: insuranceMonthly,
      totalPayment:
        Math.round((capitalPayment + interestPayment + (insuranceMonthly ?? 0)) * 100) / 100,
      remainingCapital: Math.round(remaining * 100) / 100,
    });

    if (remaining <= 0) break;
  }

  return lines;
}

/**
 * Estimates outstanding capital at today's date from the schedule.
 */
export function estimateOutstandingCapital(
  schedule: Omit<AmortizationLine, "id" | "notionId">[],
): number {
  const today = new Date().toISOString().slice(0, 10);
  const passed = schedule.filter((l) => l.periodDate <= today);
  if (passed.length === 0) return schedule[0]?.remainingCapital ?? 0;
  return passed[passed.length - 1].remainingCapital;
}

/**
 * Total interest cost over the life of the loan.
 */
export function totalInterestCost(schedule: Omit<AmortizationLine, "id" | "notionId">[]): number {
  return Math.round(schedule.reduce((s, l) => s + l.interestPayment, 0) * 100) / 100;
}
