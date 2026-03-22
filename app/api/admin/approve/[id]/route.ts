import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_shared';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;
  const { id } = await params;

  const { error } = await supabase
    .from('properties')
    .update({ status: 'live' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: 'live' });
}
