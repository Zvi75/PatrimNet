"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanFormDialog } from "./loan-form-dialog";
import { LoanAmortizationTable } from "./loan-amortization-table";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateDSCR } from "@/lib/notion/loans";
import type { Loan, Asset, LegalEntity, Lease, UserRole } from "@/types";

interface LoanListViewProps {
  loans: Loan[];
  assets: Asset[];
  entities: LegalEntity[];
  leases: Lease[];
  role: UserRole;
}

export function LoanListView({ loans, assets, entities, leases, role }: LoanListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editLoan, setEditLoan] = useState<Loan | null>(null);

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const entityMap = new Map(entities.map((e) => [e.id, e.name]));

  // Pre-compute per-loan DSCR using leases linked to same asset
  function getLoanMetrics(loan: Loan) {
    const assetLeases = leases.filter((l) => l.assetId === loan.assetId && l.status === "Actif");
    const annualRent = assetLeases.reduce((s, l) => s + (l.baseRent + (l.charges ?? 0)) * 12, 0);
    const annualDebt = loan.monthlyPayment * 12;
    const dscr = calculateDSCR(annualRent, annualDebt);

    // Estimated outstanding capital
    let outstanding = loan.outstandingCapital;
    if (!outstanding) {
      const schedule = generateAmortizationSchedule({
        loanId: loan.id,
        initialAmount: loan.initialAmount,
        annualInterestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        startDate: loan.startDate,
        endDate: loan.endDate,
      });
      outstanding = estimateOutstandingCapital(schedule);
    }

    // Remaining months
    const today = new Date();
    const end = new Date(loan.endDate);
    const remainingMonths = Math.max(
      0,
      (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth()),
    );

    return { dscr, outstanding, remainingMonths };
  }

  const filtered = loans.filter((l) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      l.reference.toLowerCase().includes(q) ||
      l.bank.toLowerCase().includes(q) ||
      (assetMap.get(l.assetId)?.name ?? "").toLowerCase().includes(q)
    );
  });

  // Portfolio summary
  const totalDebt = loans.reduce((s, l) => {
    const { outstanding } = getLoanMetrics(l);
    return s + (outstanding ?? 0);
  }, 0);
  const totalMonthlyService = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  async function handleDelete(loan: Loan) {
    const res = await fetch(`/api/loans/${loan.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Emprunt "${loan.reference}" supprimé`);
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erreur");
    }
  }

  const canEdit = role !== "read-only";

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Aucun emprunt"
        description="Ajoutez vos emprunts immobiliers pour suivre les tableaux d'amortissement et calculer le DSCR."
        action={
          canEdit ? (
            <LoanFormDialog
              assets={assets}
              entities={entities}
              trigger={<Button>Ajouter un emprunt</Button>}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Capital restant total</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Service de la dette / mois</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatCurrency(totalMonthlyService)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Nombre d'emprunts</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{loans.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Loan cards */}
      <div className="space-y-4">
        {filtered.map((loan) => {
          const { dscr, outstanding, remainingMonths } = getLoanMetrics(loan);
          const dscrOk = dscr === Infinity || dscr >= 1.25;
          const dscrWarn = dscr !== Infinity && dscr >= 1 && dscr < 1.25;
          const dscrBad = dscr !== Infinity && dscr < 1;
          const asset = assetMap.get(loan.assetId);

          return (
            <div
              key={loan.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{loan.reference}</h3>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{loan.bank}</span>
                    <Badge variant={loan.parsed ? "success" : "secondary"} className="text-xs">
                      {loan.parsed ? "TA parsé" : "TA théorique"}
                    </Badge>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {asset && (
                      <span>
                        Actif : <span className="font-medium text-slate-600">{asset.name}</span>
                      </span>
                    )}
                    <span>
                      Entité :{" "}
                      <span className="font-medium text-slate-600">
                        {entityMap.get(loan.legalEntityId) ?? "—"}
                      </span>
                    </span>
                    <span>
                      {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
                    </span>
                    <span>{remainingMonths} mois restants</span>
                  </div>
                </div>

                {/* Actions */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditLoan(loan)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      {role === "admin" && (
                        <>
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            }
                            title={`Supprimer "${loan.reference}" ?`}
                            description="L'emprunt et son tableau d'amortissement seront archivés."
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() => handleDelete(loan)}
                          />
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Metrics row */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">Capital initial</p>
                  <p className="text-sm font-semibold">{formatCurrency(loan.initialAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Taux</p>
                  <p className="text-sm font-semibold">{loan.interestRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Mensualité</p>
                  <p className="text-sm font-semibold">{formatCurrency(loan.monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Capital restant dû</p>
                  <p className="text-sm font-semibold">
                    {outstanding ? formatCurrency(outstanding) : "—"}
                  </p>
                </div>
              </div>

              {/* DSCR */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">DSCR :</span>
                  <span
                    className={`text-sm font-bold ${dscrOk ? "text-green-600" : dscrWarn ? "text-orange-500" : "text-red-600"}`}
                  >
                    {dscr === Infinity ? "∞" : dscr.toFixed(2)}
                  </span>
                  {dscrBad && (
                    <div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-600">Insuffisant</span>
                    </div>
                  )}
                  {dscrWarn && (
                    <div className="py.0.5 flex items-center gap-1 rounded-md bg-orange-50 px-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600">Limite</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amortization table toggle */}
              <LoanAmortizationTable loanId={loan.id} />
            </div>
          );
        })}
      </div>

      {editLoan && (
        <LoanFormDialog
          assets={assets}
          entities={entities}
          loan={editLoan}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditLoan(null)}
        />
      )}
    </div>
  );
}
