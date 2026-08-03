import { Router, type Request, type Response } from "express";
import { db, uriTransactionsTable, uriSettingsTable } from "@workspace/db";
import { eq, desc, sum, count } from "drizzle-orm";
import { z } from "zod/v4";
import { CreateUriTransactionBody } from "@workspace/api-zod";

const router = Router();

const INITIAL_BALANCE_KEY = "initial_balance";
const DEFAULT_INITIAL_BALANCE = 0;

async function getInitialBalance(): Promise<number> {
  const row = await db.query.uriSettingsTable.findFirst({
    where: eq(uriSettingsTable.key, INITIAL_BALANCE_KEY),
  });
  return row ? parseFloat(row.value) : DEFAULT_INITIAL_BALANCE;
}

async function getCurrentBalance(): Promise<number> {
  const initial = await getInitialBalance();
  const rows = await db
    .select({
      type: uriTransactionsTable.type,
      total: sum(uriTransactionsTable.amount),
    })
    .from(uriTransactionsTable)
    .groupBy(uriTransactionsTable.type);

  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.type === "income") income = parseFloat(row.total ?? "0");
    if (row.type === "expense") expenses = parseFloat(row.total ?? "0");
  }
  return initial + income - expenses;
}

router.get("/uri/balance", async (req: Request, res: Response) => {
  const balance = await getCurrentBalance();
  const initialBalance = await getInitialBalance();
  res.json({ balance, initialBalance });
});

router.get("/uri/summary", async (req: Request, res: Response) => {
  const rows = await db
    .select({
      type: uriTransactionsTable.type,
      total: sum(uriTransactionsTable.amount),
      cnt: count(uriTransactionsTable.id),
    })
    .from(uriTransactionsTable)
    .groupBy(uriTransactionsTable.type);

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const row of rows) {
    if (row.type === "income") {
      totalIncome = parseFloat(row.total ?? "0");
      incomeCount = Number(row.cnt);
    }
    if (row.type === "expense") {
      totalExpenses = parseFloat(row.total ?? "0");
      expenseCount = Number(row.cnt);
    }
  }

  res.json({
    totalIncome,
    totalExpenses,
    transactionCount: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
  });
});

router.get("/uri/transactions", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(uriTransactionsTable)
    .orderBy(desc(uriTransactionsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: parseFloat(r.amount),
      description: r.description,
      category: r.category,
      date: r.date,
      balanceAfter: parseFloat(r.balanceAfter),
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/uri/transactions", async (req: Request, res: Response) => {
  const parsed = CreateUriTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { type, amount, description, category, date } = parsed.data;
  const currentBalance = await getCurrentBalance();
  const delta = type === "income" ? amount : -amount;
  const balanceAfter = currentBalance + delta;

  const [row] = await db
    .insert(uriTransactionsTable)
    .values({
      type,
      amount: amount.toString(),
      description,
      category,
      date,
      balanceAfter: balanceAfter.toString(),
    })
    .returning();

  res.status(201).json({
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description,
    category: row.category,
    date: row.date,
    balanceAfter: parseFloat(row.balanceAfter),
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/uri/transactions/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .delete(uriTransactionsTable)
    .where(eq(uriTransactionsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description,
    category: row.category,
    date: row.date,
    balanceAfter: parseFloat(row.balanceAfter),
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
