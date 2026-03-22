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
