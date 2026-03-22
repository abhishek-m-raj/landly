# Landly

Landly is a fractional real estate investing platform for India built for hackathon demos. Property owners submit listings, admins review and approve them, and investors buy or sell fractional shares through a fintech-style marketplace with live activity and portfolio tracking.

## Problem

Retail investors are usually locked out of real-estate ownership by high ticket sizes and opaque processes. Landly makes that experience feel more like a modern investment app: discover properties, track holdings, manage wallet balance, and trade small fractions instead of committing to full-property ownership.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Framer Motion
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Vercel

## Core Flows

- Investor signup and login
- Marketplace browsing and property detail pages
- Wallet funding and share purchases
- Live activity ticker and transaction feed
- Owner property submission
- Admin approval and operations console

## Local Development

Create `.env.local` with at least:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To build for production:

```bash
npm run build
npm start
```

## Demo Bot

The demo bot records synthetic purchase activity through a transactional database RPC so the live ticker and transaction feed stay active during presentations without corrupting property share counts.

Run it with:

```bash
node bot.js
```

## Team

Team Landly
