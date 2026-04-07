import { requireWorkspace } from "@/lib/auth";
import { listTransactions } from "@/lib/notion/transactions";
import { listAssets } from "@/lib/notion/assets";
import { listLegalEntities } from "@/lib/notion/legal-entities";
import { listLeases } from "@/lib/notion/leases";
import { TransactionListView } from "@/components/transactions/transaction-list-view";
import { CreateTransactionButton } from "@/components/transactions/create-transaction-button";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const ctx = await requireWorkspace();
  const [transactions, assets, entities, leases] = await Promise.all([
    listTransactions(ctx.workspaceId),
    listAssets(ctx.workspaceId),
    listLegalEntities(ctx.workspaceId),
    listLeases(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal des transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} · Encaissements, décaissements et réconciliation
          </p>
        </div>
        {ctx.role !== "read-only" && (
          <CreateTransactionButton assets={assets} entities={entities} leases={leases} />
        )}
      </div>
      <TransactionListView
        transactions={transactions}
        assets={assets}
        entities={entities}
        leases={leases}
        role={ctx.role}
      />
    </div>
  );
}
