"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, AlertCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NotionSetupProps {
  isConfigured: boolean;
}

interface SetupResult {
  databases: Record<string, string>;
  envBlock: string;
}

const STEPS = [
  {
    n: 1,
    title: "Créer une page Notion",
    description: 'Dans Notion, créez une nouvelle page appelée "PatrimNet Databases" ou similaire.',
  },
  {
    n: 2,
    title: "Connecter l'intégration",
    description:
      'Ouvrez la page → "•••" → "Connexions" → Ajoutez votre intégration PatrimNet (créée sur notion.so/my-integrations).',
  },
  {
    n: 3,
    title: "Copier l'ID de la page",
    description:
      "L'ID est dans l'URL de la page : notion.so/[workspace]/[PAGE_ID]?... Copiez la partie en surbrillance.",
  },
];

export function NotionSetup({ isConfigured }: NotionSetupProps) {
  const [pageId, setPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function runSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/setup/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPageId: pageId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la configuration");

      setResult(data);
      toast.success("10 bases de données Notion créées avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  async function copyEnvBlock() {
    if (!result) return;
    await navigator.clipboard.writeText(result.envBlock);
    setCopied(true);
    toast.success("Copié dans le presse-papiers !");
    setTimeout(() => setCopied(false), 2000);
  }

  if (isConfigured) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-4 py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Notion déjà configuré</p>
            <p className="text-sm text-green-600">
              Les 10 bases de données sont connectées et opérationnelles.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5 text-blue-400" />
            Configuration Notion — Étapes préalables
          </CardTitle>
          <CardDescription className="text-slate-400">
            Avant de lancer la création automatique, complétez ces 3 étapes dans Notion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {step.n}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                <p className="text-sm text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Créer une intégration Notion
          </a>
        </CardContent>
      </Card>

      {/* Setup form */}
      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Lancer la création des bases de données</CardTitle>
            <CardDescription className="text-slate-400">
              Entrez l'ID de la page Notion parente. PatrimNet créera les 10 bases de données avec
              toutes les propriétés et relations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={runSetup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">ID de la page Notion parente</Label>
                <Input
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  required
                  minLength={32}
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Format : 32 caractères hexadécimaux (avec ou sans tirets)
                </p>
              </div>
              <Button type="submit" disabled={loading || !pageId.trim()} className="w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours… (~30 secondes)
                  </span>
                ) : (
                  "Créer les 10 bases de données"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Result — show env vars to copy */
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Check className="h-5 w-5" />
              10 bases de données créées avec succès !
            </CardTitle>
            <CardDescription className="text-slate-400">
              Copiez les variables d'environnement ci-dessous dans votre fichier{" "}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">.env.local</code>, puis
              redémarrez le serveur de développement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
              <pre className="text-xs text-green-400">{result.envBlock}</pre>
            </div>
            <Button onClick={copyEnvBlock} variant="outline" className="w-full gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier dans le presse-papiers
                </>
              )}
            </Button>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300">
                  <strong>Important :</strong> Ajoutez ces 10 lignes à votre{" "}
                  <code>.env.local</code>, puis relancez{" "}
                  <code className="rounded bg-slate-800 px-1">npm run dev</code>. Sur Vercel,
                  ajoutez-les dans Settings → Environment Variables.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Bases créées :</p>
              {Object.entries(result.databases).map(([key, id]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{key}</span>
                  <span className="font-mono text-slate-500">{id.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
