"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OccupancyChartProps {
  data: Array<{ status: string; count: number }>;
  occupancyRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  "Occupé": "#22c55e",
  "Vacant": "#ef4444",
  "En travaux": "#f59e0b",
  "En vente": "#3b82f6",
};

export function OccupancyChart({ data, occupancyRate }: OccupancyChartProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Répartition des actifs</CardTitle>
          <span className="text-2xl font-bold text-slate-900">
            {occupancyRate.toFixed(1)}%
            <span className="ml-1 text-xs font-normal text-slate-400">occupation</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
            Aucun actif dans le portefeuille
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number) => [`${v} actif${v !== 1 ? "s" : ""}`, ""]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="count" name="Actifs" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
