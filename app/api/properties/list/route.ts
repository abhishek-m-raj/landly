import { NextResponse } from 'next/server';
import {
  isPropertyType,
  jsonError,
  parseNumeric,
  requireAuthenticatedUser,
} from '@/app/api/admin/_shared';

interface ListPropertyBody {
  title?: string;
  location?: string;
  type?: string;
  description?: string;
  totalValue?: number | string;
  totalShares?: number | string;
  sharePrice?: number | string;
  imageUrl?: string;
  fractionPercent?: number | string;
  estimatedYield?: number | string | null;
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { supabase, user } = authResult;
    const body = (await request.json()) as ListPropertyBody;
    const title = body.title?.trim();
    const location = body.location?.trim();
    const description = body.description?.trim() ?? '';
    const imageUrl = body.imageUrl?.trim() ?? '';
    const totalValue = parseNumeric(body.totalValue);
    const totalSharesValue = parseNumeric(body.totalShares);
    const sharePrice = parseNumeric(body.sharePrice);
    const fractionPercentValue = body.fractionPercent === undefined
      ? 60
      : parseNumeric(body.fractionPercent);
    const estimatedYield = parseNumeric(body.estimatedYield);

    if (!title || !location || !body.type || totalValue === null || totalSharesValue === null || sharePrice === null) {
      return jsonError('Missing required fields');
    }

    if (!isPropertyType(body.type)) {
      return jsonError('Invalid property type');
    }

    if (!Number.isInteger(totalSharesValue) || totalSharesValue <= 0) {
      return jsonError('totalShares must be a positive integer');
    }

    if (totalValue <= 0 || sharePrice <= 0) {
      return jsonError('totalValue and sharePrice must be positive numbers');
    }

    if (
      fractionPercentValue === null ||
      !Number.isInteger(fractionPercentValue) ||
      fractionPercentValue < 1 ||
      fractionPercentValue > 100
    ) {
      return jsonError('fractionPercent must be an integer between 1 and 100');
    }

    if (estimatedYield !== null && (estimatedYield < 0 || estimatedYield > 100)) {
      return jsonError('estimatedYield must be between 0 and 100');
    }

    const sharesAvailable = Math.floor((totalSharesValue * fractionPercentValue) / 100);
    if (sharesAvailable < 1) {
      return jsonError('fractionPercent is too low for the chosen totalShares');
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
        type: body.type,
        description,
        total_value: totalValue,
        total_shares: totalSharesValue,
        shares_available: sharesAvailable,
        share_price: sharePrice,
        image_url: imageUrl,
        fraction_listed: fractionPercentValue,
        estimated_yield: estimatedYield === null ? null : Math.round(estimatedYield * 100) / 100,
        status: 'pending',
      })
      .select('id, status, shares_available, fraction_listed, estimated_yield')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      propertyId: data.id,
      status: data.status,
      sharesAvailable: data.shares_available,
      fractionListed: data.fraction_listed,
      estimatedYield: data.estimated_yield,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
