"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, MapPin, MoreHorizontal, Pencil, Trash2, Upload, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AssetFormDialog } from "./asset-form-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ASSET_TYPES, ASSET_STATUSES } from "@/lib/constants";
import type { Asset, LegalEntity, UserRole } from "@/types";

const STATUS_VARIANTS: Record<string, string> = {
  Occupé: "success",
  Vacant: "destructive",
  "En travaux": "warning",
  "En vente": "info",
};

const DPE_COLORS: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-green-400 text-white",
  C: "bg-yellow-400 text-white",
  D: "bg-orange-400 text-white",
  E: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
  G: "bg-red-700 text-white",
};

interface AssetListViewProps {
  assets: Asset[];
  entities: LegalEntity[];
  role: UserRole;
}

export function AssetListView({ assets, entities, role }: AssetListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const entityMap = new Map(entities.map((e) => [e.id, e.name]));

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !a.address.toLowerCase().includes(q))
      return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterEntity !== "all" && a.legalEntityId !== filterEntity) return false;
    return true;
  });

  async function handleDelete(asset: Asset) {
    const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`"${asset.name}" supprimé`);
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erreur");
    }
  }

  const canEdit = role !== "read-only";

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="Aucun actif immobilier"
        description="Ajoutez votre premier actif pour commencer le suivi de votre portefeuille."
        action={
          canEdit ? (
            <div className="flex gap-2">
              <AssetFormDialog entities={entities} trigger={<Button>Ajouter un actif</Button>} />
              <CsvImportDialog
                entities={entities}
                trigger={
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                }
              />
            </div>
          ) : undefined
        }
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
        {canEdit && (
          <CsvImportDialog
            entities={entities}
            trigger={
              <Button variant="outline" size="sm">
                <Upload className="mr-1.5 h-4 w-4" />
                Import CSV
              </Button>
            }
          />
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/assets/${asset.id}`}
                  className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-blue-600"
                >
                  {asset.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{asset.address}</span>
                </div>
              </div>
              {asset.dpe && (
                <span
                  className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${DPE_COLORS[asset.dpe] ?? ""}`}
                >
                  {asset.dpe}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {asset.type}
              </Badge>
              <Badge
                // @ts-expect-error variant is dynamic
                variant={STATUS_VARIANTS[asset.status] ?? "secondary"}
                className="text-xs"
              >
                {asset.status}
              </Badge>
              {asset.surfaceM2 && (
                <Badge variant="outline" className="text-xs">
                  {asset.surfaceM2} m²
                </Badge>
              )}
            </div>

            {/* Entity */}
            <div className="mb-3 text-xs text-slate-400">
              {entityMap.get(asset.legalEntityId) ?? "—"}
            </div>

            {/* Financials */}
            {asset.currentMarketValue && (
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">Valeur estimée</span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(asset.currentMarketValue)}
                </span>
              </div>
            )}
            {asset.ownershipPercent && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <TrendingUp className="h-3 w-3" />
                  Détention
                </span>
                <span className="font-medium">{formatPercent(asset.ownershipPercent)}</span>
              </div>
            )}

            {/* Actions overlay */}
            {canEdit && (
              <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-white shadow-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditAsset(asset)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <Link href={`/assets/${asset.id}`}>
                      <DropdownMenuItem>
                        <Home className="mr-2 h-4 w-4" />
                        Voir la fiche
                      </DropdownMenuItem>
                    </Link>
                    {role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          }
                          title={`Supprimer "${asset.name}" ?`}
                          description="L'actif sera archivé. Les baux et transactions associés restent accessibles."
                          confirmLabel="Supprimer"
                          destructive
                          onConfirm={() => handleDelete(asset)}
                        />
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      {editAsset && (
        <AssetFormDialog
          entities={entities}
          asset={editAsset}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditAsset(null)}
        />
      )}
    </div>
  );
}
