import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  console.warn('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local')
}

export const supabase = createClient(url, anonKey)

export function audioUrl(path: string) {
  return supabase.storage.from('audio').getPublicUrl(path).data.publicUrl
}
