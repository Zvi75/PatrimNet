"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityFormDialog } from "./entity-form-dialog";
import type { LegalEntity } from "@/types";

export function CreateEntityButton({ entities }: { entities: LegalEntity[] }) {
  return (
    <EntityFormDialog
      entities={entities}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouvelle entité
        </Button>
      }
    />
  );
}
