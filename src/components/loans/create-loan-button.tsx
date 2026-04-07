"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoanFormDialog } from "./loan-form-dialog";
import type { Asset, LegalEntity } from "@/types";

interface CreateLoanButtonProps {
  assets: Asset[];
  entities: LegalEntity[];
}

export function CreateLoanButton({ assets, entities }: CreateLoanButtonProps) {
  return (
    <LoanFormDialog
      assets={assets}
      entities={entities}
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Nouvel emprunt
        </Button>
      }
    />
  );
}
