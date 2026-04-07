"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantFormDialog } from "./tenant-form-dialog";

export function CreateTenantButton() {
  return (
    <TenantFormDialog
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouveau locataire
        </Button>
      }
    />
  );
}
