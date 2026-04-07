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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRANSACTION_TYPES, TRANSACTION_DIRECTIONS } from "@/lib/constants";
import type { Transaction, Asset, LegalEntity, Lease, TransactionType, TransactionDirection } from "@/types";

interface TransactionFormDialogProps {
  assets: Asset[];
  entities: LegalEntity[];
  leases: Lease[];
  transaction?: Transaction | null;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function TransactionFormDialog({
  assets, entities, leases, transaction, trigger, defaultOpen = false, onClose,
}: TransactionFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(transaction);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    label: transaction?.label ?? "",
    type: (transaction?.type ?? "Loyer") as TransactionType,
    amount: transaction?.amount?.toString() ?? "",
    direction: (transaction?.direction ?? "Encaissement") as TransactionDirection,
    date: transaction?.date ?? new Date().toISOString().slice(0, 10),
    assetId: transaction?.assetId ?? "",
    legalEntityId: transaction?.legalEntityId ?? "",
    leaseId: transaction?.leaseId ?? "",
    reconciled: transaction?.reconciled ?? false,
    notes: transaction?.notes ?? "",
  });

  function handleClose() { setOpen(false); onClose?.(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      label: form.label,
      type: form.type,
      amount: parseFloat(form.amount) || 0,
      direction: form.direction,
      date: form.date,
      reconciled: form.reconciled,
      ...(form.assetId && { assetId: form.assetId }),
      ...(form.legalEntityId && { legalEntityId: form.legalEntityId }),
      ...(form.leaseId && { leaseId: form.leaseId }),
      ...(form.notes && { notes: form.notes }),
    };
    try {
      const res = await fetch(
        isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(isEdit ? "Transaction mise à jour" : "Transaction créée");
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally { setLoading(false); }
  }

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="tx-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tx-label">Libellé *</Label>
                <Input id="tx-label" value={form.label} onChange={(e) => set("label")(e.target.value)} placeholder="Loyer mars — Appartement Marais" required autoFocus />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => set("type")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sens *</Label>
                <Select value={form.direction} onValueChange={(v) => set("direction")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tx-amount">Montant (€) *</Label>
                <Input id="tx-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount")(e.target.value)} placeholder="1500" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tx-date">Date *</Label>
                <Input id="tx-date" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Actif</Label>
                <Select value={form.assetId || "none"} onValueChange={(v) => set("assetId")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entité juridique</Label>
                <Select value={form.legalEntityId || "none"} onValueChange={(v) => set("legalEntityId")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Bail associé</Label>
                <Select value={form.leaseId || "none"} onValueChange={(v) => set("leaseId")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {leases.map((l) => <SelectItem key={l.id} value={l.id}>{l.reference}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="tx-rec" checked={form.reconciled} onCheckedChange={(v) => set("reconciled")(Boolean(v))} />
                <Label htmlFor="tx-rec" className="cursor-pointer">Réconcilié</Label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tx-notes">Notes</Label>
                <Textarea id="tx-notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={2} />
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
          <Button type="submit" form="tx-form" disabled={loading || !form.label || !form.amount || !form.date}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
