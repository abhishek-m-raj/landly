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

interface TxRow {
  id: string;
  price_per_share: number;
  shares: number;
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

type TimeRange = '1d' | '1w' | '1m' | '6m' | '1y' | 'all';

const RANGE_MS: Record<TimeRange, number | null> = {
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '6m': 180 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
  all: null,
};

function parseRange(value: string | null): TimeRange {
  if (value && value in RANGE_MS) return value as TimeRange;
  return 'all';
}

/**
 * Build price history from real trades + legacy transactions.
 * Returns { points, hasRealData }.
 * When there is no real trade data, hasRealData is false.
 */
function buildHistory(
  property: PropertyRow,
  tradeRows: TradeRow[],
  txRows: TxRow[],
  rangeMs: number | null,
) {
  const currentPrice = property.current_price ?? property.share_price;
  const now = Date.now();
  const cutoff = rangeMs ? now - rangeMs : 0;

  // Merge real trades and legacy transactions into one timeline
  const allPoints: Array<{ timestamp: string; price: number; volume: number }> = [];

  for (const t of tradeRows) {
    allPoints.push({
      timestamp: t.created_at,
      price: Number(t.price),
      volume: t.quantity,
    });
  }

  // If no trades exist in the new table, fall back to legacy transactions
  if (allPoints.length === 0) {
    for (const tx of txRows) {
      allPoints.push({
        timestamp: tx.created_at,
        price: Number(tx.price_per_share),
        volume: tx.shares,
      });
    }
  }

  const hasRealData = allPoints.length > 0;

  // Sort chronologically
  allPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Filter by time range
  const points = rangeMs
    ? allPoints.filter(p => new Date(p.timestamp).getTime() >= cutoff)
    : allPoints;

  // Always append a "now" point at the true current price
  const lastPoint = points[points.length - 1];
  if (!lastPoint || Math.abs(new Date(lastPoint.timestamp).getTime() - now) > 60_000) {
    points.push({ timestamp: new Date(now).toISOString(), price: currentPrice, volume: 0 });
  }

  // If we only have ≤1 data point, pad so chart can render
  if (points.length < 2) {
    const padTime = rangeMs ? now - rangeMs : now - 24 * 60 * 60 * 1000;
    points.unshift({
      timestamp: new Date(padTime).toISOString(),
      price: property.share_price,
      volume: 0,
    });
  }

  // Determine if there's actual data in the selected range
  // (excluding the synthetic "now" point and padding we just added)
  const rangeHasData = points.some(p => p.volume > 0);

  return { points, hasRealData, rangeHasData };
}

/** Aggregate orders by price level for the order book display */
function aggregateOrderBook(orders: OrderRow[], property: PropertyRow, currentPrice: number) {
  const bidMap = new Map<number, number>();
  const askMap = new Map<number, number>();

  for (const o of orders) {
    const remaining = o.quantity - o.filled_quantity;
    if (remaining <= 0) continue;
    const map = o.side === 'buy' ? bidMap : askMap;
    const price = Number(o.price);
    map.set(price, (map.get(price) ?? 0) + remaining);
  }

  // Add property pool as an ask at current price (IPO liquidity)
  if (property.shares_available > 0) {
    askMap.set(currentPrice, (askMap.get(currentPrice) ?? 0) + property.shares_available);
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  const rangeMs = RANGE_MS[range];

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
    .limit(500)
    .returns<TradeRow[]>();

  // Also fetch legacy transactions as fallback for history
  const { data: txRows } = await supabase
    .from('transactions')
    .select('id, price_per_share, shares, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: true })
    .limit(500)
    .returns<TxRow[]>();

  // Fetch open/partial orders for the order book
  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, side, price, quantity, filled_quantity')
    .eq('property_id', id)
    .in('status', ['open', 'partial'])
    .not('price', 'is', null)
    .returns<OrderRow[]>();

  const currentPrice = Number(property.current_price ?? property.share_price);
  const { points: history, hasRealData, rangeHasData } = buildHistory(property, tradeRows ?? [], txRows ?? [], rangeMs);

  // Compute the timestamp of the earliest real trade (for frontend range availability)
  const allData = (tradeRows ?? []).map(t => t.created_at);
  if (allData.length === 0) {
    for (const tx of (txRows ?? [])) allData.push(tx.created_at);
  }
  const firstTradeAt = allData.length > 0
    ? allData.reduce((a, b) => (a < b ? a : b))
    : null;

  // 24h change: use the earliest point in the last 24h window
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const pointsForDay = history.filter(p => new Date(p.timestamp).getTime() >= dayAgo);
  const dayOpenPrice = pointsForDay.length > 0
    ? pointsForDay[0].price
    : history[0]?.price ?? currentPrice;

  const change24hAbs = Math.round((currentPrice - dayOpenPrice) * 100) / 100;
  const change24hPct = dayOpenPrice > 0
    ? Math.round(((change24hAbs / dayOpenPrice) * 100) * 100) / 100
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
    hasRealData,
    rangeHasData,
    firstTradeAt,
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
