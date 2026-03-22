import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerId, title, location, type, description, totalValue, totalShares, sharePrice, imageUrl } = body;

    if (!ownerId || !title || !location || !type || !totalValue || !totalShares || !sharePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        owner_id: ownerId,
        title,
        location,
        type,
        description: description || '',
        total_value: totalValue,
        total_shares: totalShares,
        shares_available: totalShares,
        share_price: sharePrice,
        image_url: imageUrl || '',
        status: 'pending',
      })
      .select('id, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      propertyId: data.id,
      status: data.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
