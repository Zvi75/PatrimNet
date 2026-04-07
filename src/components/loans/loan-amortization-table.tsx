"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AmortizationLine } from "@/types";

interface LoanAmortizationTableProps {
  loanId: string;
  source?: "parsed" | "theoretical";
}

export function LoanAmortizationTable({ loanId }: LoanAmortizationTableProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<AmortizationLine[]>([]);
  const [source, setSource] = useState<"parsed" | "theoretical" | null>(null);
  const [fetched, setFetched] = useState(false);

  async function load() {
    if (fetched) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${loanId}/amortization`);
      const data = await res.json();
      if (res.ok) {
        setLines(data.lines ?? []);
        setSource(data.source);
        setFetched(true);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentMonthIndex = lines.findLastIndex((l) => l.periodDate <= today);
  const totalInterest = lines.reduce((s, l) => s + l.interestPayment, 0);

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        onClick={load}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : open ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {open ? "Masquer" : "Voir"} le tableau d'amortissement
        {source === "theoretical" && <span className="text-slate-400">(théorique)</span>}
        {source === "parsed" && <span className="text-green-600">(TA parsé)</span>}
      </Button>

      {open && lines.length > 0 && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 border-b border-slate-200 p-3 text-xs">
            <div>
              <p className="text-slate-400">Durée</p>
              <p className="font-semibold">{lines.length} mois</p>
            </div>
            <div>
              <p className="text-slate-400">Coût total des intérêts</p>
              <p className="font-semibold text-red-600">{formatCurrency(totalInterest)}</p>
            </div>
            <div>
              <p className="text-slate-400">Capital restant (estimé)</p>
              <p className="font-semibold">
                {currentMonthIndex >= 0
                  ? formatCurrency(lines[currentMonthIndex].remainingCapital)
                  : formatCurrency(lines[0]?.remainingCapital ?? 0)}
              </p>
            </div>
          </div>

          <ScrollArea className="max-h-64">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Période", "Capital", "Intérêts", "Assurance", "Total", "Restant dû"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const isCurrent = i === currentMonthIndex;
                  return (
                    <tr
                      key={line.id ?? line.periodDate}
                      className={`border-b border-slate-100 ${isCurrent ? "bg-blue-50 font-semibold" : i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                    >
                      <td className="px-3 py-1.5 text-slate-600">
                        {formatDate(line.periodDate)}
                        {isCurrent && <span className="ml-1 text-blue-600">◀</span>}
                      </td>
                      <td className="px-3 py-1.5 text-green-700">
                        {formatCurrency(line.capitalPayment)}
                      </td>
                      <td className="px-3 py-1.5 text-red-600">
                        {formatCurrency(line.interestPayment)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">
                        {line.insurancePayment ? formatCurrency(line.insurancePayment) : "—"}
                      </td>
                      <td className="px-3 py-1.5 font-medium">
                        {formatCurrency(line.totalPayment)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">
                        {formatCurrency(line.remainingCapital)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
