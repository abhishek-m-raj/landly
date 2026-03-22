# CONTEXT.md — Landly Project Context

> Why this file exists: this document is the authoritative operating context for anyone writing prompts, planning work, or editing code in the Landly repo. It is written to remove ambiguity for AI assistants and human collaborators. Read this before proposing or making changes.

---

## 1. Product Definition

**Landly** is a fractional real estate investing platform focused on the Indian market.

Core idea:
- Property owners list land or real estate assets.
- Admins review and approve listings.
- Investors buy fractional shares in approved properties.
- Investors can also sell shares back through the platform's simulated market flow.

Property categories currently supported:
- Agricultural
- Residential
- Commercial

Primary value proposition:
- Retail investors can start from a low ticket size.
- Real estate ownership is presented with fintech-style clarity and trading metaphors.
- The current product direction blends real estate discovery, portfolio tracking, and a lightweight trading terminal.

Current product maturity:
- This is not an empty scaffold.
- The product already has a complete visual system, page set, and working API surface.
- The main gaps are production hardening, richer data/media, auth enforcement, and transactional robustness.

---

## 2. Current Reality Snapshot

This is the actual state of the repo as of 2026-03-23.

### What is already built

- Landing page
- Login page
- Signup page
- Marketplace page
- Property detail page
- Dashboard page
- List-property flow
- Admin control center
- Shared navbar and auth context
- Realtime live ticker and transaction feed
- Buy-shares and sell-shares flows
- Synthetic market data endpoint for charts and order book

### What is not yet production-ready

- Property imagery is partial rather than comprehensive
- The `/admin` page route itself is still reachable, but admin APIs are now role-protected server-side
- Several stub directories still exist with no implementation

### Important correction

- The project uses **Supabase for both auth and database**.
- It does **not** use MongoDB.
- Any old notes mentioning MongoDB are obsolete.

---

## 3. Tech Stack

| Layer | Technology | Version / Notes |
|------|------------|-----------------|
| Framework | Next.js App Router | 16.2.1 |
| React | React | 19.2.4 |
| Styling | Tailwind CSS 4 | theme tokens defined directly in CSS via `@theme inline` |
| Animation | Framer Motion | 12.38.0 |
| Auth | Supabase Auth | client-side session usage |
| Database | Supabase Postgres | queried directly via Supabase JS client |
| Realtime | Supabase Realtime | `postgres_changes` subscriptions on `transactions` |
| Deployment | Vercel | production deployment |

---

## 4. Required Environment Variables

Local development depends on `.env.local`.

Required keys:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-or-publishable-key>
```

Notes:
- Each key must be on its own line.
- The Supabase URL should use the normal project host format, typically `https://<project-ref>.supabase.co`.
- Localhost can fail while Vercel works if `.env.local` is malformed even when the Git code is identical.

---

## 5. Directory Map

```text
app/
  globals.css
  layout.tsx
  page.tsx
  login/page.tsx
  signup/page.tsx
  marketplace/page.tsx
  property/[id]/page.tsx
  dashboard/page.tsx
  list-property/page.tsx
  admin/page.tsx
  components/
    AuthProvider.tsx
    AuthGateModal.tsx
    Navbar.tsx
    FilterBar.tsx
    PropertyCard.tsx
    PropertyTradingTerminal.tsx
    SharePurchaseWidget.tsx
    LiveTicker.tsx
    TransactionFeed.tsx
  lib/
    types.ts
    mock-data.ts
  api/
    auth/callback/route.ts
    properties/route.ts
    properties/[id]/route.ts
    properties/[id]/market/route.ts
    properties/list/route.ts
    buy-shares/route.ts
    sell-shares/route.ts
    wallet/route.ts
    admin/_shared.ts
    admin/overview/route.ts
    admin/pending/route.ts
    admin/approve/[id]/route.ts
    admin/reject/[id]/route.ts
    admin/properties/route.ts
    admin/properties/[id]/route.ts
    admin/users/route.ts
    admin/users/[id]/route.ts
    admin/transactions/route.ts

lib/
  supabase.ts

bot.js
CONTEXT.md
AGENTS.md
package.json
```

