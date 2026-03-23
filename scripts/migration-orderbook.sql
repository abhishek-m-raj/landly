-- Order Book Migration for Landly
-- Applied via Supabase MCP as three migrations:
--   1. add_orderbook_tables
--   2. add_place_order_function
--   3. add_cancel_order_function
--
-- This file documents the complete migration for reference.

-- ============================================================
-- 1. Schema Changes
-- ============================================================

-- Add current_price to properties (tracks live market price)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS current_price numeric;
UPDATE properties SET current_price = share_price WHERE current_price IS NULL;

-- Orders table (the order book)
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type text NOT NULL CHECK (order_type IN ('market', 'limit')),
  price numeric CHECK (price IS NULL OR price > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  filled_quantity integer NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'filled', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_property_side_status ON orders(property_id, side, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_matching ON orders(property_id, side, status, price, created_at);

-- Trades table (matched executions)
CREATE TABLE IF NOT EXISTS trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buy_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  sell_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  price numeric NOT NULL CHECK (price > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_property_time ON trades(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id, created_at DESC);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view orders for orderbook" ON orders FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trades for market data" ON trades FOR SELECT USING (true);

-- ============================================================
-- 2. place_order() — Matching Engine
-- ============================================================
-- See: supabase/migrations/*_add_place_order_function.sql

-- ============================================================
-- 3. cancel_order()
-- ============================================================
-- See: supabase/migrations/*_add_cancel_order_function.sql

-- ============================================================
-- 4. add_sell_pool_buyback — Sell-side pool liquidity
-- ============================================================
-- Adds symmetric pool buyback to sell side of place_order().
-- When a sell order can't match resting buy orders, shares go
-- back to the property pool at market price. If owner_id exists
-- the owner funds it; for platform-seeded properties (owner_id
-- IS NULL) the platform absorbs the cost — symmetric with buy
-- side where pool sells without an owner receiving funds.
-- See: supabase/migrations/*_add_sell_pool_buyback.sql
-- Fixed: supabase/migrations/*_fix_sell_pool_buyback_no_owner.sql
-- Fixed: supabase/migrations/*_make_buyer_id_nullable_for_pool_buyback.sql

-- ============================================================
-- 5. Supply-demand pricing for pool trades
-- ============================================================
-- After every pool trade (buy-from-pool or sell-to-pool),
-- current_price is recalculated using a quadratic supply curve:
--   price = share_price * (1 + MAX_IMPACT * (sold_fraction ^ 2))
-- where sold_fraction = (listed_shares - shares_available) / listed_shares
-- MAX_IMPACT = 1.0  →  price can at most 2× the IPO share_price
-- Buying from pool reduces supply → price rises
-- Selling to pool increases supply → price drops
-- See: supabase/migrations/*_add_supply_demand_pricing.sql

-- ============================================================
-- 6. insert_test_trades() — Admin test data injection
-- ============================================================
-- See: supabase/migrations/*_add_insert_test_trades_function.sql
-- SECURITY DEFINER function that bypasses RLS to insert synthetic trades.
