# Deployment Infrastructure & Workflow Guide for Claude

This document explains how the football-wall app is hosted, how the database works, and how your code changes get deployed live to production.

---

## Architecture Overview

```
Your Local Machine
        ↓
    (git push)
        ↓
GitHub Repository (gurusewak/football-wall)
        ↓
Vercel (Auto Deployment)
        ↓
Production Site: https://football-wall.vercel.app
        ↑
    (reads from)
        ↑
Neon PostgreSQL Database
```

---

## Part 1: Vercel Hosting

### What is Vercel?

Vercel is a **serverless platform** that:
- Automatically builds and deploys your Next.js app
- Hosts it on a global CDN for fast performance
- Provides free SSL/HTTPS certificates
- Scales automatically based on traffic
- Runs cron jobs (like your 2-hour sync)

### Your Vercel Project

- **Project Name**: football-wall
- **Production URL**: https://football-wall.vercel.app
- **Project ID**: prj_Ynhb5OSnNqXla8xkl68FcHBpeHC4
- **Git Integration**: Connected to `gurusewak/football-wall` on GitHub

### How Vercel Detects Changes

1. You push code to GitHub (`git push`)
2. GitHub sends a webhook to Vercel
3. Vercel automatically:
   - Clones your repository
   - Installs dependencies (`pnpm install`)
   - Builds the Next.js app (`pnpm run build`)
   - Deploys to their CDN servers
4. Your changes are live in ~2-3 minutes

### Vercel Configuration

Your `vercel.json` file configures:

```json
{
  "projectSettings": {
    "framework": "nextjs"
  },
  "crons": [
    {
      "path": "/api/cron/worldcup-sync",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

- **framework**: Tells Vercel this is a Next.js app
- **crons**: Schedules your sync endpoint to run every 2 hours (`0 */2 * * *` = every 2 hours)

---

## Part 2: Neon Database

### What is Neon?

Neon is a **serverless PostgreSQL database** that:
- Stores all your World Cup data (groups, matches, events, brackets)
- Auto-scales based on queries
- Has free tier for development
- Provides connection pooling for performance

### Your Neon Setup

- **Database Name**: football_wall
- **Connection Type**: Direct PostgreSQL connection via `pg` (Node.js driver)
- **Environment Variable**: `DATABASE_URL` - automatically set by Vercel integration

### How the Database Works

1. **In Development** (your local machine):
   - Your code reads `DATABASE_URL` from `.env.development.local`
   - Connects directly to Neon

2. **In Production** (Vercel):
   - Vercel injects `DATABASE_URL` as an environment variable
   - Your code uses the same connection string
   - All reads/writes go to the same Neon database

3. **No Downtime During Deploys**:
   - Database is separate from the app
   - Old and new app versions both connect to same database
   - Zero data loss during deployments

### Database Schema

Your tables are created in Neon:

```sql
-- World Cup info
CREATE TABLE world_cups (...)

-- Groups and standings
CREATE TABLE groups (...)
CREATE TABLE teams (...)
CREATE TABLE team_group_assignments (...)
CREATE TABLE group_standings (...)

-- Match data
CREATE TABLE matches (...)
CREATE TABLE match_events (...)

-- Knockout stage
CREATE TABLE bracket_nodes (...)

-- Monitoring
CREATE TABLE sync_logs (...)
```

All tables use Drizzle ORM for type-safe queries.

---

## Part 3: Git Workflow → Live Deployment

### Step-by-Step: How Your Changes Go Live

#### 1. **Make Changes Locally**
```bash
# Create a new file or edit existing ones
echo "console.log('new feature')" >> app/page.tsx
```

#### 2. **Commit Your Changes**
```bash
cd /path/to/football-wall
git add .
git commit -m "Add new World Cup feature"
```

#### 3. **Push to GitHub**
```bash
git push origin publish-site
```

This pushes to the `publish-site` branch (your development branch connected to Vercel).

#### 4. **GitHub Sends Webhook to Vercel**
- GitHub automatically notifies Vercel of new commits
- Vercel receives the webhook in <1 second

#### 5. **Vercel Builds Your App**
```
Vercel Actions:
├── Clone your repo from GitHub
├── Checkout the publish-site branch
├── Install dependencies (pnpm install)
├── Build Next.js (pnpm run build)
├── Run TypeScript checks
├── Optimize for production
└── Deploy to CDN
```

#### 6. **Your Changes Are Live**
```
✓ https://football-wall.vercel.app shows your new code
```

### Deployment Branches

- **`publish-site`** (Current): Connected to Vercel, auto-deploys on push
- **`master`**: Your main branch (can push here too, Vercel will deploy it)

### Monitoring Deployments

**In Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Click "football-wall" project
3. See deployment history and logs
4. Check if build succeeded or failed

**Via Vercel CLI:**
```bash
vercel list --prod          # Show recent deployments
vercel logs --prod          # Show deployment logs
vercel env list            # Show environment variables
```

---

## Part 4: SSL/HTTPS & Domain Setup

### SSL Certificate (HTTPS)

**Current Status**: ✅ Already Active

- Vercel automatically:
  - Generates free SSL certificates via Let's Encrypt
  - Renews them before expiration (automatic)
  - Enables HTTPS on all domains

- Your URL: `https://football-wall.vercel.app`
  - `https://` = Encrypted connection
  - Certificate is valid and auto-renewed

