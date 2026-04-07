"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Loan, Asset } from "@/types";

interface AmortizationParserProps {
  loans: Loan[];
  assets: Asset[];
}

type ParseResult = {
  linesCreated: number;
  currentOutstanding: number;
};

export function AmortizationParser({ loans, assets }: AmortizationParserProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loanId, setLoanId] = useState(loans[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");

  const assetMap = new Map(assets.map((a) => [a.id, a.name]));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError("");
    e.target.value = "";
  }

  async function handleParse() {
    if (!loanId || !file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const mediaType =
        file.type === "application/pdf"
          ? "application/pdf"
          : file.type.startsWith("image/")
          ? file.type
          : "application/pdf";

      const res = await fetch("/api/ai/parse-amortization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, fileBase64: base64, mediaType }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.upgradeRequired) {
          setError("Cette fonctionnalité est réservée au plan Pro.");
        } else {
          setError(data.error ?? "Erreur lors du parsing");
        }
        return;
      }

      setResult(data);
      toast.success(`${data.linesCreated} lignes extraites et sauvegardées`);
      router.refresh();
    } catch {
      setError("Erreur réseau inattendue");
    } finally {
      setLoading(false);
    }
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-purple-500" />
            Parser un tableau d'amortissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Créez d'abord un emprunt dans la section Emprunts pour pouvoir parser son tableau d'amortissement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-purple-500" />
          Parser un tableau d'amortissement (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Uploadez un PDF ou une image d'un tableau d'amortissement bancaire. Claude extraira automatiquement
          toutes les lignes et les enregistrera dans Notion.
        </p>

        <div className="space-y-2">
          <Label>Emprunt *</Label>
          <Select value={loanId} onValueChange={setLoanId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un emprunt" />
            </SelectTrigger>
            <SelectContent>
              {loans.map((loan) => (
                <SelectItem key={loan.id} value={loan.id}>
                  {loan.reference} — {loan.bank}
                  {assetMap.has(loan.assetId) ? ` (${assetMap.get(loan.assetId)})` : ""}
                  {loan.parsed ? " ✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fichier (PDF ou image) *</Label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              file
                ? "border-purple-300 bg-purple-50"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <FileText className="mb-2 h-6 w-6 text-purple-500" />
                <p className="text-sm font-medium text-purple-700">{file.name}</p>
                <p className="text-xs text-purple-500">
                  {(file.size / 1024).toFixed(0)} Ko · Cliquer pour changer
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-6 w-6 text-slate-400" />
                <p className="text-sm text-slate-500">Cliquer ou glisser un fichier ici</p>
                <p className="text-xs text-slate-400">PDF, PNG, JPG — max 20 Mo</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">{result.linesCreated} lignes extraites avec succès</p>
              <p className="text-xs text-green-600">
                Capital restant dû actuel : {formatCurrency(result.currentOutstanding)}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleParse}
          disabled={!loanId || !file || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Analyser avec Claude
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
