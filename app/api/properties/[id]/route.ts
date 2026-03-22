import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withComputedPropertyFields } from '@/app/api/properties/_shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(withComputedPropertyFields(data));
}
