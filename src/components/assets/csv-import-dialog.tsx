"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LegalEntity } from "@/types";

interface CsvImportDialogProps {
  entities: LegalEntity[];
  trigger: React.ReactNode;
}

type ParsedRow = {
  name: string;
  address: string;
  type?: string;
  status?: string;
  surfaceM2?: string;
  acquisitionDate?: string;
  acquisitionPrice?: string;
  currentMarketValue?: string;
  ownershipPercent?: string;
  notes?: string;
};

const TEMPLATE = `name,address,type,status,surfaceM2,acquisitionPrice,currentMarketValue,ownershipPercent,acquisitionDate,notes
Appartement Marais,12 rue de Bretagne 75003 Paris,Appartement,Occupé,65,450000,520000,100,2021-06-15,Beau duplex
Bureau Opéra,8 boulevard des Capucines 75009 Paris,Bureau,Vacant,120,850000,,50,,`;

function parseCsv(raw: string): { rows: ParsedRow[]; error?: string } {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "Le fichier doit contenir au moins un en-tête et une ligne de données." };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const addressIdx = headers.indexOf("address");
  if (nameIdx === -1 || addressIdx === -1) {
    return { rows: [], error: "Les colonnes 'name' et 'address' sont obligatoires." };
  }

  const get = (cells: string[], key: string) => {
    const i = headers.indexOf(key);
    return i !== -1 ? cells[i]?.trim() || undefined : undefined;
  };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const name = cells[nameIdx]?.trim();
    const address = cells[addressIdx]?.trim();
    if (!name || !address) continue;
    rows.push({
      name,
      address,
      type: get(cells, "type"),
      status: get(cells, "status"),
      surfaceM2: get(cells, "surfacem2"),
      acquisitionDate: get(cells, "acquisitiondate"),
      acquisitionPrice: get(cells, "acquisitionprice"),
      currentMarketValue: get(cells, "currentmarketvalue"),
      ownershipPercent: get(cells, "ownershippercent"),
      notes: get(cells, "notes"),
    });
  }

  if (rows.length === 0) return { rows: [], error: "Aucune ligne valide trouvée." };
  return { rows };
}

export function CsvImportDialog({ entities, trigger }: CsvImportDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ created: number; errors: number } | null>(null);

  function handleClose() {
    setOpen(false);
    setCsv("");
    setParsed([]);
    setParseError("");
    setResults(null);
  }

  function handleParse() {
    const { rows, error } = parseCsv(csv);
    if (error) { setParseError(error); setParsed([]); return; }
    setParseError("");
    setParsed(rows);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsv(text);
      const { rows, error } = parseCsv(text);
      if (error) { setParseError(error); setParsed([]); }
      else { setParseError(""); setParsed(rows); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (!entityId || parsed.length === 0) return;
    setLoading(true);
    try {
      const rows = parsed.map((r) => ({
        name: r.name,
        address: r.address,
        legalEntityId: entityId,
        ...(r.type && { type: r.type }),
        ...(r.status && { status: r.status }),
        ...(r.surfaceM2 && { surfaceM2: r.surfaceM2 }),
        ...(r.acquisitionDate && { acquisitionDate: r.acquisitionDate }),
        ...(r.acquisitionPrice && { acquisitionPrice: r.acquisitionPrice }),
        ...(r.currentMarketValue && { currentMarketValue: r.currentMarketValue }),
        ...(r.ownershipPercent && { ownershipPercent: r.ownershipPercent }),
        ...(r.notes && { notes: r.notes }),
      }));

      const res = await fetch("/api/assets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur import");
      setResults({ created: data.created, errors: data.errors });
      if (data.created > 0) {
        toast.success(`${data.created} actif${data.created !== 1 ? "s" : ""} importé${data.created !== 1 ? "s" : ""}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des actifs (CSV)</DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="font-semibold text-slate-800">{results.created} actif{results.created !== 1 ? "s" : ""} créé{results.created !== 1 ? "s" : ""}</p>
            {results.errors > 0 && (
              <p className="text-sm text-red-600">{results.errors} ligne{results.errors !== 1 ? "s" : ""} en erreur</p>
            )}
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Entity selector */}
            <div className="space-y-2">
              <Label>Entité juridique pour tous les actifs *</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une entité" /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* CSV input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Données CSV</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setCsv(TEMPLATE)}
                  >
                    Charger un exemple
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Fichier .csv
                  </Button>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
              <Textarea
                value={csv}
                onChange={(e) => { setCsv(e.target.value); setParsed([]); setParseError(""); }}
                rows={5}
                placeholder="name,address,type,status,surfaceM2,…"
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-400">Colonnes requises : <code>name</code>, <code>address</code>. Optionnelles : type, status, surfaceM2, acquisitionDate, acquisitionPrice, currentMarketValue, ownershipPercent, notes.</p>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            {/* Preview */}
            {parsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Aperçu</span>
                  <Badge variant="secondary">{parsed.length} ligne{parsed.length !== 1 ? "s" : ""}</Badge>
                </div>
                <ScrollArea className="max-h-48 rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {["Nom", "Adresse", "Type", "Statut", "Surface"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[140px] truncate">{row.name}</td>
                          <td className="px-3 py-1.5 text-slate-500 max-w-[160px] truncate">{row.address}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.type ?? "—"}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.status ?? "—"}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.surfaceM2 ? `${row.surfaceM2} m²` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
              {parsed.length === 0 ? (
                <Button type="button" onClick={handleParse} disabled={!csv.trim()}>
                  Analyser le CSV
                </Button>
              ) : (
                <Button type="button" onClick={handleImport} disabled={loading || !entityId}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Importer ${parsed.length} actif${parsed.length !== 1 ? "s" : ""}`}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
