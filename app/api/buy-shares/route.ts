import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { supabase } = authResult;
    const body = await request.json();
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

    const { data, error } = await supabase.rpc('buy_property_shares', {
      target_property_id: propertyId,
      requested_shares: shares,
    });

    if (error) {
      const status =
        error.message === 'Property not found'
          ? 404
          : error.message === 'Unauthorized'
            ? 401
            : error.message === 'Not enough shares available' ||
                error.message === 'Insufficient wallet balance' ||
                error.message === 'shares must be a positive integer' ||
                error.message === 'Property is not available for trading'
              ? 400
              : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return NextResponse.json({ error: 'Trade did not return a result' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shares purchased successfully',
      newWalletBalance: result.newWalletBalance,
      sharesRemaining: result.sharesRemaining,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
