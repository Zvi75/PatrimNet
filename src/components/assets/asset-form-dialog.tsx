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
import { ASSET_TYPES, ASSET_STATUSES, DPE_RATINGS } from "@/lib/constants";
import type { Asset, LegalEntity } from "@/types";

interface AssetFormDialogProps {
  entities: LegalEntity[];
  asset?: Asset | null;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function AssetFormDialog({ entities, asset, trigger, defaultOpen = false, onClose }: AssetFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(asset);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: asset?.name ?? "",
    address: asset?.address ?? "",
    type: asset?.type ?? "Appartement",
    legalEntityId: asset?.legalEntityId ?? (entities[0]?.id ?? ""),
    status: asset?.status ?? "Vacant",
    surfaceM2: asset?.surfaceM2?.toString() ?? "",
    acquisitionDate: asset?.acquisitionDate ?? "",
    acquisitionPrice: asset?.acquisitionPrice?.toString() ?? "",
    currentMarketValue: asset?.currentMarketValue?.toString() ?? "",
    ownershipPercent: asset?.ownershipPercent?.toString() ?? "100",
    dpe: asset?.dpe ?? "",
    notes: asset?.notes ?? "",
  });

  function handleClose() { setOpen(false); onClose?.(); }

  const f = (v: string) => v ? parseFloat(v) : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      name: form.name, address: form.address, type: form.type,
      legalEntityId: form.legalEntityId, status: form.status,
      ...(form.surfaceM2 && { surfaceM2: f(form.surfaceM2) }),
      ...(form.acquisitionDate && { acquisitionDate: form.acquisitionDate }),
      ...(form.acquisitionPrice && { acquisitionPrice: f(form.acquisitionPrice) }),
      ...(form.currentMarketValue && { currentMarketValue: f(form.currentMarketValue) }),
      ...(form.ownershipPercent && { ownershipPercent: f(form.ownershipPercent) }),
      ...(form.dpe && { dpe: form.dpe }),
      ...(form.notes && { notes: form.notes }),
    };
    try {
      const res = await fetch(isEdit ? `/api/assets/${asset!.id}` : "/api/assets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(isEdit ? "Actif mis à jour" : `"${form.name}" créé`);
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally { setLoading(false); }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'actif" : "Nouvel actif immobilier"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="asset-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="a-name">Nom *</Label>
                <Input id="a-name" value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Bureau Opéra, Appartement Marais…" required autoFocus />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="a-address">Adresse *</Label>
                <Input id="a-address" value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="12 rue de la Paix, 75001 Paris" required />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={set("type")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut *</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Entité juridique *</Label>
                <Select value={form.legalEntityId} onValueChange={set("legalEntityId")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une entité" /></SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="a-surface">Surface (m²)</Label>
                <Input id="a-surface" type="number" min="0" step="0.01" value={form.surfaceM2} onChange={(e) => set("surfaceM2")(e.target.value)} placeholder="85" />
              </div>
              <div className="space-y-2">
                <Label>DPE</Label>
                <Select value={form.dpe || "none"} onValueChange={(v) => set("dpe")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {DPE_RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="a-acq-date">Date d'acquisition</Label>
                <Input id="a-acq-date" type="date" value={form.acquisitionDate} onChange={(e) => set("acquisitionDate")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-ownership">Détention (%)</Label>
                <Input id="a-ownership" type="number" min="0" max="100" step="0.01" value={form.ownershipPercent} onChange={(e) => set("ownershipPercent")(e.target.value)} placeholder="100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="a-acq-price">Prix d'acquisition (€)</Label>
                <Input id="a-acq-price" type="number" min="0" value={form.acquisitionPrice} onChange={(e) => set("acquisitionPrice")(e.target.value)} placeholder="350000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-mkt-value">Valeur de marché (€)</Label>
                <Input id="a-mkt-value" type="number" min="0" value={form.currentMarketValue} onChange={(e) => set("currentMarketValue")(e.target.value)} placeholder="420000" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="a-notes">Notes</Label>
                <Textarea id="a-notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} />
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
          <Button type="submit" form="asset-form" disabled={loading || !form.name || !form.address || !form.legalEntityId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
