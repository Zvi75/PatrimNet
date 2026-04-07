"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { LEASE_TYPES, LEASE_STATUSES, INDEXATION_INDEXES } from "@/lib/constants";
import type { Lease, Asset, Tenant, LeaseType, LeaseStatus, IndexationIndex } from "@/types";

interface LeaseFormDialogProps {
  assets: Asset[];
  tenants: Tenant[];
  lease?: Lease | null;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function LeaseFormDialog({
  assets,
  tenants,
  lease,
  trigger,
  defaultOpen = false,
  onClose,
}: LeaseFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(lease);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    reference: lease?.reference ?? "",
    assetId: lease?.assetId ?? assets[0]?.id ?? "",
    tenantId: lease?.tenantId ?? tenants[0]?.id ?? "",
    type: (lease?.type ?? "Bail commercial") as LeaseType,
    startDate: lease?.startDate ?? "",
    endDate: lease?.endDate ?? "",
    baseRent: lease?.baseRent?.toString() ?? "",
    charges: lease?.charges?.toString() ?? "",
    tvaApplicable: lease?.tvaApplicable ?? false,
    indexationIndex: (lease?.indexationIndex ?? "") as IndexationIndex | "",
    nextRevisionDate: lease?.nextRevisionDate ?? "",
    status: (lease?.status ?? "Actif") as LeaseStatus,
  });

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      reference: form.reference,
      assetId: form.assetId,
      tenantId: form.tenantId,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      baseRent: parseFloat(form.baseRent) || 0,
      status: form.status,
      tvaApplicable: form.tvaApplicable,
      ...(form.charges && { charges: parseFloat(form.charges) }),
      ...(form.indexationIndex && { indexationIndex: form.indexationIndex }),
      ...(form.nextRevisionDate && { nextRevisionDate: form.nextRevisionDate }),
    };
    try {
      const res = await fetch(isEdit ? `/api/leases/${lease!.id}` : "/api/leases", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(isEdit ? "Bail mis à jour" : `Bail "${form.reference}" créé`);
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.reference &&
    form.assetId &&
    form.tenantId &&
    form.startDate &&
    form.endDate &&
    form.baseRent;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le bail" : "Nouveau bail"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form id="lease-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="l-ref">Référence *</Label>
                <Input
                  id="l-ref"
                  value={form.reference}
                  onChange={(e) => set("reference")(e.target.value)}
                  placeholder="BAIL-2024-001"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Actif *</Label>
                <Select value={form.assetId} onValueChange={(v) => set("assetId")(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un actif" />
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

              <div className="space-y-2">
                <Label>Locataire *</Label>
                <Select value={form.tenantId} onValueChange={(v) => set("tenantId")(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un locataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type de bail *</Label>
                <Select value={form.type} onValueChange={(v) => set("type")(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEASE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => set("status")(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEASE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="l-start">Date de début *</Label>
                <Input
                  id="l-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate")(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="l-end">Date de fin *</Label>
                <Input
                  id="l-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate")(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="l-rent">Loyer de base (€/mois) *</Label>
                <Input
                  id="l-rent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseRent}
                  onChange={(e) => set("baseRent")(e.target.value)}
                  placeholder="1500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="l-charges">Charges (€/mois)</Label>
                <Input
                  id="l-charges"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.charges}
                  onChange={(e) => set("charges")(e.target.value)}
                  placeholder="150"
                />
              </div>

              <div className="space-y-2">
                <Label>Indexation</Label>
                <Select
                  value={form.indexationIndex || "none"}
                  onValueChange={(v) => set("indexationIndex")(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {INDEXATION_INDEXES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="l-revision">Prochaine révision</Label>
                <Input
                  id="l-revision"
                  type="date"
                  value={form.nextRevisionDate}
                  onChange={(e) => set("nextRevisionDate")(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="l-tva"
                  checked={form.tvaApplicable}
                  onCheckedChange={(v) => set("tvaApplicable")(Boolean(v))}
                />
                <Label htmlFor="l-tva" className="cursor-pointer">
                  TVA applicable
                </Label>
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" form="lease-form" disabled={loading || !canSubmit}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Enregistrer"
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
