"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityNode } from "./entity-node";
import { EntityFormDialog } from "./entity-form-dialog";
import { Button } from "@/components/ui/button";
import type { LegalEntity, UserRole } from "@/types";

interface EntityTreeViewProps {
  tree: LegalEntity[];
  flat: LegalEntity[];
  role: UserRole;
}

export function EntityTreeView({ tree, flat, role }: EntityTreeViewProps) {
  const router = useRouter();
  const [editEntity, setEditEntity] = useState<LegalEntity | null>(null);

  async function handleDelete(entity: LegalEntity) {
    try {
      const res = await fetch(`/api/entities/${entity.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success(`"${entity.name}" supprimée`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Aucune entité juridique"
        description="Créez votre première entité pour commencer à structurer votre patrimoine (Holding, SCI, SAS…)"
        action={
          role !== "read-only" ? (
            <EntityFormDialog
              entities={flat}
              trigger={<Button>Créer une entité</Button>}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {tree.map((entity) => (
          <EntityNode
            key={entity.id}
            entity={entity}
            depth={0}
            role={role}
            allEntities={flat}
            onEdit={setEditEntity}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {editEntity && (
        <EntityFormDialog
          entities={flat}
          entity={editEntity}
          trigger={<span />}
          defaultOpen
          onClose={() => setEditEntity(null)}
        />
      )}
    </>
  );
}
