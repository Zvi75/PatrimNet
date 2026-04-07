"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
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
import { TransactionFormDialog } from "./transaction-form-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TRANSACTION_TYPES, TRANSACTION_DIRECTIONS } from "@/lib/constants";
import type { Transaction, Asset, LegalEntity, Lease, UserRole } from "@/types";

interface TransactionListViewProps {
  transactions: Transaction[];
  assets: Asset[];
  entities: LegalEntity[];
  leases: Lease[];
  role: UserRole;
}

export function TransactionListView({
  transactions,
  assets,
  entities,
  leases,
  role,
}: TransactionListViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterDir, setFilterDir] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterReconciled, setFilterReconciled] = useState("all");
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const assetMap = new Map(assets.map((a) => [a.id, a.name]));

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.label.toLowerCase().includes(q)) return false;
    if (filterDir !== "all" && t.direction !== filterDir) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterReconciled === "yes" && !t.reconciled) return false;
    if (filterReconciled === "no" && t.reconciled) return false;
    return true;
  });

  const totalIn = filtered
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  async function handleDelete(tx: Transaction) {
    const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Transaction supprimée");
      router.refresh();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erreur");
    }
  }

  async function toggleReconcile(tx: Transaction) {
    const res = await fetch(`/api/transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reconciled: !tx.reconciled }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      toast.error("Erreur lors de la réconciliation");
    }
  }

  const canEdit = role !== "read-only";

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune transaction"
        description="Commencez à enregistrer vos encaissements et décaissements."
        action={
          canEdit ? (
            <TransactionFormDialog
              assets={assets}
              entities={entities}
              leases={leases}
              trigger={<Button>Créer une transaction</Button>}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Encaissements</p>
          <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(totalIn)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Décaissements</p>
          <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(totalOut)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs text-slate-400">Net</p>
          <p className={`mt-1 text-lg font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
            {net >= 0 ? "+" : ""}
            {formatCurrency(net)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />
        <Select value={filterDir} onValueChange={setFilterDir}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sens</SelectItem>
            {TRANSACTION_DIRECTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterReconciled} onValueChange={setFilterReconciled}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Réconciliation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="yes">Réconciliés</SelectItem>
            <SelectItem value="no">En attente</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.map((tx, i) => (
          <div
            key={tx.id}
            className={`group flex items-center gap-4 px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            {/* Icon */}
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tx.direction === "Encaissement" ? "bg-green-100" : "bg-red-100"}`}
            >
              {tx.direction === "Encaissement" ? (
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{tx.label}</p>
              <p className="text-xs text-slate-400">
                {tx.type} · {formatDate(tx.date)}
                {tx.assetId && assetMap.has(tx.assetId) ? ` · ${assetMap.get(tx.assetId)}` : ""}
              </p>
            </div>

            {/* Amount */}
            <span
              className={`flex-shrink-0 text-sm font-semibold ${tx.direction === "Encaissement" ? "text-green-600" : "text-red-600"}`}
            >
              {tx.direction === "Encaissement" ? "+" : "-"}
              {formatCurrency(tx.amount)}
            </span>

            {/* Reconcile badge */}
            {canEdit ? (
              <button
                onClick={() => toggleReconcile(tx)}
                className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${tx.reconciled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
              >
                {tx.reconciled && <Check className="h-3 w-3" />}
                {tx.reconciled ? "Réconcilié" : "En attente"}
              </button>
            ) : (
              <Badge
                variant={tx.reconciled ? "success" : "warning"}
                className="flex-shrink-0 text-xs"
              >
                {tx.reconciled ? "Réconcilié" : "En attente"}
              </Badge>
            )}

            {/* Actions */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTx(tx)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
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
                        title="Supprimer cette transaction ?"
                        description="Cette action est irréversible."
                        confirmLabel="Supprimer"
                        destructive
                        onConfirm={() => handleDelete(tx)}
                      />
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {editTx && (
        <TransactionFormDialog
          assets={assets}
          entities={entities}
          leases={leases}
          transaction={editTx}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  );
}
