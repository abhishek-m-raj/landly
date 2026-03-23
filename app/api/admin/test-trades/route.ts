import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/app/api/admin/_shared";

export async function POST(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, user } = authResult;

  let body: { propertyId?: string; count?: number; minPrice?: number; maxPrice?: number; daysBack?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { propertyId, count = 20, minPrice, maxPrice, daysBack = 30 } = body;

  if (!propertyId || typeof propertyId !== "string") {
    return jsonError("propertyId is required");
  }

  if (count < 1 || count > 200) {
    return jsonError("count must be between 1 and 200");
  }

  if (daysBack < 1 || daysBack > 365) {
    return jsonError("daysBack must be between 1 and 365");
  }

  // Get the property to determine price range
  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("id, share_price, current_price")
    .eq("id", propertyId)
    .single();

  if (propError || !property) {
    return jsonError("Property not found", 404);
  }

  const basePrice = Number(property.current_price ?? property.share_price);
  const floor = minPrice ?? Math.round(basePrice * 0.8);
  const ceiling = maxPrice ?? Math.round(basePrice * 1.2);

  if (floor >= ceiling) {
    return jsonError("minPrice must be less than maxPrice");
  }

  const now = Date.now();
  const rangeMs = daysBack * 24 * 60 * 60 * 1000;

  // Generate trades with a random-walk price path
  const trades: Array<{ price: number; quantity: number; created_at: string }> = [];

  let currentTradePrice = floor + Math.random() * (ceiling - floor);

  for (let i = 0; i < count; i++) {
    const drift = (Math.random() - 0.48) * (ceiling - floor) * 0.08;
    currentTradePrice = Math.max(floor, Math.min(ceiling, currentTradePrice + drift));

    const timestamp = new Date(now - rangeMs + (rangeMs * i) / Math.max(count - 1, 1));
    trades.push({
      price: Math.round(currentTradePrice),
      quantity: Math.ceil(Math.random() * 5),
      created_at: timestamp.toISOString(),
    });
  }

  // Use SECURITY DEFINER function to bypass RLS and avoid FK issues
  const { data: insertedCount, error: rpcError } = await supabase.rpc("insert_test_trades", {
    p_property_id: propertyId,
    p_admin_user_id: user.id,
    p_trades: trades,
  });

  if (rpcError) {
    return jsonError(`Failed to insert trades: ${rpcError.message}`, 500);
  }

  // Update current_price to the last trade price
  const lastPrice = Math.round(currentTradePrice);
  await supabase.from("properties").update({ current_price: lastPrice }).eq("id", propertyId);

  return NextResponse.json({
    success: true,
    inserted: insertedCount ?? trades.length,
    priceRange: { min: floor, max: ceiling },
    lastPrice,
  });
}
