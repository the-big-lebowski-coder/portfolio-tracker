import { DashboardStats } from "@/components/dashboard-stats";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col">
      <header className="w-full bg-card border-b border-border/40 py-6 px-4 md:px-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-5xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-rose-400">
                Piggy Bank
              </span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Watch your savings grow</p>
          </div>
          <div className="hidden sm:block">
            <TransactionForm />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-10 relative">
        <div className="absolute top-40 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-x-1/2 pointer-events-none"></div>
        
        <div className="sm:hidden flex justify-center w-full mb-4">
          <TransactionForm />
        </div>

        <section className="relative z-10">
          <DashboardStats />
        </section>

        <section className="relative z-10 max-w-3xl">
          <TransactionList />
        </section>
      </main>
    </div>
  );
}
