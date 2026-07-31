# 🐷 Piggy Bank – Setup Guide for a New Instance

This guide walks you through deploying your own copy of the Piggy Bank app — a Hebrew savings tracker for kids. You'll get it running online for **free** in about 20 minutes.

---

## What You'll Need

- A [GitHub](https://github.com) account (to host the code)
- A [Neon](https://neon.tech) account (free PostgreSQL database, never expires)
- A [Render](https://render.com) account (free web hosting)
- No credit card required for any of these

---

## Step 1 — Get the Code on GitHub

The easiest way is to **fork** the original repository:

1. Go to the GitHub repo (ask the person who sent you this guide for the link)
2. Click the **Fork** button in the top-right corner
3. Choose your account as the destination
4. Click **Create fork**

You now have your own copy of the code under `github.com/YOUR_USERNAME/the-repo-name`.

---

## Step 2 — Create a Free Database (Neon)

1. Go to **[neon.tech](https://neon.tech)** and sign up for free
2. Click **New Project**
3. Give it a name (e.g. `piggy-bank`) and click **Create Project**
4. Once created, find the **Connection Details** panel on the dashboard
5. Copy the **Connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   **Save this somewhere** — you'll need it in Step 3.

> Neon's free tier includes 0.5 GB of storage, which is more than enough. It auto-pauses when not in use and wakes up in ~1 second on the next request.

---

## Step 3 — Deploy on Render

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign up for free
2. Click **New +** → **Web Service**
3. Choose **Connect a GitHub repository** and select your forked repo
4. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `piggy-bank` (or any name you like) |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install --frozen-lockfile` |
| **Start Command** | See below ↓ |

**Start Command** (copy this exactly):
```
pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build && BASE_PATH=/piggy-bank/ NODE_OPTIONS=--max-old-space-size=460 pnpm --filter @workspace/piggy-bank run build && cp -r artifacts/piggy-bank/dist/public artifacts/api-server/dist/piggy-bank && node --enable-source-maps artifacts/api-server/dist/index.mjs
```

5. Scroll down to **Environment Variables** and add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *paste your Neon connection string from Step 2* |
| `SESSION_SECRET` | *any long random string, e.g. `abc123xyz789` — just make it at least 20 characters* |

6. Click **Create Web Service**

Render will now build and deploy the app. The first deploy takes about 3–5 minutes.

---

## Step 4 — Open Your App

Once the deployment finishes (you'll see **"Live"** in green on Render):

1. Click the URL at the top of your Render service page — it looks like `https://piggy-bank-xxxx.onrender.com`
2. Add `/piggy-bank/` to the end of the URL → **`https://piggy-bank-xxxx.onrender.com/piggy-bank/`**

That's your Piggy Bank! The database tables are created automatically on first boot.

---

## Step 5 — Future Updates (Auto-Deploy)

Since you connected Render to GitHub:
- Any time you push a change to your GitHub repo, Render automatically rebuilds and redeploys
- No manual steps needed

---

## What the App Does

- **יתרה נוכחית** (Current Balance) — shows the running total
- **הוסף עסקה** (Add Transaction) — log income or expenses with a category, description, and date
- **היסטוריה אחרונה** (Recent History) — list of all transactions with delete confirmation
- **ייצוא לאקסל** (Export to Excel) — downloads all data as a CSV file that opens in Excel

### Income categories: דמי כיס, מתנה, עזרה בבית, אחר
### Expense categories: צעצועים, אוכל, משחקים, בגדים, אחר

---

## Troubleshooting

**App loads but shows an error / blank screen**
- Go to your Render service → **Logs** tab and look for error messages
- Most common cause: `DATABASE_URL` is wrong. Double-check you copied the full Neon connection string

**"Build failed" on Render**
- Make sure your Start Command matches exactly what's in Step 3
- Check the Render logs for the specific error

**Database connection errors**
- Make sure the Neon connection string ends with `?sslmode=require`
- The database is automatically paused when idle — the first request after a pause takes ~1 second longer; this is normal

**The app works but data doesn't save**
- Check Render logs for database errors
- Make sure `DATABASE_URL` is set in the Environment tab of your Render **web service** (not a database service)

---

## Technical Summary (for the curious)

The app is a full-stack Node.js + React application:

- **Frontend**: React + Vite, served as static files from the Express server at `/piggy-bank/`
- **Backend**: Express.js API at `/api/bank/...` with these endpoints:
  - `GET /api/bank/balance` — current balance + initial balance
  - `GET /api/bank/summary` — total income, expenses, transaction counts
  - `GET /api/bank/transactions` — all transactions (newest first)
  - `POST /api/bank/transactions` — add a transaction
  - `DELETE /api/bank/transactions/:id` — delete a transaction
- **Database**: PostgreSQL (Neon) with two tables:
  - `transactions` — id, type, amount, description, category, date, balanceAfter, createdAt
  - `settings` — key/value store (used for initial balance setting)
- **Hosting**: Render free tier (512 MB RAM, auto-sleep after 15 min idle)
- **Database**: Neon free tier (0.5 GB, never expires, auto-pause)

---

*Guide prepared July 2026*
