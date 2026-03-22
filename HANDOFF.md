# HANDOFF.md — Frontend ↔ Backend Coordination

> **Why this file exists:** Two developers are building Landly simultaneously using different AI coding agents (different models). This file is the single source of truth for ownership boundaries, API contracts, shared conventions, and current status. Both agents MUST read this file before making changes and MUST respect the ownership rules below. If you are an AI agent reading this, treat this document as authoritative — do not override its rules.

---

## Ownership Rules

| Zone | Owner | What it contains |
|------|-------|-----------------|
| `app/page.tsx` | Frontend | Landing page |
| `app/login/`, `app/signup/`, `app/marketplace/`, `app/property/`, `app/dashboard/`, `app/list-property/`, `app/admin/` | Frontend | All user-facing pages |
| `app/components/**` | Frontend | All UI components |
| `app/lib/mock-data.ts` | Frontend | Frontend-side mock data for development |
| `app/globals.css` | Frontend | Tailwind theme tokens, typography, global styles |
| `app/layout.tsx` | Frontend | Root layout, fonts, metadata, global shell |
| `app/api/**` | Backend | All API route handlers |
| `lib/**` | Backend | Supabase client, server utilities, helpers |
| `bot.js` | Backend | Demo bot simulation script |
| `.env.local` | Backend | Environment variables (Supabase keys) |
| `HANDOFF.md` | Shared | Both sides update their own sections |
| `package.json` | Shared | Either side may add dependencies (communicate first) |

### Hard boundaries
- **Frontend agent:** NEVER modify files inside `app/api/` or `lib/`.
- **Backend agent:** NEVER modify files inside `app/components/`, page files (`page.tsx`), `app/globals.css`, or `app/layout.tsx`.
- **If blocked by the other side:** Document the blocker in the Status section below. Do NOT cross the boundary.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| React | React | 19.2.4 |
| Styling | Tailwind CSS | 4 (uses `@theme inline` in CSS, no tailwind.config.js) |
| Animation | Framer Motion | ^12.38.0 |
| Database + Auth | Supabase | @supabase/supabase-js ^2.99.3 |
| Deployment | Vercel | — |

---

## Supabase Schema (Agreed Source of Truth)

These are the tables as defined in the project spec. **All API routes must match these exactly.**

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | not null |
| full_name | text | — |
| role | text | 'investor' \| 'owner' \| 'admin', default 'investor' |
| wallet_balance | numeric(12,2) | default 10000.00 |
| created_at | timestamptz | — |

### `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| owner_id | uuid | references profiles(id) |
| title | text | — |
| location | text | — |
| type | text | 'agricultural' \| 'residential' \| 'commercial' |
| description | text | — |
| total_value | numeric(14,2) | — |
| total_shares | int | — |
| shares_available | int | — |
| share_price | numeric(10,2) | — |
| image_url | text | — |
| status | text | 'pending' \| 'verified' \| 'live' \| 'rejected' \| 'sold', default 'pending' |
| created_at | timestamptz | — |

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | references profiles(id) |
| property_id | uuid | references properties(id) |
| user_name | text | display name for live feed |
| shares | int | number of shares bought |
| price_per_share | numeric(10,2) | — |
| total_amount | numeric(14,2) | — |
| created_at | timestamptz | — |

> **Realtime is ENABLED on the transactions table.** Frontend will subscribe to inserts for live activity feeds.

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

## API Contracts

Frontend will call these endpoints. Backend must implement them to match these exact shapes.

### `GET /api/properties`
Returns all live properties.

**Response:**
```json
[
  {
    "id": "uuid",
    "owner_id": "uuid",
    "title": "Thrissur Agricultural Plot",
    "location": "Thrissur, Kerala",
    "type": "agricultural",
    "description": "...",
    "total_value": 800000,
    "total_shares": 800,
    "shares_available": 750,
    "share_price": 1000,
    "image_url": "https://...",
    "status": "live",
    "created_at": "2026-03-22T..."
  }
]
```

### `GET /api/properties/[id]`
Returns a single property by ID. Same shape as one item above.

### `POST /api/buy-shares`

