# CONTEXT.md — Landly Project Context

> **Why this file exists:** This is the single source of truth for anyone (human or AI agent) working on the Landly codebase. Read this before making changes. Keep it updated as the project evolves.

---

## What is Landly?

A fractional real estate investment platform for India. Users can buy and sell shares in agricultural land, residential flats, and commercial spaces starting from ₹100. Property owners list assets for verification; once approved by admins, investors can trade fractional shares.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| React | React | 19.2.4 |
| Styling | Tailwind CSS 4 | `@theme inline` in CSS, no tailwind.config.js |
| Animation | Framer Motion | ^12.38.0 |
| Auth | Supabase Auth | @supabase/supabase-js ^2.99.3 |
| Database | Supabase (Postgres) | Same client as auth |
| Realtime | Supabase Realtime | `postgres_changes` on `transactions` table |
| Deployment | Vercel | — |

### Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## Project Structure

```
├── app/
│   ├── globals.css              # Tailwind theme: landly-navy, gold, green, slate, offwhite
│   ├── layout.tsx               # Root layout: DM Sans + DM Mono fonts, AuthProvider wrapper
│   ├── page.tsx                 # Landing page (hero, how-it-works, property types, stats, CTA)
│   ├── login/page.tsx           # Email + Google OAuth login
│   ├── signup/page.tsx          # Email + Google signup with investor/owner role selector
│   ├── marketplace/page.tsx     # Property grid with type filters, fetches from /api/properties
│   ├── property/[id]/page.tsx   # Property detail: info, trading terminal, transaction feed
│   ├── dashboard/page.tsx       # User portfolio: wallet, holdings, transactions, add funds
│   ├── list-property/page.tsx   # Multi-step form to submit a property listing
│   ├── admin/page.tsx           # Admin control center: overview, property/user CRUD, transactions
│   ├── components/
│   │   ├── AuthProvider.tsx     # React context for Supabase auth session
│   │   ├── AuthGateModal.tsx    # Modal prompting unauthenticated users to sign in
│   │   ├── Navbar.tsx           # Responsive nav with avatar dropdown, mobile drawer, auth-aware
│   │   ├── FilterBar.tsx        # Marketplace type filter (All / Agricultural / Residential / Commercial)
│   │   ├── PropertyCard.tsx     # Property card with progress bar, type badge, invest CTA
│   │   ├── PropertyTradingTerminal.tsx  # Price chart, order book, buy/sell ticket
│   │   ├── SharePurchaseWidget.tsx      # Simpler buy-shares widget (used standalone)
│   │   ├── LiveTicker.tsx       # Fixed bottom bar showing latest transaction (Supabase Realtime)
│   │   └── TransactionFeed.tsx  # Per-property transaction list (Supabase Realtime)
│   ├── lib/
│   │   ├── types.ts             # TypeScript interfaces: Property, Transaction, Holding, UserProfile, PricePoint, OrderBookLevel, PropertyMarketData + helpers (formatINR, percentSold)
│   │   └── mock-data.ts         # DEPRECATED — no longer used, safe to delete
│   └── api/                     # All backend API routes (see API section below)
├── lib/
│   └── supabase.ts              # Shared Supabase client (createClient with env vars)
├── bot.js                       # Transaction simulator script (node bot.js)
├── CONTEXT.md                   # This file
├── AGENTS.md                    # Agent instructions (Next.js conventions)
└── package.json
```

### Empty Directories (stubs, no files yet)
- `app/api/holdings/`, `app/api/transactions/`, `app/api/profile/`, `lib/models/`, `scripts/`

---

## Design System

**Theme** — Dark mode with a navy/gold palette defined in `app/globals.css` via `@theme inline`:

| Token | Value | Usage |
|-------|-------|-------|
| `landly-navy` | `#1E293B` | Primary background |
| `landly-navy-deep` | `#0F172A` | Deeper backgrounds, cards |
| `landly-gold` | `#F59E0B` | Accent, prices, highlights |
| `landly-green` | `#059669` | Success, buy buttons, positive changes |
| `landly-slate` | `#64748B` | Secondary text, labels |
| `landly-offwhite` | `#F1F5F9` | Primary text |
| `landly-red` | `#EF4444` | Errors, sell buttons, negative changes |
| `--radius-land` | `12px` | Border radius standard |

