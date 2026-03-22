import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';
import { withComputedPropertyFields } from '@/app/api/properties/_shared';

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase, user } = authResult;
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(withComputedPropertyFields));
}