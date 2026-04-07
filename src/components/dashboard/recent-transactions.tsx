import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dernières transactions</CardTitle>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="text-xs text-slate-500">
              Voir tout →
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aucune transaction enregistrée
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${tx.direction === "Encaissement" ? "bg-green-100" : "bg-red-100"}`}>
                    {tx.direction === "Encaissement" ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{tx.label}</p>
                    <p className="text-xs text-slate-400">{tx.type} · {formatDate(tx.date)}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <span className={`text-sm font-semibold ${tx.direction === "Encaissement" ? "text-green-600" : "text-red-600"}`}>
                    {tx.direction === "Encaissement" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                  <Badge variant={tx.reconciled ? "success" : "warning"} className="text-xs">
                    {tx.reconciled ? "Réconcilié" : "En attente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
