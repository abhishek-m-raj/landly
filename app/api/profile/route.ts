import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/admin/_shared';

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { supabase } = authResult;
  const { data, error } = await supabase.rpc('ensure_current_profile');
  const profile = Array.isArray(data) ? data[0] : data;

  if (error || !profile) {
    return NextResponse.json({ error: error?.message || 'User profile not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}