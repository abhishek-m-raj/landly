import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const { supabase } = authResult;
    const body = await request.json();
    const { propertyId, side, orderType, price, quantity } = body;

    if (!propertyId || !side || !orderType || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, side, orderType, quantity' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 });
    }

    if (!['market', 'limit'].includes(orderType)) {
      return NextResponse.json({ error: 'orderType must be market or limit' }, { status: 400 });
    }

    if (orderType === 'limit' && (!price || price <= 0)) {
      return NextResponse.json({ error: 'limit orders require a positive price' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('place_order', {
      p_property_id: propertyId,
      p_side: side,
      p_order_type: orderType,
      p_price: orderType === 'limit' ? price : null,
      p_quantity: quantity,
    });

    if (error) {
      const msg = error.message;
      const status =
        msg === 'Property not found' ? 404 :
        msg === 'Unauthorized' ? 401 :
        msg.includes('wallet') || msg.includes('shares') || msg.includes('positive') || msg.includes('not available') ? 400 :
        500;
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const { supabase, user } = authResult;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['open', 'partial'])
      .order('created_at', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