**Fonts** — DM Sans (body) + DM Mono (numbers/prices), loaded via `next/font/google`.

**Animations** — Framer Motion throughout: `fadeUp` variants, `staggerContainer`, `layoutId` transitions on nav/filter pills, parallax on hero.

---

## Supabase Schema

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | not null |
| full_name | text | — |
| role | text | `'investor'` \| `'owner'` \| `'admin'`, default `'investor'` |
| wallet_balance | numeric(12,2) | default `10000.00` |
| created_at | timestamptz | — |

### `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| owner_id | uuid | references profiles(id) |
| title | text | — |
| location | text | — |
| type | text | `'agricultural'` \| `'residential'` \| `'commercial'` |
| description | text | — |
| total_value | numeric(14,2) | — |
| total_shares | int | — |
| shares_available | int | — |
| share_price | numeric(10,2) | — |
| image_url | text | — |
| status | text | `'pending'` \| `'verified'` \| `'live'` \| `'rejected'` \| `'sold'`, default `'pending'` |
| created_at | timestamptz | — |

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | references profiles(id) — nullable (bot transactions have no user) |
| property_id | uuid | references properties(id) |
| user_name | text | display name for live feed |
| shares | int | number of shares |
| price_per_share | numeric(10,2) | — |
| total_amount | numeric(14,2) | — |
| created_at | timestamptz | — |

> **Realtime is ENABLED on the transactions table.** LiveTicker and TransactionFeed subscribe to `INSERT` events via `postgres_changes`.

### `holdings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | references profiles(id) |
| property_id | uuid | references properties(id) |
| shares_owned | int | default 0 |
| total_invested | numeric(14,2) | default 0 |
| created_at | timestamptz | — |
| | | unique(user_id, property_id) |

---

## Auth

- **Client:** `lib/supabase.ts` exports a single Supabase client used by both frontend components and API routes.
- **Signup (email):** `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })`
- **Signup/Login (Google):** `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin + '/marketplace' })`
- **Login (email):** `supabase.auth.signInWithPassword({ email, password })`
- **OAuth callback:** `app/api/auth/callback/route.ts` exchanges the code for a session.
- **Profile creation:** A Supabase database trigger (`handle_new_user`) auto-creates profiles on signup. Frontend does NOT insert into profiles manually.
- **Session management:** `AuthProvider` context wraps the app. Components use `useAuth()` for `user`, `loading`, `signOut`.
- **Auth gating:** `AuthGateModal` pops up when unauthenticated users try to invest. Dashboard redirects to `/login` if not authenticated.

### Supabase Dashboard Setup Required

1. **`handle_new_user` trigger** — Run in SQL Editor:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger LANGUAGE plpgsql
   SECURITY DEFINER SET search_path = ''
   AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, full_name, role, wallet_balance)
     VALUES (
       NEW.id, NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
       COALESCE(NEW.raw_user_meta_data->>'role', 'investor'),
       10000
     );
     RETURN NEW;
   END;
   $$;

   CREATE OR REPLACE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

2. **Enable Google OAuth** — Authentication → Providers → Google → add Client ID + Secret.
3. **Disable email confirmation** (dev) — Authentication → Providers → Email → toggle off "Confirm email".

---

## API Routes

All routes are in `app/api/` and use the shared Supabase client from `lib/supabase.ts`.

### Core Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/properties` | All live properties | ✅ |
| GET | `/api/properties/[id]` | Single property by ID | ✅ |
| GET | `/api/properties/[id]/market` | Synthetic price history, order book, 24h change | ✅ |
| POST | `/api/properties/list` | Submit a new property listing (status: pending) | ✅ |
| POST | `/api/buy-shares` | Buy shares: deducts wallet, updates property, creates transaction + holding | ✅ |
| POST | `/api/sell-shares` | Sell shares: credits wallet, returns shares, updates/deletes holding | ✅ |
| GET | `/api/wallet?userId=uuid` | Get user wallet balance | ✅ |
| POST | `/api/wallet` | Add ₹10,000 to wallet | ✅ |
| GET | `/api/auth/callback` | OAuth code → session exchange | ✅ |

