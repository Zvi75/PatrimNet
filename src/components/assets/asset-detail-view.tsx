"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, MapPin, Calendar, TrendingUp, FileText,
  CreditCard, Building2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AssetFormDialog } from "./asset-form-dialog";
import { formatCurrency, formatDate, formatPercent, daysUntil } from "@/lib/utils";
import type { Asset, LegalEntity, Lease, Loan, Document, UserRole } from "@/types";

const STATUS_VARIANTS: Record<string, "success" | "destructive" | "warning" | "info"> = {
  "Occupé": "success",
  "Vacant": "destructive",
  "En travaux": "warning",
  "En vente": "info",
};

interface AssetDetailViewProps {
  asset: Asset;
  entity: LegalEntity | null;
  leases: Lease[];
  loans: Loan[];
  documents: Document[];
  role: UserRole;
}

export function AssetDetailView({ asset, entity, leases, loans, documents, role }: AssetDetailViewProps) {
  const router = useRouter();

  // Financial calculations
  const activeLeases = leases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const annualRent = monthlyRent * 12;
  const netYield = asset.currentMarketValue && annualRent > 0
    ? (annualRent / asset.currentMarketValue) * 100
    : null;
  const monthlyDebtService = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const annualDebtService = monthlyDebtService * 12;
  const dscr = annualDebtService > 0 ? annualRent / annualDebtService : null;
  const occupancyRate = leases.length > 0
    ? (activeLeases.length / leases.length) * 100
    : (asset.status === "Occupé" ? 100 : 0);

  async function handleDelete() {
    const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Actif supprimé");
      router.push("/assets");
    } else {
      const d = await res.json();
      toast.error(d.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/assets">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{asset.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {asset.address}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[asset.status] ?? "secondary"}>{asset.status}</Badge>
          {role !== "read-only" && (
            <AssetFormDialog
              entities={entity ? [entity] : []}
              asset={asset}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
              }
            />
          )}
          {role === "admin" && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">Supprimer</Button>}
              title="Supprimer cet actif ?"
              description="L'actif sera archivé. Les baux, emprunts et transactions associés resteront dans Notion."
              confirmLabel="Supprimer"
              destructive
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="identity">
        <TabsList>
          <TabsTrigger value="identity">Identité</TabsTrigger>
          <TabsTrigger value="financial">
            Financier
            {activeLeases.length > 0 && (
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                {activeLeases.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leases">Baux ({leases.length})</TabsTrigger>
          <TabsTrigger value="loans">Emprunts ({loans.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        {/* ── Identité ─────────────────────────────────────── */}
        <TabsContent value="identity" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Type", value: asset.type },
              { label: "Surface", value: asset.surfaceM2 ? `${asset.surfaceM2} m²` : "—" },
              { label: "DPE", value: asset.dpe ?? "—" },
              { label: "Entité juridique", value: entity?.name ?? "—" },
              { label: "Détention", value: asset.ownershipPercent ? formatPercent(asset.ownershipPercent) : "—" },
              { label: "Régime fiscal", value: entity?.taxRegime ?? "—" },
              { label: "Date d'acquisition", value: asset.acquisitionDate ? formatDate(asset.acquisitionDate) : "—" },
              { label: "Prix d'acquisition", value: asset.acquisitionPrice ? formatCurrency(asset.acquisitionPrice) : "—" },
              { label: "Valeur de marché", value: asset.currentMarketValue ? formatCurrency(asset.currentMarketValue) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-white p-4">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
              </div>
            ))}

            {asset.notes && (
              <div className="rounded-lg border border-slate-100 bg-white p-4 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{asset.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Financier ────────────────────────────────────── */}
        <TabsContent value="financial" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-400">Loyer mensuel brut</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(monthlyRent)}</p>
                <p className="text-xs text-slate-400">{formatCurrency(annualRent)} / an</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-400">Rendement net</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {netYield !== null ? `${netYield.toFixed(2)}%` : "—"}
                </p>
                <p className="text-xs text-slate-400">sur valeur de marché</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-400">Service de la dette / mois</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(monthlyDebtService)}</p>
                <p className="text-xs text-slate-400">{loans.length} emprunt{loans.length !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-400">DSCR</p>
                <p className={`mt-1 text-2xl font-bold ${dscr === null ? "text-slate-400" : dscr >= 1.25 ? "text-green-600" : dscr >= 1 ? "text-orange-500" : "text-red-600"}`}>
                  {dscr !== null ? dscr.toFixed(2) : "—"}
                </p>
                <p className="text-xs text-slate-400">ratio couverture dette</p>
              </CardContent>
            </Card>
          </div>

          {dscr !== null && dscr < 1 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">
                <strong>Alerte DSCR :</strong> Le ratio couverture de la dette est inférieur à 1. Les revenus locatifs ne couvrent pas le service de la dette.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Baux ─────────────────────────────────────────── */}
        <TabsContent value="leases" className="mt-4">
          {leases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Aucun bail pour cet actif</p>
              <Link href="/leases">
                <Button variant="outline" size="sm" className="mt-3">
                  Gérer les baux →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {leases.map((lease, i) => {
                const days = daysUntil(lease.endDate);
                return (
                  <div key={lease.id} className={`flex items-center gap-4 px-5 py-4 ${i < leases.length - 1 ? "border-b border-slate-100" : ""}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{lease.reference}</p>
                      <p className="text-xs text-slate-400">
                        {lease.type} · {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(lease.baseRent)}/mois</span>
                    <Badge variant={STATUS_VARIANTS[lease.status] ?? "secondary"} className="text-xs">{lease.status}</Badge>
                    {lease.status === "Actif" && days <= 90 && (
                      <Badge variant="warning" className="text-xs">J-{days}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Emprunts ──────────────────────────────────────── */}
        <TabsContent value="loans" className="mt-4">
          {loans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Aucun emprunt pour cet actif</p>
              <Link href="/loans">
                <Button variant="outline" size="sm" className="mt-3">
                  Gérer les emprunts →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {loans.map((loan, i) => (
                <div key={loan.id} className={`flex items-center gap-4 px-5 py-4 ${i < loans.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{loan.reference}</p>
                    <p className="text-xs text-slate-400">
                      {loan.bank} · {loan.interestRate}% · {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(loan.monthlyPayment)}/mois</p>
                    <p className="text-xs text-slate-400">Capital initial : {formatCurrency(loan.initialAmount)}</p>
                  </div>
                  <Badge variant={loan.parsed ? "success" : "secondary"} className="text-xs">
                    {loan.parsed ? "TA parsé" : "TA manquant"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Documents ─────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Aucun document uploadé pour cet actif</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-slate-400">
                      {doc.type} · {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
