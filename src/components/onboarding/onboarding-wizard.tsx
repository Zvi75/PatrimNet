"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Building2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useUser();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la création");
      }

      setDone(true);
      toast.success("Workspace créé avec succès !");

      // Reload Clerk user to pick up updated publicMetadata
      await user?.reload();

      // Small delay to allow token refresh propagation
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Workspace créé !</p>
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
        <CardTitle>Créer votre workspace</CardTitle>
        <CardDescription>
          Donnez un nom à votre espace de travail. Vous pourrez y inviter des collaborateurs
          ensuite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nom du workspace</Label>
            <Input
              id="workspace-name"
              placeholder="Ex : Famille Martin, SCI Horizon, Family Office..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-slate-400">
              Généralement le nom de votre holding, famille ou structure principale.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Création en cours…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Créer mon workspace
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
