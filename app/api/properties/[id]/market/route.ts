import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface PropertyRow {
  id: string;
  share_price: number;
  current_price: number | null;
  total_shares: number;
  shares_available: number;
}

interface TradeRow {
  id: string;
  price: number;
  quantity: number;
  created_at: string;
}

interface OrderRow {
  id: string;
  side: string;
  price: number;
  quantity: number;
  filled_quantity: number;
}

interface AggLevel {
  id: string;
  side: 'bid' | 'ask';
  price: number;
  quantity: number;
}

function seedFromId(id: string) {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) {
    seed = (seed * 31 + id.charCodeAt(i)) % 2147483647;
  }
  return seed || 1234567;
}

function rng(seedValue: number) {
  let seed = seedValue;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function clampPrice(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Build price history from real trades, padding with synthetic data if needed */
function buildHistory(property: PropertyRow, tradeRows: TradeRow[]) {
  const base = property.share_price;
  const currentPrice = property.current_price ?? base;
  const floor = base * 0.50;
  const ceiling = base * 2.0;

  const points: Array<{ timestamp: string; price: number; volume: number }> = [];

  // Use real trades
  for (const t of tradeRows) {
    points.push({
      timestamp: t.created_at,
      price: Math.round(t.price * 100) / 100,
      volume: t.quantity,
    });
  }

  // Pad with synthetic data if we have fewer than 24 points
  if (points.length < 24) {
    const rand = rng(seedFromId(property.id));
    const startPrice = points.length > 0 ? points[0].price : currentPrice;
    const startTime = points.length > 0
      ? new Date(points[0].timestamp).getTime()
      : Date.now();
    const toAdd = 24 - points.length;

    for (let i = toAdd; i > 0; i -= 1) {
      const at = new Date(startTime - i * 60 * 60 * 1000);
      const noise = (rand() - 0.5) * 0.008;
      const candidate = clampPrice(startPrice * (1 + noise), floor, ceiling);
      points.unshift({
        timestamp: at.toISOString(),
        price: Math.round(candidate * 100) / 100,
        volume: Math.max(1, Math.round(1 + rand() * 3)),
      });
    }
  }

  return points;
}

/** Aggregate orders by price level for the order book display */
function aggregateOrderBook(orders: OrderRow[], property: PropertyRow, currentPrice: number) {
  const bidMap = new Map<number, number>();
  const askMap = new Map<number, number>();

  for (const o of orders) {
    const remaining = o.quantity - o.filled_quantity;
    if (remaining <= 0) continue;
    const map = o.side === 'buy' ? bidMap : askMap;
    map.set(o.price, (map.get(o.price) ?? 0) + remaining);
  }

  // Add property pool as an ask at current price (IPO liquidity)
  if (property.shares_available > 0) {
    const poolPrice = currentPrice;
    askMap.set(poolPrice, (askMap.get(poolPrice) ?? 0) + property.shares_available);
  }

  const bids: AggLevel[] = [...bidMap.entries()]
    .sort((a, b) => b[0] - a[0]) // highest first
    .slice(0, 15)
    .map((entry, i) => ({
      id: `b-${i}`,
      side: 'bid' as const,
      price: entry[0],
      quantity: entry[1],
    }));

  const asks: AggLevel[] = [...askMap.entries()]
    .sort((a, b) => a[0] - b[0]) // lowest first
    .slice(0, 15)
    .map((entry, i) => ({
      id: `a-${i}`,
      side: 'ask' as const,
      price: entry[0],
      quantity: entry[1],
    }));

  return { bids, asks };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, share_price, current_price, total_shares, shares_available')
    .eq('id', id)
    .single<PropertyRow>();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  // Fetch real trades for price history
  const { data: tradeRows } = await supabase
    .from('trades')
    .select('id, price, quantity, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: true })
    .limit(200)
    .returns<TradeRow[]>();

  // Fetch open/partial orders for the order book
  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, side, price, quantity, filled_quantity')
    .eq('property_id', id)
    .in('status', ['open', 'partial'])
    .not('price', 'is', null)
    .returns<OrderRow[]>();

  const currentPrice = property.current_price ?? property.share_price;
  const history = buildHistory(property, tradeRows ?? []);

  // 24h change calculation
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const pointsForDay = history.filter(p => new Date(p.timestamp).getTime() >= dayAgo);
  const dayOpen = pointsForDay[0] ?? history[0] ?? { price: property.share_price };

  const change24hAbs = Math.round((currentPrice - dayOpen.price) * 100) / 100;
  const change24hPct = dayOpen.price > 0
    ? Math.round(((change24hAbs / dayOpen.price) * 100) * 100) / 100
    : 0;

  const { bids, asks } = aggregateOrderBook(orderRows ?? [], property, currentPrice);

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? currentPrice;
  const spread = bestBid > 0 ? Math.max(0, Math.round((bestAsk - bestBid) * 100) / 100) : 0;
  const midPrice = bestBid > 0
    ? Math.round(((bestAsk + bestBid) / 2) * 100) / 100
    : currentPrice;

  const totalBidVolume = bids.reduce((sum, level) => sum + level.quantity, 0);
  const totalAskVolume = asks.reduce((sum, level) => sum + level.quantity, 0);

  return NextResponse.json({
    propertyId: id,
    currency: 'INR',
    currentPrice,
    change24hAbs,
    change24hPct,
    sharesAvailable: property.shares_available,
    totalShares: property.total_shares,
    history,
    orderbook: {
      bids,
      asks,
      spread,
      midPrice,
      totalBidVolume,
      totalAskVolume,
      lastUpdated: new Date().toISOString(),
    },
  });
}
