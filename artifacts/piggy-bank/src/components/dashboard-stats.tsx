import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetBalance, useGetSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

export function DashboardStats() {
  const { data: balance, isLoading: balanceLoading } = useGetBalance();
  const { data: summary, isLoading: summaryLoading } = useGetSummary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 w-full">
      <Card className="col-span-1 md:col-span-3 bg-gradient-to-br from-primary to-rose-400 text-primary-foreground border-none shadow-lg transform transition-all hover:scale-[1.01] duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-primary-foreground/80 font-medium text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            יתרה נוכחית
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceLoading || !balance ? (
            <Skeleton className="h-14 w-48 bg-primary-foreground/20 rounded-full" />
          ) : (
            <div className="text-6xl font-bold tracking-tight">
              {formatCurrency(balance.balance)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            סה״כ הכנסות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading || !summary ? (
            <Skeleton className="h-8 w-32 rounded-full" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalIncome)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            סה״כ הוצאות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading || !summary ? (
            <Skeleton className="h-8 w-32 rounded-full" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalExpenses)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-secondary" />
            סה״כ פעולות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading || !summary ? (
            <Skeleton className="h-8 w-32 rounded-full" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {summary.transactionCount}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
