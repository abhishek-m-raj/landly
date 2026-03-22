import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { createAuthClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = createAuthClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('ensure_current_profile');

  const profile = Array.isArray(data) ? data[0] : data;

  if (error || !profile) {
    return NextResponse.json({ error: error?.message || 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ wallet_balance: Number(profile.wallet_balance || 0) });
}

export async function POST(request: Request) {
  const supabase = createAuthClient(request);
  try {
    const body = await request.json();
    const requestedUserId = typeof body.userId === 'string' ? body.userId : null;
    const amountValue = typeof body.amount === 'string' ? Number(body.amount) : body.amount;
    const addAmount = typeof amountValue === 'number' && Number.isFinite(amountValue) && amountValue > 0
      ? amountValue
      : 10000;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: 401 });
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ error: 'Authenticated user does not match request body' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('add_wallet_funds', {
      add_amount: addAmount,
    });

    const result = Array.isArray(data) ? data[0] : data;

    if (error || !result) {
      const status = error?.message === 'amount must be a positive number' ? 400 : 500;
      return NextResponse.json({ error: error?.message || 'Failed to add funds' }, { status });
    }

    return NextResponse.json({ success: true, newBalance: Number(result.newBalance || 0) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