Stub directories with no files yet:
- `app/api/holdings/`
- `app/api/transactions/`
- `app/api/profile/`
- `lib/models/`
- `scripts/`

---

## 6. Design Language

### Core visual direction

The UI is intentionally not generic SaaS white-card design.

It is:
- dark
- cinematic
- fintech-adjacent
- premium but not luxurious
- modern Indian investment platform rather than American stock broker clone

### Theme tokens

Defined in `app/globals.css`.

| Token | Value | Meaning |
|------|-------|---------|
| `landly-navy` | `#1E293B` | main background |
| `landly-navy-deep` | `#0F172A` | deeper panels and overlays |
| `landly-gold` | `#F59E0B` | primary accent, pricing, important highlights |
| `landly-green` | `#059669` | success, buy actions, positive values |
| `landly-slate` | `#64748B` | muted copy and labels |
| `landly-offwhite` | `#F1F5F9` | high-contrast text |
| `landly-red` | `#EF4444` | destructive actions, errors, sell actions |
| `--radius-land` | `12px` | shared radius token |

### Typography

- Primary font: DM Sans
- Numeric/financial font: DM Mono

Usage pattern:
- Headings and body copy use DM Sans
- Prices, totals, share counts, balances, and technical metrics use DM Mono

### Motion language

Framer Motion is used throughout for:
- fade-up entrance animations
- staggered section reveals
- nav underline transitions via `layoutId`
- filter pill transitions via `layoutId`
- hero parallax on landing page
- chart/orderbook width animations
- slide-in mobile drawer
- modal entrance/exit

### Global shell behavior

- `Navbar` is fixed to the top
- Most pages use a dark full-height background
- Many pages reserve top padding like `pt-24` or `pt-28` to clear the fixed navbar
- `html` currently has `scroll-behavior: smooth`

---

## 7. Information Architecture

### Public / top-level routes

| Route | Purpose |
|------|---------|
| `/` | marketing landing page |
| `/login` | email + Google sign-in |
| `/signup` | email + Google sign-up with role choice |
| `/marketplace` | browse live properties |
| `/property/[id]` | property detail and trading terminal |
| `/dashboard` | investor portfolio |
| `/list-property` | owner submission flow |
| `/admin` | admin operations console |

### User journey summary

Investor flow:
1. Land on landing page
2. Sign up or log in
3. Browse marketplace
4. Open property detail
5. Buy shares
6. View holdings and recent transactions in dashboard

Owner flow:
1. Sign up as owner
2. Open list-property flow
3. Submit property
4. Wait for admin approval

Admin flow:
1. Open admin page
2. Inspect overview metrics
3. Moderate properties
4. Edit users and balances
5. Inspect platform transactions

---

## 8. Exact UI Structure — Global Components

### `Navbar`

Purpose:
- Global top navigation across most app routes

Desktop structure:
- Brand link: `Landly`
- Center links: Marketplace, Dashboard when authenticated, Admin
- Right side auth area:
  - loading skeleton circle while auth loads
  - if logged out: `Log in` text button + `Sign up` filled green button
  - if logged in: avatar button with dropdown

Avatar dropdown contents:
- user full name or email
- user email
- wallet balance pill (gold mono ₹X,XXX, fetched from `/api/wallet`)
  - renders immediately as a visible wallet row; shows `Loading...` until the balance fetch resolves
  - refetches when the avatar dropdown opens so auth hydration timing does not leave it blank
- `Add Funds` button that expands an inline popover with amount input + confirm
  - on success: shows green checkmark + new balance, auto-dismisses
  - calls `POST /api/wallet` with `{ amount }`
  - wallet top-ups are capped server-side for demo safety
- link to dashboard labeled `Profile`
- `Log out` button in red tone

Mobile structure:
- Brand left
- hamburger right
- right-side slide-in drawer when open
- drawer includes nav links and auth actions
- dark overlay behind drawer

Styling traits:
- fixed position
- semi-transparent dark backdrop on non-transparent mode
- gold underline for active desktop route

### `AuthProvider`

Purpose:
- Wraps app in layout
- exposes `session`, `user`, `loading`, and `signOut`

### `AuthGateModal`

