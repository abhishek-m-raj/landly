import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, userId, sharesAmount, amountPaid } = body;

    if (!propertyId || !userId || !sharesAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get current property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('shares_available')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.shares_available < sharesAmount) {
      return NextResponse.json({ error: 'Not enough shares available' }, { status: 400 });
    }

    // 2. Deduct shares
    const { error: updateError } = await supabase
      .from('properties')
      .update({ shares_available: property.shares_available - sharesAmount })
      .eq('id', propertyId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Insert into transactions
    const { error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          property_id: propertyId,
          user_id: userId,
          shares_amount: sharesAmount,
          amount_paid: amountPaid || 0,
          transaction_type: 'buy'
        }
      ]);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // 4. Insert or update holdings
    const { data: holding } = await supabase
      .from('holdings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .single();

    if (holding) {
      await supabase
        .from('holdings')
        .update({ shares: holding.shares + sharesAmount })
        .eq('id', holding.id);
    } else {
      await supabase
        .from('holdings')
        .insert([
          {
            property_id: propertyId,
            user_id: userId,
            shares: sharesAmount
          }
        ]);
    }

    return NextResponse.json({ success: true, message: 'Shares purchased successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
