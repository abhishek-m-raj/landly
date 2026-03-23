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
function buildRecordedActivity(tradeRows: TradeRow[]) {
  return tradeRows.map((trade) => ({
    timestamp: trade.created_at,
    price: Math.round(trade.price * 100) / 100,
    volume: trade.quantity,
  }));
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

  // Use only recorded completed trades. Do not synthesize history for sparse listings.
  const { data: tradeRows } = await supabase
    .from('trades')
    .select('id, price, quantity, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: true })
    .limit(200)
    .returns<TradeRow[]>();

  const currentPrice = property.current_price ?? property.share_price;
  const history = buildRecordedActivity(tradeRows ?? []);
  const latestActivityAt = history.length > 0 ? history[history.length - 1].timestamp : null;

  return NextResponse.json({
    propertyId: id,
    currency: 'INR',
    currentPrice,
    transactionCount: history.length,
    latestActivityAt,
    sharesAvailable: property.shares_available,
    totalShares: property.total_shares,
    history,
  });
}
