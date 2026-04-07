"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { LeaseFormDialog } from "./lease-form-dialog";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { LEASE_TYPES, LEASE_STATUSES } from "@/lib/constants";
import type { Lease, Asset, Tenant, UserRole } from "@/types";

const STATUS_VARIANTS: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  "Actif": "success",
  "Résilié": "destructive",
  "En cours de renouvellement": "warning",
  "Expiré": "secondary",
};

interface LeaseListViewProps {
  leases: Lease[];
  assets: Asset[];
  tenants: Tenant[];
  role: UserRole;
}

export function LeaseListView({ leases, assets, tenants, role }: LeaseListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [editLease, setEditLease] = useState<Lease | null>(null);

  const assetMap = new Map(assets.map((a) => [a.id, a.name]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const filtered = leases.filter((l) => {
    const q = search.toLowerCase();
    const assetName = assetMap.get(l.assetId) ?? "";
    const tenantName = tenantMap.get(l.tenantId) ?? "";
    if (q && !l.reference.toLowerCase().includes(q) && !assetName.toLowerCase().includes(q) && !tenantName.toLowerCase().includes(q)) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterType !== "all" && l.type !== filterType) return false;
    return true;
  });

  // Expiry alerts
  const expiringCount = leases.filter((l) => {
    if (l.status !== "Actif") return false;
    const d = daysUntil(l.endDate);
    return d >= 0 && d <= 90;
  }).length;

  async function handleDelete(lease: Lease) {
    const res = await fetch(`/api/leases/${lease.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Bail "${lease.reference}" supprimé`);
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erreur");
    }
  }

  const canEdit = role !== "read-only";

  if (leases.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun bail enregistré"
        description="Créez votre premier bail pour commencer le suivi des relations locatives."
        action={canEdit ? (
          <LeaseFormDialog
            assets={assets}
            tenants={tenants}
            trigger={<Button>Créer un bail</Button>}
          />
        ) : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Expiry alert banner */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-500" />
          <p className="text-sm text-orange-700">
            <strong>{expiringCount} bail{expiringCount !== 1 ? "x" : ""}</strong> expire{expiringCount !== 1 ? "nt" : ""} dans moins de 90 jours.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {LEASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {LEASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.map((lease, i) => {
          const days = daysUntil(lease.endDate);
          const isExpiringSoon = lease.status === "Actif" && days >= 0 && days <= 90;
          const assetName = assetMap.get(lease.assetId) ?? "—";
          const tenantName = tenantMap.get(lease.tenantId) ?? "—";

          return (
            <div
              key={lease.id}
              className={`group flex items-center gap-4 px-5 py-4 ${i < filtered.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              {/* Left info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{lease.reference}</p>
                  <Badge variant={STATUS_VARIANTS[lease.status] ?? "secondary"} className="text-xs">
                    {lease.status}
                  </Badge>
                  {isExpiringSoon && (
                    <Badge variant="warning" className="text-xs">J-{days}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {assetName} · {tenantName} · {lease.type}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
                  {lease.nextRevisionDate && ` · Révision : ${formatDate(lease.nextRevisionDate)}`}
                </p>
              </div>

              {/* Rent */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(lease.baseRent)}/mois</p>
                {lease.charges ? (
                  <p className="text-xs text-slate-400">+ {formatCurrency(lease.charges)} charges</p>
                ) : null}
                {lease.tvaApplicable && (
                  <p className="text-xs text-blue-500">TVA applicable</p>
                )}
              </div>

              {/* Actions */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditLease(lease)}>
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
                          title={`Supprimer le bail "${lease.reference}" ?`}
                          description="Ce bail sera archivé. Les transactions associées resteront accessibles."
                          confirmLabel="Supprimer"
                          destructive
                          onConfirm={() => handleDelete(lease)}
                        />
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {editLease && (
        <LeaseFormDialog
          assets={assets}
          tenants={tenants}
          lease={editLease}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditLease(null)}
        />
      )}
    </div>
  );
}
