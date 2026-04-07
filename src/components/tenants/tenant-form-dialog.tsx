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
import { TENANT_TYPES, PAYMENT_SCORES } from "@/lib/constants";
import type { Tenant, TenantType, PaymentScore } from "@/types";

interface TenantFormDialogProps {
  tenant?: Tenant | null;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function TenantFormDialog({ tenant, trigger, defaultOpen = false, onClose }: TenantFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(tenant);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: tenant?.name ?? "",
    type: (tenant?.type ?? "Personne physique") as TenantType,
    siret: tenant?.siret ?? "",
    email: tenant?.email ?? "",
    phone: tenant?.phone ?? "",
    guarantorName: tenant?.guarantorName ?? "",
    guarantorContact: tenant?.guarantorContact ?? "",
    paymentScore: tenant?.paymentScore ?? ("" as PaymentScore | ""),
    notes: tenant?.notes ?? "",
  });

  function handleClose() { setOpen(false); onClose?.(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      name: form.name,
      type: form.type,
      ...(form.siret && { siret: form.siret }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      ...(form.guarantorName && { guarantorName: form.guarantorName }),
      ...(form.guarantorContact && { guarantorContact: form.guarantorContact }),
      ...(form.paymentScore && { paymentScore: form.paymentScore }),
      ...(form.notes && { notes: form.notes }),
    };
    try {
      const res = await fetch(isEdit ? `/api/tenants/${tenant!.id}` : "/api/tenants", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(isEdit ? "Locataire mis à jour" : `"${form.name}" créé`);
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally { setLoading(false); }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="tenant-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="t-name">Nom *</Label>
                <Input id="t-name" value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Martin Dupont, SARL Immo…" required autoFocus />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => set("type")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENANT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-siret">SIRET</Label>
                <Input id="t-siret" value={form.siret} onChange={(e) => set("siret")(e.target.value)} placeholder="12345678901234" maxLength={14} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-email">Email</Label>
                <Input id="t-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="locataire@email.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-phone">Téléphone</Label>
                <Input id="t-phone" type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+33 6 12 34 56 78" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-guarantor">Garant (nom)</Label>
                <Input id="t-guarantor" value={form.guarantorName} onChange={(e) => set("guarantorName")(e.target.value)} placeholder="Jean Dupont" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-guarantor-contact">Contact garant</Label>
                <Input id="t-guarantor-contact" value={form.guarantorContact} onChange={(e) => set("guarantorContact")(e.target.value)} placeholder="06 00 00 00 00" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Score de paiement</Label>
                <Select value={form.paymentScore || "none"} onValueChange={(v) => set("paymentScore")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {PAYMENT_SCORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="t-notes">Notes</Label>
                <Textarea id="t-notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} />
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
          <Button type="submit" form="tenant-form" disabled={loading || !form.name.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
