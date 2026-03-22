import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

interface SellBody {
  propertyId?: string;
  shares?: number;
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { supabase } = authResult;
    const body = (await request.json()) as SellBody;
    const { propertyId, shares } = body;

    if (!propertyId || shares == null) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, shares' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(shares) || shares <= 0) {
      return NextResponse.json({ error: 'shares must be a positive integer' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('place_order', {
      p_property_id: propertyId,
      p_side: 'sell',
      p_order_type: 'market',
      p_price: null,
      p_quantity: shares,
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

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return NextResponse.json({ error: 'Trade did not return a result' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.filledQuantity > 0 ? 'Shares sold successfully' : 'No matching buyers found',
      newWalletBalance: result.newWalletBalance,
      filledQuantity: result.filledQuantity,
      averagePrice: result.averagePrice,
      orderId: result.orderId,
      status: result.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
