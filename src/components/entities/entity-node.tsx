"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityFormDialog } from "./entity-form-dialog";
import { cn } from "@/lib/utils";
import type { LegalEntity, UserRole } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  Holding: "bg-amber-100 text-amber-700",
  SCI: "bg-blue-100 text-blue-700",
  SAS: "bg-purple-100 text-purple-700",
  SARL: "bg-orange-100 text-orange-700",
  SNC: "bg-green-100 text-green-700",
  SELAS: "bg-pink-100 text-pink-700",
  SPFPL: "bg-red-100 text-red-700",
  Other: "bg-slate-100 text-slate-600",
};

interface EntityNodeProps {
  entity: LegalEntity;
  depth: number;
  role: UserRole;
  allEntities: LegalEntity[];
  onEdit: (entity: LegalEntity) => void;
  onDelete: (entity: LegalEntity) => void;
}

export function EntityNode({
  entity,
  depth,
  role,
  allEntities,
  onEdit,
  onDelete,
}: EntityNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = entity.children && entity.children.length > 0;
  const canEdit = role !== "read-only";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50",
          depth > 0 && "ml-6 border-l-2 border-l-blue-200",
        )}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-400 transition-colors",
            hasChildren ? "hover:text-slate-600" : "cursor-default opacity-0",
          )}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Icon */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Building2 className="h-4 w-4 text-slate-500" />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-800">{entity.name}</span>
            {entity.siren && <span className="text-xs text-slate-400">SIREN {entity.siren}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {entity.taxRegime && <span className="text-xs text-slate-400">{entity.taxRegime}</span>}
            {entity.address && (
              <span className="truncate text-xs text-slate-400">{entity.address}</span>
            )}
          </div>
        </div>

        {/* Type badge */}
        <span
          className={cn(
            "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            TYPE_COLORS[entity.type] ?? TYPE_COLORS.Other,
          )}
        >
          {entity.type}
        </span>

        {/* Children count */}
        {hasChildren && (
          <span className="flex-shrink-0 text-xs text-slate-400">
            {entity.children!.length} filiale{entity.children!.length !== 1 ? "s" : ""}
          </span>
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
              <DropdownMenuItem onClick={() => onEdit(entity)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <EntityFormDialog
                entities={allEntities}
                parentEntityId={entity.id}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une filiale
                  </DropdownMenuItem>
                }
              />
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
                    title={`Supprimer "${entity.name}" ?`}
                    description="Cette entité sera archivée. Les actifs liés ne seront pas supprimés."
                    confirmLabel="Supprimer"
                    destructive
                    onConfirm={() => onDelete(entity)}
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3">
          {entity.children!.map((child) => (
            <EntityNode
              key={child.id}
              entity={child}
              depth={depth + 1}
              role={role}
              allEntities={allEntities}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