Purpose:
- Shown when logged-out users attempt to invest from property cards

Structure:
- centered modal on dark blurred overlay
- gold lock icon
- title: `Sign in to invest`
- explanatory text
- green `Log in` button
- bordered `Sign up` button

### `FilterBar`

Options:
- All
- Agricultural
- Residential
- Commercial

Behavior:
- active option gets animated gold pill outline/background

### `PropertyCard`

Purpose:
- Marketplace listing card

Structure:
- image area with abstract gradient placeholder, not real photos
- property type badge in upper left
- title
- location
- 3-value metrics row:
  - total value
  - per share price
  - available shares
- funding progress bar
- CTA zone with `Invest Now`

Interaction:
- whole card links to property detail
- hover lifts card slightly
- if user not logged in and clicks CTA, opens auth gate modal

### `LiveTicker`

Purpose:
- global fixed bottom strip on marketplace pages

Structure:
- live indicator with pulsing green dot
- single-line transaction message like user X bought Y shares of Z property

Behavior:
- subscribes to transaction inserts in realtime

### `TransactionFeed`

Purpose:
- recent activity list on property detail page

Structure:
- heading `Recent Activity`
- list of rounded rows
- each row shows user name, shares bought, relative time

Behavior:
- loads latest 10 property-specific transactions
- subscribes to new inserts for that property

### `PropertyTradingTerminal`

Purpose:
- central trading UI on property detail page

Top summary strip:
- heading `Trading Terminal`
- subcopy: chart, price trend, live order execution
- current price in large gold mono text
- 24h change in green or red with arrow

Main two-column layout on large screens:
- left: line chart area
- right: auth gate or trade ticket

Chart area:
- dark rounded panel
- SVG line chart from synthetic market history
- left/right timestamps under chart

Trade ticket when logged out:
- centered lock icon
- prompt to sign in
- `Log in` and `Sign up` buttons

Trade ticket when logged in:
- buy/sell segmented tabs
- quantity input
- optional price limit input
- computed total
- available shares for buy mode
- your shares for sell mode
- action button text changes with mode and quantity
- wallet balance panel in buy mode
- inline error box on failure
- temporary success label when successful

Below chart:
- two-column order book
- left: bid orders with green depth bars
- right: ask orders with red depth bars

### `SharePurchaseWidget`

Purpose:
- standalone, simpler buy widget

Status:
- implemented but not the main UX path on property detail, which now uses `PropertyTradingTerminal`

---

## 9. Exact UI Structure — Page by Page

### `/` Landing page

Purpose:
- top-of-funnel marketing page

Visual structure from top to bottom:

1. Hero section
- full-screen feel
- deep gradient background
- subtle grid overlay
- large blurred gold ambient glow
- fixed transparent nav inside hero
- eyebrow text: `Landly`
- H1: `Own a piece of India.` then `From ₹100.` in gold
- supporting paragraph about fractional real estate in India
- two CTAs:
  - green `Start Investing`
  - bordered `Explore Properties`
- animated mouse-scroll hint at bottom

2. `How It Works` section
- centered heading block
- 3-step horizontal process on desktop
- steps:
  - `01 List Your Property`
  - `02 We Verify & Split`
  - `03 Investors Buy Shares`

3. `What You Can Invest In` section
- 3 centered columns with emoji icons
- Agricultural
- Residential
- Commercial
- each shows short pitch and starting share price

4. Stats + final CTA section
- 3 big metrics:
  - `6 Properties Listed`
  - `1,200+ Investors`
  - `₹3.5 Cr+ Platform Value`
- final CTA headline: `Ready to own your piece?`
- green button: `Get Started — It's Free`

5. Footer
- brand text left-ish/centered depending width
- links to Marketplace, Log in, Sign up
- copyright text

### `/login`

Purpose:
- sign-in surface

Structure:
- fixed global navbar
- centered narrow auth panel
- title `Welcome back`
- subcopy `Log in to your Landly account`
- email input
- password input
- red inline error when auth fails
- primary green `Log In` button
- divider with `or`
- Google sign-in button with colored Google glyph
- bottom link to signup

### `/signup`

Purpose:
- account creation surface

