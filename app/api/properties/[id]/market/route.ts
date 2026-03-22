import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface TxRow {
  id: string;
  shares: number;
  price_per_share: number | null;
  created_at: string;
}

interface PropertyRow {
  id: string;
  share_price: number;
  total_shares: number;
  shares_available: number;
}

interface OrderRow {
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

function buildSyntheticHistory(property: PropertyRow, txRows: TxRow[]) {
  const base = property.share_price;
  const floor = base * 0.72;
  const ceiling = base * 1.55;

  if (txRows.length === 0) {
    const points: Array<{ timestamp: string; price: number; volume: number }> = [];
    const rand = rng(seedFromId(property.id));
    const now = Date.now();
    let running = base * (0.97 + rand() * 0.04);

    for (let i = 47; i >= 0; i -= 1) {
      const at = new Date(now - i * 30 * 60 * 1000);
      const wave = Math.sin((i / 48) * Math.PI * 1.8) * 0.004;
      const noise = (rand() - 0.5) * 0.006;
      running = clampPrice(running * (1 + wave + noise), floor, ceiling);
      points.push({
        timestamp: at.toISOString(),
        price: Math.round(running * 100) / 100,
        volume: Math.max(1, Math.round((0.2 + rand()) * 5)),
      });
    }

    return points;
  }

  const sorted = [...txRows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const points: Array<{ timestamp: string; price: number; volume: number }> = [];
  let running = base * 0.94;

  for (const tx of sorted) {
    const tradePrice = tx.price_per_share ?? base;
    const demandFactor = Math.min(0.02, (tx.shares / Math.max(property.total_shares, 1)) * 50);
    const pullToTrade = ((tradePrice - running) / Math.max(running, 1)) * 0.2;
    const drift = ((new Date(tx.created_at).getUTCMinutes() % 7) - 3) * 0.0009;

    running = clampPrice(running * (1 + demandFactor + pullToTrade + drift), floor, ceiling);

    points.push({
      timestamp: tx.created_at,
      price: Math.round(running * 100) / 100,
      volume: tx.shares,
    });
  }

  if (points.length < 24) {
    const rand = rng(seedFromId(property.id));
    const firstAt = new Date(points[0].timestamp).getTime();
    const toAdd = 24 - points.length;

    for (let i = toAdd; i > 0; i -= 1) {
      const at = new Date(firstAt - i * 60 * 60 * 1000);
      const noise = (rand() - 0.5) * 0.01;
      const candidate = clampPrice(points[0].price * (1 + noise), floor, ceiling);
      points.unshift({
        timestamp: at.toISOString(),
        price: Math.round(candidate * 100) / 100,
        volume: Math.max(1, Math.round(1 + rand() * 3)),
      });
    }
  }

  return points;
}

function buildSyntheticOrderBook(
  property: PropertyRow,
  currentPrice: number,
  txRows: TxRow[]
) {
  const rand = rng(seedFromId(`${property.id}-orderbook`));
  const bids: OrderRow[] = [];
  const asks: OrderRow[] = [];

  const depth = 10;
  const tick = Math.max(1, Math.round(currentPrice * 0.002));
  const recent = txRows.slice(-20);
  const avgTradeSize = recent.length > 0
    ? recent.reduce((sum, tx) => sum + tx.shares, 0) / recent.length
    : Math.max(1, property.total_shares * 0.0015);
  const liquidityFactor = Math.max(0.3, property.shares_available / Math.max(1, property.total_shares));

  for (let i = 1; i <= depth; i += 1) {
    const bidPrice = Math.max(1, Math.round((currentPrice - i * tick) * 100) / 100);
    const askPrice = Math.round((currentPrice + i * tick) * 100) / 100;
    const baseSize = Math.max(
      2,
      Math.round(avgTradeSize * (1.4 - i / (depth + 2)) * (0.7 + liquidityFactor))
    );

    bids.push({
      id: `b-${i}`,
      side: 'bid',
      price: bidPrice,
      quantity: baseSize + Math.round(rand() * 10),
    });

    asks.push({
      id: `a-${i}`,
      side: 'ask',
      price: askPrice,
      quantity: Math.max(1, baseSize - 1) + Math.round(rand() * 10),
    });
  }

  return {
    bids,
    asks,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, share_price, total_shares, shares_available')
    .eq('id', id)
    .single<PropertyRow>();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const { data: txRows } = await supabase
    .from('transactions')
    .select('id, shares, price_per_share, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: true })
    .limit(120)
    .returns<TxRow[]>();

  const history = buildSyntheticHistory(property, txRows ?? []);
  const lastPoint = history[history.length - 1];
  const pointsForDay = history.slice(-48);
  const dayOpen = pointsForDay[0] ?? history[0] ?? { price: property.share_price };

  const currentPrice = lastPoint?.price ?? property.share_price;
  const change24hAbs = Math.round((currentPrice - dayOpen.price) * 100) / 100;
  const change24hPct = dayOpen.price > 0
    ? Math.round(((change24hAbs / dayOpen.price) * 100) * 100) / 100
    : 0;

  const synthetic = buildSyntheticOrderBook(property, currentPrice, txRows ?? []);
  const bids = synthetic.bids;
  const asks = synthetic.asks;

  const bestBid = bids[0]?.price ?? currentPrice;
  const bestAsk = asks[0]?.price ?? currentPrice;
  const spread = Math.max(0, Math.round((bestAsk - bestBid) * 100) / 100);
  const midPrice = Math.round(((bestAsk + bestBid) / 2) * 100) / 100;

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
