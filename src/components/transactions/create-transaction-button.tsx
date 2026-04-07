"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog } from "./transaction-form-dialog";
import type { Asset, LegalEntity, Lease } from "@/types";

interface CreateTransactionButtonProps {
  assets: Asset[];
  entities: LegalEntity[];
  leases: Lease[];
}

export function CreateTransactionButton({
  assets,
  entities,
  leases,
}: CreateTransactionButtonProps) {
  return (
    <TransactionFormDialog
      assets={assets}
      entities={entities}
      leases={leases}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouvelle transaction
        </Button>
      }
    />
  );
}
