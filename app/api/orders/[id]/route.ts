import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const { supabase } = authResult;

    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: id,
    });

    if (error) {
      const msg = error.message;
      const status =
        msg === 'Order not found' ? 404 :
        msg === 'Unauthorized' ? 401 :
        msg === 'Order cannot be cancelled' ? 400 :
        500;
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
