import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ wallet_balance: data.wallet_balance });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: fetchError?.message || 'User not found' }, { status: 404 });
    }

    const newBalance = (profile.wallet_balance || 0) + 10000;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
