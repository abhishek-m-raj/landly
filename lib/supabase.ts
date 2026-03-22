import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a Supabase client that forwards the caller's JWT so RLS
 * sees the correct `auth.uid()`. Use in API routes.
 */
export function createAuthClient(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

/**
 * Get Authorization headers from the current Supabase session.
 * Use client-side before calling API routes that touch RLS-protected tables.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}