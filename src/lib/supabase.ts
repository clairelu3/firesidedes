import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Placeholder values keep the app rendering (with a setup banner) before .env.local exists.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key')

export function audioUrl(path: string) {
  return supabase.storage.from('audio').getPublicUrl(path).data.publicUrl
}
