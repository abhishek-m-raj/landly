import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_shared";

interface PropertyStatusCounts {
  pending: number;
  verified: number;
  live: number;
  rejected: number;
  sold: number;
}

interface UserRoleCounts {
  investor: number;
  owner: number;
  admin: number;
}

export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;

  const [
    propertiesResult,
    usersResult,
    transactionsResult,
    holdingsResult,
    walletsResult,
  ] = await Promise.all([
    supabase.from("properties").select("status"),
    supabase.from("profiles").select("role"),
    supabase.from("transactions").select("total_amount"),
    supabase.from("holdings").select("shares_owned, total_invested"),
    supabase.from("profiles").select("wallet_balance"),
  ]);

  const firstError = [
    propertiesResult.error,
    usersResult.error,
    transactionsResult.error,
    holdingsResult.error,
    walletsResult.error,
  ].find((error) => Boolean(error));

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const propertyCounts: PropertyStatusCounts = {
    pending: 0,
    verified: 0,
    live: 0,
    rejected: 0,
    sold: 0,
  };

  for (const row of propertiesResult.data ?? []) {
    const key = row.status as keyof PropertyStatusCounts;
    if (key in propertyCounts) {
      propertyCounts[key] += 1;
    }
  }

  const userRoleCounts: UserRoleCounts = {
    investor: 0,
    owner: 0,
    admin: 0,
  };

  for (const row of usersResult.data ?? []) {
    const key = row.role as keyof UserRoleCounts;
    if (key in userRoleCounts) {
      userRoleCounts[key] += 1;
    }
  }

  const totalTransactionVolume = (transactionsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_amount ?? 0),
    0
  );

  const totalInvested = (holdingsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_invested ?? 0),
    0
  );

  const totalSharesOwned = (holdingsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.shares_owned ?? 0),
    0
  );

  const totalWalletBalance = (walletsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.wallet_balance ?? 0),
    0
  );

  return NextResponse.json({
    properties: {
      total: (propertiesResult.data ?? []).length,
      byStatus: propertyCounts,
    },
    users: {
      total: (usersResult.data ?? []).length,
      byRole: userRoleCounts,
    },
    transactions: {
      count: (transactionsResult.data ?? []).length,
      volume: totalTransactionVolume,
    },
    holdings: {
      count: (holdingsResult.data ?? []).length,
      totalInvested,
      totalSharesOwned,
    },
    wallets: {
      totalBalance: totalWalletBalance,
    },
    generatedAt: new Date().toISOString(),
  });
}