### How SSL Works

1. **Your Browser** connects to `https://football-wall.vercel.app`
2. **Vercel's Server** presents SSL certificate
3. **Browser Validates** the certificate
4. **Encrypted Connection** established
5. **Data** is encrypted in transit

### Your Domain

Your domain is: `football-wall.vercel.app`

**Format**: `{project-name}.vercel.app`

This is a **Vercel subdomain**:
- Automatically points to your Vercel deployment
- SSL certificate included
- No custom domain setup needed
- Free for all Vercel projects

### If You Want a Custom Domain

(Optional - not needed now, but here's how it works):

```bash
vercel alias add https://football-wall.vercel.app yourdomain.com
```

Then:
- Point your domain registrar to Vercel's nameservers
- Vercel auto-generates SSL cert for your domain
- Users visit `https://yourdomain.com`

---

## Part 5: Environment Variables

### How Environment Variables Work

**In Development (Local Machine):**
```
File: .env.development.local
Content: DATABASE_URL=postgres://...
         BETTER_AUTH_SECRET=xyz...
Your code: process.env.DATABASE_URL
```

**In Production (Vercel):**
```
Vercel Dashboard → Settings → Environment Variables
DATABASE_URL = postgres://...
BETTER_AUTH_SECRET = xyz...
Your code: process.env.DATABASE_URL (same)
```

### Current Environment Variables

| Variable | Purpose | Status |
|----------|---------|--------|
| `DATABASE_URL` | Neon connection string | ✅ Auto-set by Neon integration |
| `BETTER_AUTH_SECRET` | Auth session signing key | ✅ Already configured |

### Important: Never Commit `.env` Files

```bash
# ✅ DO commit to git
- .env.development.local (in .gitignore)
- Your source code

# ✅ DO NOT commit to git
- .env.production.local
- Secrets, API keys
- Environment variables
```

Vercel manages production secrets separately, not in your repo.

---

## Part 6: Cron Jobs (Scheduled Tasks)

### Your 2-Hour Sync Job

**Configuration** (in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/worldcup-sync",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

### How It Works

1. **Every 2 Hours** (00:00, 02:00, 04:00, etc. UTC):
   - Vercel's cron service sends a POST request to `/api/cron/worldcup-sync`
   - Your Next.js API route handler runs

2. **Your Code Should** (in `app/api/cron/worldcup-sync/route.ts`):
   - Fetch latest World Cup data from external API
   - Query database for existing matches/events
   - Calculate what's new/changed
   - Insert/update Neon tables
   - Return success/error response

3. **Automatic Scheduling**:
   - Runs automatically every 2 hours
   - No need to start it manually
   - Works even if you're offline
   - Syncs until July 20, 2026 (when World Cup ends)

### Cron Schedule Syntax

```
0 */2 * * *
│ │   │ │ │
│ │   │ │ └─── Day of Week (0-6, 0=Sunday)
│ │   │ └───── Month (1-12)
│ │   └─────── Day of Month (1-31)
│ └─────────── Hour (0-23)
└───────────── Minute (0-59)

0 */2 * * * = Every 2 hours
```

### Monitoring Cron Executions

**In Vercel Dashboard:**
1. Go to project settings
2. Check "Cron Executions" logs
3. See timestamps, duration, and success/error status

---

## Part 7: Complete Deployment Flow Example

### Scenario: You Add a New API Endpoint

#### Step 1: Local Development
```bash
# Create new file
cat > app/api/teams/route.ts << 'EOF'
export async function GET() {
  const teams = await db.select().from(teams_table)
  return Response.json(teams)
}
EOF

# Test locally
npm run dev
# Visit http://localhost:3000/api/teams
```

#### Step 2: Commit Changes
```bash
git add app/api/teams/route.ts
git commit -m "Add GET /api/teams endpoint"
```

#### Step 3: Push to GitHub
```bash
git push origin publish-site
```

#### Step 4: GitHub Webhooks Vercel
- Vercel receives: "gurusewak pushed to publish-site"

#### Step 5: Vercel Builds
```
1. Clone repo
2. npm install (pnpm install)
3. npm run build (next build)
4. Type check (tsc --noEmit)
5. Deploy
```

#### Step 6: Live
```
✓ Your endpoint is live
✓ Available at https://football-wall.vercel.app/api/teams
✓ Connected to Neon database
✓ SSL/HTTPS working
```

#### Step 7: If Build Fails
- Vercel shows error in dashboard
- Previous version stays live
- Your code doesn't deploy
- Fix the error, push again

---

## Part 8: Database Persistence Across Deployments

### Why Data Doesn't Get Lost

```
Deployment 1 (Old Code)
        ↓
   Uses Database
        ↓
Neon Database (SEPARATE from code)
        ↓
Deployment 2 (New Code)
        ↓
   Uses Same Database
```

- **App Code** = Deployed to Vercel CDN, replaced on every push
- **Database** = Stays in Neon, survives all deployments
- **No data loss** when you push new code

### Example Timeline

```
12:00 - Deploy v1, insert World Cup groups into DB
12:30 - Your code updates (deploy v2), groups still in DB ✓
14:00 - Cron sync runs (fetches matches), updates DB ✓
14:30 - Deploy v3, all data still there ✓
16:00 - Cron sync runs again, adds new events ✓
```

---

## Part 9: Testing Before Pushing to Production

### Local Testing Checklist

```bash
# 1. Start dev server
npm run dev

# 2. Check your changes
# Visit http://localhost:3000

# 3. Check API endpoints work
curl http://localhost:3000/api/sports-data
curl http://localhost:3000/api/teams

# 4. Check database connections
# (Should see no errors in terminal)

# 5. Build for production
npm run build

# 6. Run production build locally
npm run start

# 7. Test again on http://localhost:3000
```

### If Build Fails

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for ESLint errors
npm run lint

# Check dependencies
npm list

# Install missing packages
npm install
```

---

## Part 10: Quick Reference Commands

### Git & Deployment
```bash
git status              # See what's changed
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push origin publish-site  # Deploy to production
git log --oneline -5    # See last 5 commits
```

### Local Development
```bash
npm run dev             # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Run production build
npm run lint            # Check for errors
```

### Database (Drizzle ORM)
```bash
# In your code:
import { db } from '@/lib/db'
import { worldCups } from '@/lib/db/schema'

// Select
const cups = await db.select().from(worldCups)

// Insert
await db.insert(worldCups).values({ name: '2026 World Cup' })

// Update
await db.update(worldCups).set({ status: 'ongoing' })

// Delete
await db.delete(worldCups).where(eq(worldCups.id, 1))
```

### Vercel Monitoring
```bash
vercel list --prod          # Show deployments
vercel logs --prod          # Show deployment logs
vercel env ls              # Show environment variables
vercel inspect <URL>       # Inspect deployment
```

---

## Part 11: Troubleshooting

### Build Fails After Push

**Problem**: Vercel deployment shows red ✗
**Solution**:
1. Check Vercel dashboard for error message
2. Run `npm run build` locally
3. Fix the error shown
4. Push again

### Database Connection Error

**Problem**: App shows "Cannot connect to database"
**Solution**:
1. Check `DATABASE_URL` is set in Vercel env vars
2. Check Neon database is running
3. Check IP allowlist in Neon settings
4. Verify connection string is correct

### Changes Don't Show Up After Push

**Problem**: Pushed code but changes aren't live
**Solution**:
1. Check you pushed to `publish-site` branch
2. Check Vercel dashboard for deployment status
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check if build succeeded (green ✓)

### Cron Job Not Running

**Problem**: 2-hour sync never fires
**Solution**:
1. Check `/api/cron/worldcup-sync` exists and works
2. Verify `vercel.json` has correct cron config
3. Push changes (config changes need redeploy)
4. Check Vercel cron logs in dashboard

---

## Summary

**The Flow:**
1. You write code locally
2. Push to GitHub (`git push`)
3. Vercel automatically deploys
4. Changes are live in 2-3 minutes
5. Cron job syncs data every 2 hours
6. All data persists in Neon
7. SSL/HTTPS always on
8. No manual steps needed

**Key Points:**
- ✅ No need to manually deploy
- ✅ Database survives all deployments
- ✅ SSL/HTTPS is automatic
- ✅ Cron jobs run automatically
- ✅ Environment variables auto-injected
- ✅ All your data is safe in Neon

Just push your code and Vercel handles the rest! 🚀
