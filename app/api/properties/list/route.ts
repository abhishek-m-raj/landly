import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { supabase, user } = authResult;
    const body = await request.json();
    const { title, location, type, description, totalValue, totalShares, sharePrice, imageUrl } = body;

    if (!title || !location || !type || !totalValue || !totalShares || !sharePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase.rpc('ensure_current_profile');

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        owner_id: user.id,
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
