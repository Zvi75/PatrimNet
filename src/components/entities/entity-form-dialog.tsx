"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITY_TYPES, TAX_REGIMES } from "@/lib/constants";
import type { LegalEntity, EntityType } from "@/types";

interface EntityFormDialogProps {
  entities: LegalEntity[];
  entity?: LegalEntity | null;        // null/undefined = create mode
  parentEntityId?: string;            // pre-set parent when adding child
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function EntityFormDialog({
  entities,
  entity,
  parentEntityId,
  trigger,
  defaultOpen = false,
  onClose,
}: EntityFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(entity);

  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: entity?.name ?? "",
    type: (entity?.type ?? "SCI") as EntityType,
    siren: entity?.siren ?? "",
    parentEntityId: entity?.parentEntityId ?? parentEntityId ?? "",
    taxRegime: entity?.taxRegime ?? "",
    address: entity?.address ?? "",
    notes: entity?.notes ?? "",
  });

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      name: form.name,
      type: form.type,
      ...(form.siren && { siren: form.siren }),
      ...(form.parentEntityId && { parentEntityId: form.parentEntityId }),
      ...(form.taxRegime && { taxRegime: form.taxRegime }),
      ...(form.address && { address: form.address }),
      ...(form.notes && { notes: form.notes }),
    };

    try {
      const res = await fetch(isEdit ? `/api/entities/${entity!.id}` : "/api/entities", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      toast.success(isEdit ? `"${form.name}" modifiée` : `"${form.name}" créée`);
      handleClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  // Filter out self and own children from parent options (to avoid circular refs)
  const parentOptions = entities.filter(
    (e) => e.id !== entity?.id && e.parentEntityId !== entity?.id,
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'entité" : "Nouvelle entité juridique"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ent-name">Nom *</Label>
              <Input
                id="ent-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="SCI Horizon, Holding Famille Martin…"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EntityType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ent-siren">SIREN</Label>
              <Input
                id="ent-siren"
                value={form.siren}
                onChange={(e) => setForm({ ...form, siren: e.target.value })}
                placeholder="123456789"
                maxLength={9}
              />
            </div>

            <div className="space-y-2">
              <Label>Entité parente</Label>
              <Select
                value={form.parentEntityId || "none"}
                onValueChange={(v) => setForm({ ...form, parentEntityId: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Aucune (racine)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (racine)</SelectItem>
                  {parentOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Régime fiscal</Label>
              <Select
                value={form.taxRegime || "none"}
                onValueChange={(v) => setForm({ ...form, taxRegime: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {TAX_REGIMES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ent-address">Adresse du siège</Label>
              <Input
                id="ent-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="12 rue de la Paix, 75001 Paris"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ent-notes">Notes</Label>
              <Textarea
                id="ent-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Informations complémentaires…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !form.name.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
