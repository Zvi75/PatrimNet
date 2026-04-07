import { SignUp } from "@clerk/nextjs";
import { Building2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold text-white">PatrimNet</span>
        </div>
        <p className="text-center text-sm text-slate-400">
          Essai gratuit 14 jours — sans carte bancaire
        </p>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white shadow-2xl rounded-2xl",
            },
          }}
        />
      </div>
    </div>
  );
}
