import { type NextRequest, NextResponse } from "next/server";
import { parsePositiveInteger, requireAdmin } from "@/app/api/admin/_shared";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;
  const searchParams = request.nextUrl.searchParams;
  const propertyId = searchParams.get("propertyId");
  const userId = searchParams.get("userId");
  const limit = parsePositiveInteger(searchParams.get("limit"), 120, 500);

  let query = supabase
    .from("transactions")
    .select("id, user_id, property_id, user_name, shares, price_per_share, total_amount, created_at, property:properties(id, title, location)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
