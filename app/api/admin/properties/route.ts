import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isPropertyStatus, parsePositiveInteger } from "@/app/api/admin/_shared";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = parsePositiveInteger(searchParams.get("limit"), 100, 300);

  let query = supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    if (!isPropertyStatus(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
    query = query.eq("status", status);
  }

  if (search.length > 0) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
