"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Loan, Asset, LegalEntity } from "@/types";

interface LoanFormDialogProps {
  assets: Asset[];
  entities: LegalEntity[];
  loan?: Loan | null;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function LoanFormDialog({ assets, entities, loan, trigger, defaultOpen = false, onClose }: LoanFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(loan);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    reference: loan?.reference ?? "",
    assetId: loan?.assetId ?? (assets[0]?.id ?? ""),
    legalEntityId: loan?.legalEntityId ?? (entities[0]?.id ?? ""),
    bank: loan?.bank ?? "",
    initialAmount: loan?.initialAmount?.toString() ?? "",
    interestRate: loan?.interestRate?.toString() ?? "",
    startDate: loan?.startDate ?? "",
    endDate: loan?.endDate ?? "",
    monthlyPayment: loan?.monthlyPayment?.toString() ?? "",
    outstandingCapital: loan?.outstandingCapital?.toString() ?? "",
    notes: loan?.notes ?? "",
  });

  function handleClose() { setOpen(false); onClose?.(); }

  const f = (v: string) => v ? parseFloat(v) : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      reference: form.reference,
      assetId: form.assetId,
      legalEntityId: form.legalEntityId,
      bank: form.bank,
      initialAmount: parseFloat(form.initialAmount) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
      monthlyPayment: parseFloat(form.monthlyPayment) || 0,
      ...(form.outstandingCapital && { outstandingCapital: f(form.outstandingCapital) }),
      ...(form.notes && { notes: form.notes }),
    };
    try {
      const res = await fetch(isEdit ? `/api/loans/${loan!.id}` : "/api/loans", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(isEdit ? "Emprunt mis à jour" : `Emprunt "${form.reference}" créé`);
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally { setLoading(false); }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canSubmit = form.reference && form.assetId && form.legalEntityId && form.bank && form.initialAmount && form.startDate && form.endDate;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'emprunt" : "Nouvel emprunt"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="loan-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ln-ref">Référence *</Label>
                <Input id="ln-ref" value={form.reference} onChange={(e) => set("reference")(e.target.value)} placeholder="PRET-LCL-2023-001" required autoFocus />
              </div>

              <div className="space-y-2">
                <Label>Actif *</Label>
                <Select value={form.assetId} onValueChange={set("assetId")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un actif" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entité juridique *</Label>
                <Select value={form.legalEntityId} onValueChange={set("legalEntityId")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une entité" /></SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ln-bank">Banque *</Label>
                <Input id="ln-bank" value={form.bank} onChange={(e) => set("bank")(e.target.value)} placeholder="LCL, BNP Paribas, Crédit Agricole…" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-amount">Capital initial (€) *</Label>
                <Input id="ln-amount" type="number" min="0" step="1" value={form.initialAmount} onChange={(e) => set("initialAmount")(e.target.value)} placeholder="250000" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-rate">Taux d'intérêt (%) *</Label>
                <Input id="ln-rate" type="number" min="0" step="0.001" value={form.interestRate} onChange={(e) => set("interestRate")(e.target.value)} placeholder="3.50" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-start">Date de début *</Label>
                <Input id="ln-start" type="date" value={form.startDate} onChange={(e) => set("startDate")(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-end">Date de fin *</Label>
                <Input id="ln-end" type="date" value={form.endDate} onChange={(e) => set("endDate")(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-payment">Mensualité (€)</Label>
                <Input id="ln-payment" type="number" min="0" step="0.01" value={form.monthlyPayment} onChange={(e) => set("monthlyPayment")(e.target.value)} placeholder="Calculée automatiquement si vide" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ln-outstanding">Capital restant dû (€)</Label>
                <Input id="ln-outstanding" type="number" min="0" step="1" value={form.outstandingCapital} onChange={(e) => set("outstandingCapital")(e.target.value)} placeholder="Estimé automatiquement" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ln-notes">Notes</Label>
                <Textarea id="ln-notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={2} />
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
          <Button type="submit" form="loan-form" disabled={loading || !canSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
