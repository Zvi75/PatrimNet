import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Full implementation in STEP 4
export async function AssetDetail({ id }: { id: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche actif #{id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">Implémentation complète en STEP 4.</p>
      </CardContent>
    </Card>
  );
}
