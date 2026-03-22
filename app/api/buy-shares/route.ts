import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, userId, shares } = body;

    if (!propertyId || !userId || shares == null) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, userId, shares' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(shares) || shares <= 0) {
      return NextResponse.json({ error: 'shares must be a positive integer' }, { status: 400 });
    }

    // 1. Check property exists and get authoritative share_price
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('shares_available, share_price')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.shares_available < shares) {
      return NextResponse.json({ error: 'Not enough shares available' }, { status: 400 });
    }

    // Use DB share_price as source of truth
    const totalAmount = shares * property.share_price;

    // 2. Check user/profile exists and wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (profile.wallet_balance < totalAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 3. Deduct wallet balance
    const newWalletBalance = profile.wallet_balance - totalAmount;
    const { error: walletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newWalletBalance })
      .eq('id', userId);

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    // 4. Deduct shares from property
    const sharesRemaining = property.shares_available - shares;
    const { error: sharesError } = await supabase
      .from('properties')
      .update({ shares_available: sharesRemaining })
      .eq('id', propertyId);

    if (sharesError) {
      return NextResponse.json({ error: sharesError.message }, { status: 500 });
    }

    // 5. Insert into transactions
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        property_id: propertyId,
        user_name: profile.full_name || 'Anonymous',
        shares,
        price_per_share: property.share_price,
        total_amount: totalAmount,
      });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // 6. Upsert holdings
    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('id, shares_owned, total_invested')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (existingHolding) {
      const { error: holdingError } = await supabase
        .from('holdings')
        .update({
          shares_owned: existingHolding.shares_owned + shares,
          total_invested: existingHolding.total_invested + totalAmount,
        })
        .eq('id', existingHolding.id);

      if (holdingError) {
        return NextResponse.json({ error: holdingError.message }, { status: 500 });
      }
    } else {
      const { error: holdingError } = await supabase
        .from('holdings')
        .insert({
          user_id: userId,
          property_id: propertyId,
          shares_owned: shares,
          total_invested: totalAmount,
        });

      if (holdingError) {
        return NextResponse.json({ error: holdingError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shares purchased successfully',
      newWalletBalance,
      sharesRemaining,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
