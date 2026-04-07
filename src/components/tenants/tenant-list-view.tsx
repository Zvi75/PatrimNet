"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Mail, Phone, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TenantFormDialog } from "./tenant-form-dialog";
import { TENANT_TYPES, PAYMENT_SCORES } from "@/lib/constants";
import type { Tenant, UserRole } from "@/types";

const SCORE_VARIANTS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  Excellent: "success",
  Bon: "success",
  Moyen: "warning",
  Mauvais: "destructive",
};

interface TenantListViewProps {
  tenants: Tenant[];
  role: UserRole;
}

export function TenantListView({ tenants, role }: TenantListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !t.email?.toLowerCase().includes(q)) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterScore !== "all" && t.paymentScore !== filterScore) return false;
    return true;
  });

  async function handleDelete(tenant: Tenant) {
    const res = await fetch(`/api/tenants/${tenant.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`"${tenant.name}" supprimé`);
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erreur");
    }
  }

  const canEdit = role !== "read-only";

  if (tenants.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun locataire"
        description="Ajoutez vos locataires pour les associer à vos baux."
        action={canEdit ? <TenantFormDialog trigger={<Button>Ajouter un locataire</Button>} /> : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TENANT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterScore} onValueChange={setFilterScore}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les scores</SelectItem>
            {PAYMENT_SCORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.map((tenant, i) => (
          <div
            key={tenant.id}
            className={`group flex items-center gap-4 px-5 py-4 ${i < filtered.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
              {tenant.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">{tenant.name}</p>
                <Badge variant="secondary" className="text-xs">{tenant.type}</Badge>
                {tenant.paymentScore && (
                  <Badge variant={SCORE_VARIANTS[tenant.paymentScore] ?? "secondary"} className="text-xs">
                    {tenant.paymentScore}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                {tenant.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />{tenant.email}
                  </span>
                )}
                {tenant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />{tenant.phone}
                  </span>
                )}
                {tenant.siret && <span>SIRET {tenant.siret}</span>}
              </div>
            </div>

            {/* Guarantor */}
            {tenant.guarantorName && (
              <div className="hidden text-right text-xs text-slate-400 sm:block">
                <p className="font-medium text-slate-600">Garant</p>
                <p>{tenant.guarantorName}</p>
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTenant(tenant)}>
                    <Pencil className="mr-2 h-4 w-4" />Modifier
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <ConfirmDialog
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                          </DropdownMenuItem>
                        }
                        title={`Supprimer "${tenant.name}" ?`}
                        description="Ce locataire sera archivé. Les baux associés resteront accessibles."
                        confirmLabel="Supprimer"
                        destructive
                        onConfirm={() => handleDelete(tenant)}
                      />
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {editTenant && (
        <TenantFormDialog
          tenant={editTenant}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditTenant(null)}
        />
      )}
    </div>
  );
}
