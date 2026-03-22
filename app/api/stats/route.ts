import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const [propertiesResult, profilesResult] = await Promise.all([
    supabase.from('properties').select('status, total_value'),
    supabase.from('profiles').select('role'),
  ]);

  const error = propertiesResult.error || profilesResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const liveProperties = (propertiesResult.data ?? []).filter(
    (property) => property.status === 'live'
  );
  const investorCount = (profilesResult.data ?? []).filter(
    (profile) => profile.role === 'investor'
  ).length;
  const platformValue = liveProperties.reduce(
    (sum, property) => sum + Number(property.total_value ?? 0),
    0
  );

  return NextResponse.json({
    properties_listed: liveProperties.length,
    investor_count: investorCount,
    platform_value: platformValue,
    generated_at: new Date().toISOString(),
  });
}