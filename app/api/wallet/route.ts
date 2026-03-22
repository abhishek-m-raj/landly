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

  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ wallet_balance: data.wallet_balance });
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

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: fetchError?.message || 'User not found' }, { status: 404 });
    }

    const newBalance = Number(profile.wallet_balance || 0) + addAmount;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id)
      .select('wallet_balance')
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance: Number(updatedProfile.wallet_balance || 0) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