Structure:
- same shell as login
- title `Create your account`
- subcopy about investing from ₹100
- fields:
  - full name
  - email
  - password
- role selector with two cards:
  - `I want to invest`
  - `I want to list property`
- primary green `Create Account` button
- divider with `or`
- Google signup button
- bottom link back to login

### `/marketplace`

Purpose:
- browse all live properties

Structure:
- navbar at top
- page header:
  - H1 `Marketplace`
  - supporting line about verified properties across India
- filter bar under header
- main content area:
  - loading state text
  - empty state text when filtered results are empty
  - otherwise grid of `PropertyCard`
- `LiveTicker` fixed at bottom of viewport

Data expectations:
- fetches from `/api/properties`
- expects array of live properties

### `/property/[id]`

Purpose:
- detail page for a single property plus trading interface

Structure:

1. Hero strip
- large dark image placeholder area
- soft radial glow background
- bottom gradient overlay
- type pill badge
- property title
- location line

2. Main content stack
- `About this property`
- `Investment Details`
  - total value
  - share price
  - total shares
  - available shares
- funding progress bar with funded percentage
- `PropertyTradingTerminal`
- `Documents` placeholder block
- `TransactionFeed`

Behavior:
- also fetches user wallet balance if authenticated

### `/dashboard`

Purpose:
- investor account overview

Structure:

1. Header
- title `Dashboard`

2. Portfolio summary cards
- total invested
- current value
- gain/loss with green or red text
- properties held count

4. Holdings section
- title `Your Holdings`
- if empty: link to marketplace
- else: responsive grid of holding cards

Holding card contents:
- property title
- location
- gain percentage
- shares owned
- invested amount
- current value

5. Recent transactions section
- title `Recent Transactions`
- simple table with property, shares, amount, date

Behavior:
- redirects unauthenticated users to `/login`

### `/list-property`

Purpose:
- owner submission wizard

Structure:

1. Page title
- `List a Property`

2. Step indicator row
- `1 Basics`
- `2 Details`
- `3 Review`

3. Step content

Step 1 `Basics`
- property title input
- location input
- property type segmented selection buttons

Step 2 `Details`
- description textarea
- three numeric inputs:
  - total value
  - total shares
  - price per share

Step 3 `Review`
- summary card showing title, location, type, total value, total shares, price/share, description

4. Navigation row
- `Back` text button when not on first step
- gold `Continue` button for steps 1 and 2
- green `Submit for Review` button on final step

5. Error state
- red submit error text below navigation

6. Success state after submission
- centered success checkmark circle
- title `Property Submitted`
- confirmation text mentioning the specific property title

### `/admin`

Purpose:
- operations console for platform management

Top shell:
- page title `Admin Control Center`
- supporting text about moderation and financial controls
- tab strip with:
  - Overview
  - Properties
  - Users
  - Transactions
- global error/info banner area under tabs

Overview tab:
- KPI cards for properties, users, transactions, volume
- property breakdown panel by status
- financial summary panel with wallet balance, holdings invested, total shares held

Properties tab:
- search field
- status select filter
- refresh button
- list of editable property cards

Each property admin card contains:
- title and location
- property type label and status label
- editable inputs for title, location, status, type, total value, share price, total shares, shares available
- editable description textarea
- action buttons:
  - Save
  - Set Live
  - Reject
  - Delete

Users tab:
- search field
- role filter select
- refresh button
- list of user management cards

Each user card contains:
- full name
- email
- role select
- wallet balance display
- wallet adjustment input
- `Apply Wallet Update` button

Transactions tab:
- heading `Platform Transactions`
- refresh button
- wide table with columns:
  - Time
  - User
  - Property
  - Shares
  - Price
  - Amount

Important note:
- The page remains a visible route, but the underlying admin APIs now require an authenticated admin user and the admin client sends auth headers with each request.

---

## 10. Data Model and Types

Defined in `app/lib/types.ts`.

Main frontend types:
- `Property`
- `Transaction`
- `Holding`
- `UserProfile`
- `PricePoint`
- `OrderBookLevel`
- `PropertyOrderBook`
- `PropertyMarketData`

