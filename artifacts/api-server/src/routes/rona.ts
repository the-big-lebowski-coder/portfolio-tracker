import { Router, type Request, type Response } from "express";
import { db, ronaTransactionsTable, ronaSettingsTable } from "@workspace/db";
import { eq, desc, sum, count } from "drizzle-orm";
import { z } from "zod/v4";
import { CreateRonaTransactionBody } from "@workspace/api-zod";

const router = Router();

const INITIAL_BALANCE_KEY = "initial_balance";
const DEFAULT_INITIAL_BALANCE = 0;

async function getInitialBalance(): Promise<number> {
  const row = await db.query.ronaSettingsTable.findFirst({
    where: eq(ronaSettingsTable.key, INITIAL_BALANCE_KEY),
  });
  return row ? parseFloat(row.value) : DEFAULT_INITIAL_BALANCE;
}

async function getCurrentBalance(): Promise<number> {
  const initial = await getInitialBalance();
  const rows = await db
    .select({
      type: ronaTransactionsTable.type,
      total: sum(ronaTransactionsTable.amount),
    })
    .from(ronaTransactionsTable)
    .groupBy(ronaTransactionsTable.type);

  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.type === "income") income = parseFloat(row.total ?? "0");
    if (row.type === "expense") expenses = parseFloat(row.total ?? "0");
  }
  return initial + income - expenses;
}

router.get("/rona/balance", async (req: Request, res: Response) => {
  const balance = await getCurrentBalance();
  const initialBalance = await getInitialBalance();
  res.json({ balance, initialBalance });
});

router.get("/rona/summary", async (req: Request, res: Response) => {
  const rows = await db
    .select({
      type: ronaTransactionsTable.type,
      total: sum(ronaTransactionsTable.amount),
      cnt: count(ronaTransactionsTable.id),
    })
    .from(ronaTransactionsTable)
    .groupBy(ronaTransactionsTable.type);

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

router.get("/rona/transactions", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(ronaTransactionsTable)
    .orderBy(desc(ronaTransactionsTable.createdAt));

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

router.post("/rona/transactions", async (req: Request, res: Response) => {
  const parsed = CreateRonaTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { type, amount, description, category, date } = parsed.data;
  const currentBalance = await getCurrentBalance();
  const delta = type === "income" ? amount : -amount;
  const balanceAfter = currentBalance + delta;

  const [row] = await db
    .insert(ronaTransactionsTable)
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

router.delete("/rona/transactions/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .delete(ronaTransactionsTable)
    .where(eq(ronaTransactionsTable.id, id))
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
