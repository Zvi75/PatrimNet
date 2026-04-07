"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetFormDialog } from "./asset-form-dialog";
import type { LegalEntity } from "@/types";

export function CreateAssetButton({ entities }: { entities: LegalEntity[] }) {
  return (
    <AssetFormDialog
      entities={entities}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouvel actif
        </Button>
      }
    />
  );
}
