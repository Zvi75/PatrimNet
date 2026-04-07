import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysUntil, formatDate } from "@/lib/utils";
import type { Lease, Asset, Tenant } from "@/types";

interface LeaseAlertsProps {
  leases: Lease[];
  assetMap: Map<string, string>;
  tenantMap: Map<string, string>;
}

export function LeaseAlerts({ leases, assetMap, tenantMap }: LeaseAlertsProps) {
  const alerts = leases
    .filter((l) => l.status === "Actif" && daysUntil(l.endDate) <= 180 && daysUntil(l.endDate) >= 0)
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            Alertes échéances ({alerts.length})
          </CardTitle>
          <Link href="/leases">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-orange-600 hover:text-orange-700"
            >
              Voir tous les baux →
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((lease) => {
            const days = daysUntil(lease.endDate);
            return (
              <div
                key={lease.id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 flex-shrink-0 text-orange-500" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">
                      {assetMap.get(lease.assetId) ?? "—"}
                    </span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-slate-500">{tenantMap.get(lease.tenantId) ?? "—"}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">{formatDate(lease.endDate)}</span>
                  <Badge
                    variant={days <= 60 ? "destructive" : days <= 90 ? "warning" : "secondary"}
                  >
                    J-{days}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
