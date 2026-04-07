import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Building2 } from "lucide-react";

export const metadata = { title: "Créer votre workspace" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">PatrimNet</span>
          </div>
          <p className="text-slate-400">Configurez votre espace de travail</p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