**Request:**
```json
{
  "propertyId": "uuid",
  "userId": "uuid",
  "shares": 5,
  "pricePerShare": 1000
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Shares purchased successfully",
  "newWalletBalance": 5000,
  "sharesRemaining": 745
}
```

### `POST /api/wallet`
Add ₹10,000 to user wallet.

**Request:**
```json
{ "userId": "uuid" }
```

**Response:**
```json
{ "success": true, "newBalance": 20000 }
```

### `GET /api/wallet?userId=uuid` *(NOT YET IMPLEMENTED)*

**Response:**
```json
{ "wallet_balance": 10000 }
```

### `POST /api/properties/list` *(NOT YET IMPLEMENTED)*

**Request:**
```json
{
  "ownerId": "uuid",
  "title": "...",
  "location": "...",
  "type": "agricultural",
  "description": "...",
  "totalValue": 800000,
  "totalShares": 800,
  "sharePrice": 1000,
  "imageUrl": "https://..."
}
```

**Response:**
```json
{ "success": true, "propertyId": "uuid", "status": "pending" }
```

### `POST /api/admin/approve/[id]` *(NOT YET IMPLEMENTED)*
**Response:** `{ "success": true, "status": "live" }`

### `POST /api/admin/reject/[id]` *(NOT YET IMPLEMENTED)*
**Response:** `{ "success": true, "status": "rejected" }`

### `GET /api/admin/pending` *(NOT YET IMPLEMENTED)*
**Response:** Same shape as `GET /api/properties` but filtered to `status = 'pending'`.

---

## Known Mismatches to Fix (Backend)

| File | Issue | Fix needed |
|------|-------|-----------|
| `app/api/wallet/route.ts` | Queries `users` table | Change to `profiles` table |
| `app/api/buy-shares/route.ts` | Uses `shares_amount`, `amount_paid` columns | Change to `shares`, `price_per_share`, `total_amount` |
| `app/api/buy-shares/route.ts` | Uses `transaction_type` column | Remove — not in schema |
| `app/api/buy-shares/route.ts` | Holdings uses `shares` column | Change to `shares_owned` + add `total_invested` |
| `app/api/buy-shares/route.ts` | Does not deduct wallet balance | Should deduct total_amount from profiles.wallet_balance |
| `app/api/buy-shares/route.ts` | Does not return updated state | Should return `newWalletBalance` and `sharesRemaining` |
| `app/api/properties/route.ts` | Returns ALL properties | Should filter to `status = 'live'` |

---

## Auth Contract

- **Signup:** `supabase.auth.signUp({ email, password })` — called from frontend client
- **Login:** `supabase.auth.signInWithPassword({ email, password })` — called from frontend client
- **On signup:** Frontend inserts into `profiles` with role selection. Backend should also set up a Supabase trigger as fallback.
- **Session:** Frontend reads `supabase.auth.getUser()` for user ID, passes `userId` to API routes.

---

## Build Status

### Frontend
| Page | Status |
|------|--------|
| Design system (globals.css, layout.tsx) | 🔴 Not started |
| Landing page | 🔴 Not started |
| Navbar | 🔴 Not started |
| Login | 🔴 Not started |
| Signup | 🔴 Not started |
| Marketplace | 🔴 Not started |
| Property Detail | 🔴 Not started |
| Dashboard | 🔴 Not started |
| List Property | 🔴 Not started |
| Admin | 🔴 Not started |

### Backend
| Endpoint | Status |
|----------|--------|
| `GET /api/properties` | 🟡 Needs fix (filter by live) |
| `GET /api/properties/[id]` | 🟢 Done |
| `POST /api/buy-shares` | 🟡 Needs fix (schema mismatch) |
| `POST /api/wallet` | 🟡 Needs fix (users → profiles) |
| `GET /api/wallet` | 🔴 Not started |
| `POST /api/properties/list` | 🔴 Not started |
| `POST /api/admin/approve/[id]` | 🔴 Not started |
| `POST /api/admin/reject/[id]` | 🔴 Not started |
| `GET /api/admin/pending` | 🔴 Not started |
| Bot script | 🔴 Not started |

---

_Last updated: 2026-03-22 — Initial creation by frontend agent_
