import { useListTransactions, useDeleteTransaction, getListTransactionsQueryKey, getGetBalanceQueryKey, getGetSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Trash2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function TransactionList() {
  const { data: transactions, isLoading } = useListTransactions();
  const deleteTransaction = useDeleteTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteTransaction.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "נמחק",
          description: "העסקה נמחקה בהצלחה.",
        });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את העסקה.",
          variant: "destructive",
        });
        setDeletingId(null);
      }
    });
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
            <h3 className="text-xl font-bold text-foreground">אין עסקאות עדיין</h3>
            <p className="text-muted-foreground max-w-sm">
              קופת החיסכון שלך מחכה! הוסף את הכנסה או מתנה ראשונה כדי להתחיל לחסוך.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground mb-6">היסטוריה אחרונה</h2>
      {transactions.map((tx, index) => {
        const isIncome = tx.type === "income";
        const isDeleting = deletingId === tx.id;

        return (
          <div
            key={tx.id}
            className={cn(
              "group relative overflow-hidden bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex items-center justify-between transition-all hover:shadow-md hover:border-border",
              isDeleting && "opacity-50 pointer-events-none scale-[0.98]"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
            data-testid={`card-transaction-${tx.id}`}
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
                  <span>{format(new Date(tx.date), "d/M/yyyy")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={cn(
                "text-lg font-bold",
                isIncome ? "text-emerald-600" : "text-foreground"
              )}>
                {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => handleDelete(tx.id)}
                disabled={isDeleting}
                title="מחק עסקה"
                data-testid={`button-delete-tx-${tx.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
