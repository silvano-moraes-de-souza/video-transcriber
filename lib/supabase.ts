import { createClient } from '@supabase/supabase-js'

export function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SECRET_KEY.')
  return createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } })
}
