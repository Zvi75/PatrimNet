"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Building2, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InvitationInfo {
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
}

const ROLE_LABELS: Record<string, string> = {
  "read-only": "Lecture seule",
  analyst: "Analyste",
  admin: "Administrateur",
};

export function JoinWorkspace({ token }: { token?: string }) {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide — aucun token fourni.");
      setLoading(false);
      return;
    }

    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
      })
      .catch(() => setError("Impossible de vérifier l'invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-accept if signed in and invitation is valid
  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'acceptation");

      setDone(true);
      toast.success(`Bienvenue dans ${invitation?.workspaceName} !`);
      await user?.reload();

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || !isLoaded) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Vérification de l'invitation…</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-base font-semibold text-slate-800">Invitation invalide</p>
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Vous avez rejoint le workspace !</p>
          <p className="text-sm text-slate-500">Redirection vers votre tableau de bord…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle>Rejoindre {invitation?.workspaceName}</CardTitle>
        <CardDescription>
          Vous avez été invité(e) à rejoindre ce workspace PatrimNet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{invitation?.workspaceName}</p>
              <p className="text-xs text-slate-400">{invitation?.email}</p>
            </div>
            <Badge variant="info">{ROLE_LABELS[invitation?.role ?? "read-only"]}</Badge>
          </div>
        </div>

        {!isSignedIn ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Connectez-vous ou créez un compte pour accepter l'invitation.
            </p>
            <SignUpButton mode="redirect" forceRedirectUrl={`/join?token=${token}`}>
              <Button className="w-full">Créer un compte</Button>
            </SignUpButton>
            <SignInButton mode="redirect" forceRedirectUrl={`/join?token=${token}`}>
              <Button variant="outline" className="w-full">
                J'ai déjà un compte
              </Button>
            </SignInButton>
          </div>
        ) : (
          <Button onClick={handleAccept} disabled={accepting} className="w-full">
            {accepting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Acceptation en cours…
              </span>
            ) : (
              "Accepter l'invitation"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
