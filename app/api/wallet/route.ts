import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get current user's wallet balance
    // Assuming 'users' table manages this. Change to 'profiles' if needed based on schema.
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: fetchError?.message || 'User not found' }, { status: 404 });
    }

    const currentBalance = user.wallet_balance || 0;
    const newBalance = currentBalance + 10000;

    // Update balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Added ₹10000 to wallet', newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
