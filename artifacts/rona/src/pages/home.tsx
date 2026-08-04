import { DashboardStats } from "@/components/dashboard-stats";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full"
      dir="ltr"
      style={{
        background: "linear-gradient(135deg, hsl(220 50% 98%) 0%, hsl(215 60% 95%) 50%, hsl(185 50% 95%) 100%)",
      }}
    >
      <header className="relative z-10 px-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">💰 Rona's Piggy Bank</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your money wisely</p>
          </div>
          <TransactionForm />
        </div>
      </header>

      <main className="relative z-10 px-6 pb-16 space-y-8 max-w-3xl mx-auto">
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
