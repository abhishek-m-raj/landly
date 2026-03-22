import { NextResponse } from "next/server";
import { isUserRole, jsonError, parseNumeric, requireAdmin } from "@/app/api/admin/_shared";

interface UserPatchPayload {
  full_name?: string;
  role?: string;
  wallet_balance?: number | string;
  wallet_adjustment?: number | string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;
  const { id } = await params;

  let body: UserPatchPayload;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const updates: Record<string, string | number> = {};

  if (body.full_name !== undefined) {
    if (typeof body.full_name !== "string" || body.full_name.trim().length < 2) {
      return jsonError("full_name must be at least 2 characters");
    }
    updates.full_name = body.full_name.trim();
  }

  if (body.role !== undefined) {
    if (!isUserRole(body.role)) {
      return jsonError("Invalid role value");
    }
    updates.role = body.role;
  }

  if (body.wallet_balance !== undefined && body.wallet_adjustment !== undefined) {
    return jsonError("Provide either wallet_balance or wallet_adjustment, not both");
  }

  const walletBalance = parseNumeric(body.wallet_balance);
  if (body.wallet_balance !== undefined) {
    if (walletBalance === null || walletBalance < 0) {
      return jsonError("wallet_balance must be a non-negative number");
    }
    updates.wallet_balance = Math.round(walletBalance);
  }

  const walletAdjustment = parseNumeric(body.wallet_adjustment);
  if (body.wallet_adjustment !== undefined) {
    if (walletAdjustment === null || walletAdjustment === 0) {
      return jsonError("wallet_adjustment must be a non-zero number");
    }

    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextBalance = current.wallet_balance + walletAdjustment;
    if (nextBalance < 0) {
      return jsonError("wallet adjustment cannot make balance negative");
    }

    updates.wallet_balance = Math.round(nextBalance);
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid updates provided");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("id, email, full_name, role, wallet_balance")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}