### Admin Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/admin/overview` | Aggregate stats: properties by status, users by role, transaction volume, holdings totals, wallet totals | ✅ |
| GET | `/api/admin/properties?status=&search=&limit=` | List properties with filters | ✅ |
| PATCH | `/api/admin/properties/[id]` | Update any property field (title, status, shares, price, etc.) | ✅ |
| DELETE | `/api/admin/properties/[id]` | Delete property (only if zero holdings + zero transactions) | ✅ |
| GET | `/api/admin/users?role=&search=&limit=` | List users with filters | ✅ |
| PATCH | `/api/admin/users/[id]` | Update user (role, name, wallet_balance or wallet_adjustment) | ✅ |
| GET | `/api/admin/transactions?propertyId=&userId=&limit=` | List transactions with filters | ✅ |
| GET | `/api/admin/pending` | Properties with status=pending | ✅ |
| POST | `/api/admin/approve/[id]` | Set property status → live | ✅ |
| POST | `/api/admin/reject/[id]` | Set property status → rejected | ✅ |

### Key Implementation Details

- **Buy-shares** uses DB `share_price` as source of truth (ignores any client-sent price).
- **Sell-shares** calculates average cost basis; deletes holding row when shares reach 0.
- **Market endpoint** generates synthetic price history from real transaction data + deterministic RNG. Order book is also synthetic with depth=10.
- **Admin shared helpers** in `app/api/admin/_shared.ts`: validation for property types, statuses, user roles, numeric parsing, error helpers.

---

## Frontend Pages — Build Status

| Page | Status | Key Details |
|------|--------|-------------|
| Design system | ✅ Done | Dark navy/gold theme, DM Sans/Mono, `@theme inline` |
| Landing page | ✅ Done | Parallax hero, how-it-works, property types, stats, CTA |
| Navbar | ✅ Done | Responsive, avatar dropdown, mobile drawer, auth-aware, active link indicator |
| Login | ✅ Done | Email + Google OAuth |
| Signup | ✅ Done | Email + Google, investor/owner role selector |
| Marketplace | ✅ Done | API-backed grid, type filter bar, live ticker |
| Property Detail | ✅ Done | Trading terminal (chart + order book + buy/sell), transaction feed, progress bar |
| Dashboard | ✅ Done | Wallet balance, add funds, portfolio summary, holdings cards, transaction table |
| List Property | ✅ Done | 3-step wizard (Basics → Details → Review), submits to `/api/properties/list` |
| Admin | ✅ Done | 4-tab control center (Overview, Properties, Users, Transactions), inline CRUD |

---

## Bot Script

`bot.js` — Run with `node bot.js`. Reads `.env.local`, fetches live properties, and inserts random transactions every 3–8 seconds. Updates `shares_available` on each trade. Useful for populating the live ticker and transaction feeds during demos.

---

## Known Gaps & Future Work

- **No property images** — PropertyCard and detail page use gradient placeholders. `image_url` field exists but is always empty.
- **No admin auth gating** — `/admin` page is accessible to anyone. No middleware checks for `role === 'admin'`.
- **No server-side auth on API routes** — API routes accept `userId` from the client without verifying the session token. Needs server-side auth middleware for production.
- **Deprecated file** — `app/lib/mock-data.ts` is no longer used (all pages fetch live data). Safe to delete.
- **Empty stub directories** — `app/api/holdings/`, `app/api/transactions/`, `app/api/profile/`, `lib/models/`, `scripts/` exist but have no files.
- **No sell-shares in HANDOFF** — The sell endpoint and trading terminal sell tab are functional but weren't in the original spec.
- **Transaction atomicity** — Buy/sell operations do sequential updates instead of a single Postgres transaction/RPC. Race conditions possible under load.

---

_Last updated: 2026-03-23_