Helpers:
- `formatINR(amount)` formats numbers as Indian rupee currency
- `percentSold(property)` computes sold share percentage from `total_shares` and `shares_available`

---

## 11. Auth Model

### Frontend auth behavior

- App is wrapped in `AuthProvider` from `app/layout.tsx`
- Session is read client-side via Supabase auth APIs
- Login and signup are fully client-driven
- Google OAuth is supported
- `useAuth()` supplies the authenticated user to components like navbar and property cards

### Signup behavior

Email signup uses:

```ts
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, role } },
})
```

Google signup/login uses:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin + '/api/auth/callback?next=...' },
})
```

### Database requirement

Profiles are not manually inserted by the frontend.
They are created by a DB trigger `handle_new_user` after auth user creation.

---

## 12. Backend API Surface

All routes are implemented inside `app/api/`. Routes that write to RLS-protected tables (wallet, buy-shares, sell-shares, properties/list) use `createAuthClient(request)` from `lib/supabase.ts`, which forwards the caller's JWT via the `Authorization` header so Supabase RLS sees the correct `auth.uid()`. Read-only public routes (e.g. GET properties) use the shared anon client.

Client-side code calls `getAuthHeaders()` from `lib/supabase.ts` to attach the Bearer token before calling protected endpoints.

### Core routes

| Method | Route | Purpose |
|------|-------|---------|
| GET | `/api/properties` | returns all live properties |
| GET | `/api/properties/mine` | returns the authenticated owner's listed properties and statuses |
| GET | `/api/properties/[id]` | returns a single property |
| GET | `/api/properties/[id]/market` | returns synthetic market chart + order book data |
| POST | `/api/properties/list` | creates a pending property listing |
| POST | `/api/buy-shares` | purchases shares, updates wallet, holdings, transactions |
| POST | `/api/sell-shares` | sells shares, updates wallet, holdings, properties |
| GET | `/api/wallet` | returns the authenticated user's wallet balance |
| POST | `/api/wallet` | adds a specified amount to the authenticated user's wallet and returns the new balance |
| GET | `/api/auth/callback` | exchanges OAuth code for session |
| GET | `/api/stats` | returns live platform counts for public marketing stats |

### Admin routes

| Method | Route | Purpose |
|------|-------|---------|
| GET | `/api/admin/overview` | summary stats across entities |
| GET | `/api/admin/pending` | pending properties |
| POST | `/api/admin/approve/[id]` | sets property to live |
| POST | `/api/admin/reject/[id]` | sets property to rejected |
| GET | `/api/admin/properties` | filtered property list |
| PATCH | `/api/admin/properties/[id]` | updates property fields |
| DELETE | `/api/admin/properties/[id]` | deletes property when safe |
| GET | `/api/admin/users` | filtered user list |
| PATCH | `/api/admin/users/[id]` | updates user role/name/wallet |
| GET | `/api/admin/transactions` | filtered transaction list |

### Important implementation details

- `buy-shares` trusts the DB price, not a client-provided price
- `sell-shares` computes average cost basis and deletes holding rows when shares reach zero
- `wallet` now derives the acting user from the Bearer-authenticated Supabase session, rejects mismatched `userId` values, and returns the updated `wallet_balance` from the write itself
- `wallet` enforces a server-side top-up ceiling to avoid unrealistic demo balances
- `buy-shares` and `sell-shares` now execute through transactional Postgres functions (`buy_property_shares`, `sell_property_shares`) so wallet/property/holding/transaction writes are atomic
- `bot.js` now records demo activity through transactional Postgres function `record_demo_trade` instead of inserting transactions and decrementing inventory manually
- properties now support retained ownership via `fraction_listed`, so owners can fractionalize only part of an asset while retaining the remainder
- properties now support nullable `estimated_yield` and JSON `documents` metadata for richer investment and trust signals
- transactions now store an explicit `type` of `buy` or `sell` instead of relying on naming conventions
- `market` data is synthetic but deterministic for a given property and transaction history
- market order book is simulated, not a real matching engine
- Wallet, trade, and property-listing routes now derive the acting user from the forwarded Supabase JWT instead of trusting client-supplied user IDs

---

## 13. Realtime and Market Behavior

### Realtime pieces

Using Supabase realtime subscriptions on `transactions`:
- `LiveTicker`
- `TransactionFeed`

### Synthetic market pieces

`/api/properties/[id]/market` generates:
- price history based on real transactions when available
- fallback synthetic history when transactions are sparse or absent
- 24h absolute change
- 24h percent change
- bid order book
- ask order book
- spread, mid-price, and volume-derived behavior

This means the interface looks like a trading product even though the market depth is simulated.

---

## 14. Bot Script

`bot.js` is a demo simulator.

What it does:
- reads `.env.local`
- uses the service-role key from `.env.local`
- fetches live properties
- records random demo transactions every 3 to 8 seconds through `record_demo_trade`
- atomically decrements `shares_available` in the same database function

Why it exists:
- keep the live ticker active during demos
- keep transaction feeds populated
- make the platform feel active without requiring many manual trades

---

## 15. Known Gaps and Risks

- Property images are live Unsplash URLs stored in `image_url`. PropertyCard and property detail hero render the real image when present and fall back to a gradient placeholder when empty. `next.config.ts` whitelists `images.unsplash.com`. A seed script (`scripts/seed-images.ts`) can re-apply the canonical URLs.
- Admin APIs now require an authenticated admin user and the admin client sends auth headers with every request. The `/admin` page itself is still a visible route and could be tightened further with route-level UI gating.
- Admin UI visibility is also limited client-side to an explicit allowlist of email addresses.
- `app/lib/mock-data.ts` is deprecated and can be removed.
- Stub directories exist and may mislead collaborators if assumed to be active surfaces.
- Marketplace previously crashed if API returned an error object instead of an array; frontend should be made more defensive.
- Some local dev warnings may appear from Turbopack or motion/scroll configuration and are not always production issues.

---

## 16. Prompting Guidance for Claude or Other Assistants

This section exists specifically so another model can generate precise implementation prompts.

### What an assistant should assume by default

- The frontend is already visually established; do not redesign from scratch unless explicitly asked.
- The design language is dark, premium, animated, and data-forward.
- The product already includes both investor UX and admin UX.
- The property detail page uses a trading-terminal metaphor, not a simple brochure layout.
- Shared components should be reused rather than duplicated.
- Supabase is the only backend/data/auth service in active use.

### What an assistant should preserve unless asked otherwise

- Color system
- Typography choices
- Motion style
- Route structure
- Data model names
- API contracts already present in code
- The overall tone of Landly as a modern Indian fractional property investment platform

### How to ask for frontend work effectively

When writing prompts, specify:
- target route
- whether change is visual, behavioral, or data-driven
- whether existing components must be preserved or can be restructured
- whether the change should maintain the current dark fintech visual language
- whether API contracts are allowed to change

Good prompt example:

> Update the `/property/[id]` page to add a verified-documents panel below the trading terminal. Preserve the existing dark Landly visual style, keep the current chart and order book layout, and do not change any API contracts.

Another good prompt example:

> Improve the `/dashboard` empty-state experience for new investors. Keep the current page structure, wallet header, and summary cards. Add clearer onboarding guidance and a stronger CTA to the marketplace.

### How to ask for backend work effectively

Be explicit about:
- exact route
- expected request/response shape
- whether schema changes are allowed
- whether auth enforcement is in scope
- whether existing UI depends on the current payload shape

Good prompt example:

> Harden `/api/buy-shares` by moving the multi-step wallet/property/holding/transaction write into a transactional server-side flow. Preserve the current response fields expected by the trading terminal.

### What not to assume

- Do not assume the app is unfinished or scaffold-level.
- Do not assume white backgrounds or standard dashboard card layouts are appropriate.
- Do not assume MongoDB exists anywhere meaningful in current code.
- Do not assume the admin page is secured just because it exists.
- Do not assume property images are implemented.

---

## 17. Maintenance Rule

Whenever major work is completed, update this file to reflect:
- what changed
- which routes/components/APIs were affected
- whether any prompt-writing assumptions should change

This document must stay aligned with the real codebase, not the intended roadmap.

---

Last updated: 2026-03-23
