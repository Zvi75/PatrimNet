"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface CashFlowChartProps {
  data: Array<{ month: string; encaissements: number; decaissements: number }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const hasData = data.some((d) => d.encaissements > 0 || d.decaissements > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow mensuel</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
            Aucune transaction sur les 6 derniers mois
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="enc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="encaissements" stroke="#22c55e" strokeWidth={2} fill="url(#enc)" name="Encaissements" />
              <Area type="monotone" dataKey="decaissements" stroke="#ef4444" strokeWidth={2} fill="url(#dec)" name="Décaissements" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
