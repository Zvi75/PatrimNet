"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function BillingToast({ type }: { type: "success" | "canceled" }) {
  useEffect(() => {
    if (type === "success") {
      toast.success("Abonnement activé", {
        description: "Votre plan a été mis à jour avec succès.",
      });
    } else {
      toast.info("Paiement annulé", {
        description: "Vous pouvez réessayer à tout moment.",
      });
    }
  }, [type]);

  return null;
}
