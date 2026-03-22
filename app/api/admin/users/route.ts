import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isUserRole, parsePositiveInteger } from "@/app/api/admin/_shared";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get("role");
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = parsePositiveInteger(searchParams.get("limit"), 120, 500);

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, wallet_balance")
    .order("full_name", { ascending: true })
    .limit(limit);

  if (role && role !== "all") {
    if (!isUserRole(role)) {
      return NextResponse.json({ error: "Invalid user role filter" }, { status: 400 });
    }
    query = query.eq("role", role);
  }

  if (search.length > 0) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
