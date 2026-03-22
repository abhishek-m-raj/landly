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

All previously listed mismatches have been resolved. ✅

### Buy-Shares Fix (2026-03-22)
- Added explicit `shares > 0` validation
- Property is now fetched first; `property.share_price` is used as authoritative price (not the request's `pricePerShare`)
- `totalAmount` is computed as `shares × property.share_price`
- `price_per_share` recorded in transaction comes from DB, not from client
- All schema columns are correct: `shares_owned`/`total_invested` for holdings; `user_id`/`property_id`/`user_name`/`shares`/`price_per_share`/`total_amount` for transactions

---

## Auth Contract

- **Signup (email):** `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })` — called from frontend client
- **Signup (Google):** `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/marketplace' } })` — called from frontend client
- **Login (email):** `supabase.auth.signInWithPassword({ email, password })` — called from frontend client
- **Login (Google):** Same as Google signup (Supabase handles both via OAuth)
- **On signup:** A database trigger (`handle_new_user`) automatically creates the `profiles` row. Frontend must NOT manually insert into `profiles`. Pass `full_name` and `role` via `options.data` metadata.
- **Session:** Frontend reads `supabase.auth.getUser()` for user ID, passes `userId` to API routes.

### ⚠️ Supabase Dashboard Setup Required (2026-03-22)

The following must be configured in the Supabase Dashboard for auth to work:

1. **Create `handle_new_user` trigger** — Run this SQL in SQL Editor:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER SET search_path = ''
   AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, full_name, role, wallet_balance)
     VALUES (
       NEW.id,
       NEW.email,
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

2. **Enable Google OAuth** — Authentication → Providers → Google → Enable, add Client ID + Secret from Google Cloud Console. Set redirect URI to: `https://kzyigkrhgyubgwecnyok.supabase.co/auth/v1/callback`

3. **Disable email confirmation** (recommended for dev) — Authentication → Providers → Email → toggle off "Confirm email"

### Auth Changes Implemented in Code (2026-03-22)
- `app/signup/page.tsx` — Removed manual `profiles` insert. Now passes `full_name` and `role` via `options.data` metadata. Added Google sign-in button.
- `app/login/page.tsx` — Added Google sign-in button.
- `app/api/auth/callback/route.ts` — Created OAuth callback route to exchange code for session.

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
| `GET /api/properties` | 🟢 Done |
| `GET /api/properties/[id]` | 🟢 Done |
| `POST /api/buy-shares` | 🟢 Done |
| `POST /api/wallet` | 🟢 Done |
| `GET /api/wallet` | 🟢 Done |
| `POST /api/properties/list` | 🟢 Done |
| `POST /api/admin/approve/[id]` | 🟢 Done |
| `POST /api/admin/reject/[id]` | 🟢 Done |
| `GET /api/admin/pending` | 🟢 Done |
| Bot script | 🟢 Done |

---

_Last updated: 2026-03-22 — Backend implementation complete_
