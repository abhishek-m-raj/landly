import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface SellBody {
  propertyId?: string;
  userId?: string;
  shares?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SellBody;
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

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('share_price, shares_available, total_shares')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .select('id, shares_owned, total_invested')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (holdingError) {
      return NextResponse.json({ error: holdingError.message }, { status: 500 });
    }

    if (!holding || holding.shares_owned < shares) {
      return NextResponse.json({ error: 'Not enough shares owned to sell' }, { status: 400 });
    }

    const proceeds = shares * Number(property.share_price);
    const sharesRemainingOwned = holding.shares_owned - shares;

    const { error: walletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: Number(profile.wallet_balance) + proceeds })
      .eq('id', userId);

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    const updatedSharesAvailable = Math.min(
      Number(property.total_shares),
      Number(property.shares_available) + shares
    );

    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({ shares_available: updatedSharesAvailable })
      .eq('id', propertyId);

    if (propertyUpdateError) {
      return NextResponse.json({ error: propertyUpdateError.message }, { status: 500 });
    }

    const avgCost = holding.shares_owned > 0
      ? Number(holding.total_invested) / holding.shares_owned
      : 0;
    const investmentReduction = Math.min(Number(holding.total_invested), avgCost * shares);

    if (sharesRemainingOwned === 0) {
      const { error: deleteHoldingError } = await supabase
        .from('holdings')
        .delete()
        .eq('id', holding.id);

      if (deleteHoldingError) {
        return NextResponse.json({ error: deleteHoldingError.message }, { status: 500 });
      }
    } else {
      const { error: updateHoldingError } = await supabase
        .from('holdings')
        .update({
          shares_owned: sharesRemainingOwned,
          total_invested: Math.max(0, Number(holding.total_invested) - investmentReduction),
        })
        .eq('id', holding.id);

      if (updateHoldingError) {
        return NextResponse.json({ error: updateHoldingError.message }, { status: 500 });
      }
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        property_id: propertyId,
        user_name: `${profile.full_name || 'Anonymous'} (Sell)`,
        shares,
        price_per_share: property.share_price,
        total_amount: proceeds,
      });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shares sold successfully',
      newWalletBalance: Number(profile.wallet_balance) + proceeds,
      sharesRemainingOwned,
      sharesAvailable: updatedSharesAvailable,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
