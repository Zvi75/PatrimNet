"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileDown, Loader2, FileText, FileSpreadsheet } from "lucide-react";
import type { Asset, Lease, Loan } from "@/types";

type ReportType =
  | "rapport-portefeuille"
  | "fiche-actif"
  | "flux-mensuel"
  | "synthese-fiscale"
  | "plan-financement"
  | "rapport-locataire";

interface ExportDialogProps {
  reportType: ReportType;
  reportTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets?: Asset[];
  leases?: Lease[];
  loans?: Loan[];
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MIMES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function ExportDialog({
  reportType,
  reportTitle,
  open,
  onOpenChange,
  assets = [],
  leases = [],
  loans = [],
}: ExportDialogProps) {
  const currentYear = new Date().getFullYear();
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [assetId, setAssetId] = useState<string>("");
  const [leaseId, setLeaseId] = useState<string>("");
  const [loanId, setLoanId] = useState<string>("");
  const [year, setYear] = useState<string>(currentYear.toString());
  const [dateFrom, setDateFrom] = useState<string>(firstOfMonth);
  const [dateTo, setDateTo] = useState<string>(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAsset = reportType === "fiche-actif";
  const needsLease = reportType === "rapport-locataire";
  const needsLoan = reportType === "plan-financement";
  const needsYear = reportType === "synthese-fiscale";
  const needsDates = reportType === "flux-mensuel";

  const canExport =
    (!needsAsset || assetId) &&
    (!needsLease || leaseId) &&
    (!needsLoan || loanId) &&
    (!needsYear || year) &&
    (!needsDates || (dateFrom && dateTo));

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (needsAsset) params.assetId = assetId;
      if (needsLease) params.leaseId = leaseId;
      if (needsLoan) params.loanId = loanId;
      if (needsYear) params.year = parseInt(year, 10);
      if (needsDates) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, params }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la génération");
      }

      const data = await res.json();
      downloadBase64(data.pdf.base64, data.pdf.name, MIMES.pdf);
      downloadBase64(data.docx.base64, data.docx.name, MIMES.docx);
      downloadBase64(data.xlsx.base64, data.xlsx.name, MIMES.xlsx);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {needsAsset && (
            <div className="space-y-1.5">
              <Label>Actif</Label>
              <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un actif…" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsLease && (
            <div className="space-y-1.5">
              <Label>Bail</Label>
              <Select value={leaseId} onValueChange={setLeaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bail…" />
                </SelectTrigger>
                <SelectContent>
                  {leases.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.reference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsLoan && (
            <div className="space-y-1.5">
              <Label>Emprunt</Label>
              <Select value={loanId} onValueChange={setLoanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un emprunt…" />
                </SelectTrigger>
                <SelectContent>
                  {loans.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.reference} — {l.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsYear && (
            <div className="space-y-1.5">
              <Label>Année fiscale</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          )}

          {needsDates && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Du</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Au</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-blue-700">
              <FileDown className="h-4 w-4" />
              <span>PDF</span>
            </div>
            <span className="text-xs text-blue-400">+</span>
            <div className="flex items-center gap-1.5 text-xs text-blue-700">
              <FileText className="h-4 w-4" />
              <span>Word</span>
            </div>
            <span className="text-xs text-blue-400">+</span>
            <div className="flex items-center gap-1.5 text-xs text-blue-700">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </div>
            <span className="ml-auto text-xs text-blue-600">3 fichiers simultanés</span>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={!canExport || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
