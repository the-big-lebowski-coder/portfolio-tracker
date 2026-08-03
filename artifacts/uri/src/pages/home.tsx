import { DashboardStats } from "@/components/dashboard-stats";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, hsl(150 40% 98%) 0%, hsl(145 50% 95%) 50%, hsl(160 45% 95%) 100%)",
      }}
    >
      <header className="relative z-10 px-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">💰 קופת החיסכון של אורי</h1>
            <p className="text-muted-foreground mt-1 text-sm">נהל את הכסף שלך בצורה חכמה</p>
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
