import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_shared';

export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
