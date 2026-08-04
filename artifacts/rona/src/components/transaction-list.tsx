import {
  useListRonaTransactions,
  useDeleteRonaTransaction,
  getListRonaTransactionsQueryKey,
  getGetRonaBalanceQueryKey,
  getGetRonaSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Trash2, Coins, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function TransactionList() {
  const { data: transactions, isLoading } = useListRonaTransactions();
  const deleteTransaction = useDeleteRonaTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteTransaction.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Deleted",
          description: "Transaction deleted successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getListRonaTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRonaBalanceQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRonaSummaryQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not delete the transaction.",
          variant: "destructive",
        });
        setDeletingId(null);
      }
    });
  };

  const handleExport = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = ["Date", "Type", "Description", "Category", "Amount ($)", "Balance After ($)"];
    const rows = transactions.map((tx) => [
      format(new Date(tx.date), "M/d/yyyy"),
      tx.type === "income" ? "Income" : "Expense",
      tx.description,
      tx.category,
      Number(tx.amount),
      Number(tx.balanceAfter),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rona-piggy-bank-${format(new Date(), "MM-dd-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="bg-primary/10 p-6 rounded-full">
            <Coins className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">No transactions yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Rona's piggy bank is waiting! Add your first income to start saving.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Recent History</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {transactions.map((tx, index) => {
        const isIncome = tx.type === "income";
        const isDeleting = deletingId === tx.id;

        return (
          <div
            key={tx.id}
            className={cn(
              "relative overflow-hidden bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex items-center justify-between transition-all hover:shadow-md hover:border-border",
              isDeleting && "opacity-50 pointer-events-none scale-[0.98]"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full shrink-0 flex items-center justify-center",
                isIncome ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
              )}>
                {isIncome ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground leading-none">{tx.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium bg-muted px-2 py-0.5 rounded-md text-xs">{tx.category}</span>
                  <span>&bull;</span>
                  <span>{format(new Date(tx.date), "M/d/yyyy")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "text-lg font-bold",
                isIncome ? "text-emerald-600" : "text-foreground"
              )}>
                {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={isDeleting}
                    title="Delete transaction"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this transaction?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(tx.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
