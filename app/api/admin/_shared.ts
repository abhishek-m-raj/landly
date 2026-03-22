import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

export const PROPERTY_TYPES = ["agricultural", "residential", "commercial"] as const;
export const PROPERTY_STATUSES = ["pending", "verified", "live", "rejected", "sold"] as const;
export const USER_ROLES = ["investor", "owner", "admin"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && PROPERTY_TYPES.includes(value as PropertyType);
}

export function isPropertyStatus(value: unknown): value is PropertyStatus {
  return typeof value === "string" && PROPERTY_STATUSES.includes(value as PropertyStatus);
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function parsePositiveInteger(value: unknown, fallback: number, max: number): number {
  const candidate = Number(value);
  if (!Number.isInteger(candidate) || candidate <= 0) {
    return fallback;
  }
  return Math.min(candidate, max);
}

export function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const candidate = Number(value);
  if (!Number.isFinite(candidate)) {
    return null;
  }

  return candidate;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuthenticatedUser(request: Request) {
  const supabase = createAuthClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return jsonError(error?.message || "Unauthorized", 401);
  }

  return { supabase, user };
}

export async function requireAdmin(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase, user } = authResult;
  if (!isAdminEmail(user.email)) {
    return jsonError("Forbidden", 403);
  }

  return { supabase, user };
}
