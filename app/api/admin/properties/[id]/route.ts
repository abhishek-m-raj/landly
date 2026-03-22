import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isPropertyStatus,
  isPropertyType,
  jsonError,
  parseNumeric,
} from "@/app/api/admin/_shared";

interface PropertyPatchPayload {
  title?: string;
  location?: string;
  type?: string;
  description?: string;
  total_value?: number | string;
  total_shares?: number | string;
  shares_available?: number | string;
  share_price?: number | string;
  image_url?: string;
  status?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: PropertyPatchPayload;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const updates: Record<string, string | number> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 3) {
      return jsonError("title must be at least 3 characters");
    }
    updates.title = body.title.trim();
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string" || body.location.trim().length < 3) {
      return jsonError("location must be at least 3 characters");
    }
    updates.location = body.location.trim();
  }

  if (body.type !== undefined) {
    if (!isPropertyType(body.type)) {
      return jsonError("Invalid property type");
    }
    updates.type = body.type;
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return jsonError("description must be a string");
    }
    updates.description = body.description.trim();
  }

  if (body.image_url !== undefined) {
    if (typeof body.image_url !== "string") {
      return jsonError("image_url must be a string");
    }
    updates.image_url = body.image_url.trim();
  }

  if (body.status !== undefined) {
    if (!isPropertyStatus(body.status)) {
      return jsonError("Invalid property status");
    }
    updates.status = body.status;
  }

  const totalValue = parseNumeric(body.total_value);
  if (body.total_value !== undefined) {
    if (totalValue === null || totalValue <= 0) {
      return jsonError("total_value must be a positive number");
    }
    updates.total_value = Math.round(totalValue);
  }

  const sharePrice = parseNumeric(body.share_price);
  if (body.share_price !== undefined) {
    if (sharePrice === null || sharePrice <= 0) {
      return jsonError("share_price must be a positive number");
    }
    updates.share_price = Math.round(sharePrice);
  }

  const totalShares = parseNumeric(body.total_shares);
  if (body.total_shares !== undefined) {
    if (totalShares === null || !Number.isInteger(totalShares) || totalShares <= 0) {
      return jsonError("total_shares must be a positive integer");
    }
    updates.total_shares = totalShares;
  }

  const sharesAvailable = parseNumeric(body.shares_available);
  if (body.shares_available !== undefined) {
    if (
      sharesAvailable === null ||
      !Number.isInteger(sharesAvailable) ||
      sharesAvailable < 0
    ) {
      return jsonError("shares_available must be a non-negative integer");
    }
    updates.shares_available = sharesAvailable;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid updates provided");
  }

  if (updates.total_shares !== undefined || updates.shares_available !== undefined) {
    const { data: currentProperty, error: propertyError } = await supabase
      .from("properties")
      .select("total_shares, shares_available")
      .eq("id", id)
      .single();

    if (propertyError || !currentProperty) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const effectiveTotalShares =
      (updates.total_shares as number | undefined) ?? currentProperty.total_shares;
    const effectiveSharesAvailable =
      (updates.shares_available as number | undefined) ?? currentProperty.shares_available;

    if (effectiveSharesAvailable > effectiveTotalShares) {
      return jsonError("shares_available cannot exceed total_shares");
    }
  }

  const { data, error } = await supabase
    .from("properties")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, property: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [holdingCheck, txCheck] = await Promise.all([
    supabase
      .from("holdings")
      .select("id", { count: "exact", head: true })
      .eq("property_id", id),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("property_id", id),
  ]);

  if (holdingCheck.error || txCheck.error) {
    return NextResponse.json(
      { error: holdingCheck.error?.message || txCheck.error?.message || "Failed to validate property" },
      { status: 500 }
    );
  }

  const txCount = txCheck.count ?? 0;
  const holdingCount = holdingCheck.count ?? 0;
  if (txCount > 0 || holdingCount > 0) {
    return jsonError("Cannot delete property with existing holdings or transactions", 409);
  }

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
