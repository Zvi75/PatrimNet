"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaseFormDialog } from "./lease-form-dialog";
import type { Asset, Tenant } from "@/types";

interface CreateLeaseButtonProps {
  assets: Asset[];
  tenants: Tenant[];
}

export function CreateLeaseButton({ assets, tenants }: CreateLeaseButtonProps) {
  return (
    <LeaseFormDialog
      assets={assets}
      tenants={tenants}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouveau bail
        </Button>
      }
    />
  );
}
