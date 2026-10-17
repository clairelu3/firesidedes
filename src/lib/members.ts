// Hackathon "auth": remember which member you are, per family, in localStorage.
import { supabase } from './supabase'
import type { Member, Role } from './types'

const key = (familyId: string) => `family-story:member:${familyId}`

export function getSavedMemberId(familyId: string): string | null {
  try {
    return localStorage.getItem(key(familyId))
  } catch {
    return null
  }
}

/** Returns the saved member if they still exist in this family, else null. */
export async function getCurrentMember(familyId: string): Promise<Member | null> {
  const id = getSavedMemberId(familyId)
  if (!id) return null
  const { data } = await supabase.from('members').select('*').eq('id', id).eq('family_id', familyId).maybeSingle()
  return data
}

export async function joinFamily(familyId: string, name: string, role: Role = 'reader'): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ family_id: familyId, name, role })
    .select()
    .single()
  if (error) throw error
  try {
    localStorage.setItem(key(familyId), data.id)
  } catch {
    /* private mode — membership just won't be remembered */
  }
  return data
}

/** Base URL a phone can reach: VITE_PUBLIC_URL if set, else the laptop's Wi-Fi IP instead of localhost. */
export function publicBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_URL as string | undefined
  if (configured) return configured.replace(/\/$/, '')
  const { protocol, hostname, port, origin } = window.location
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocal && __LAN_IP__) return `${protocol}//${__LAN_IP__}${port ? `:${port}` : ''}`
  return origin
}

export function inviteUrl(familyId: string) {
  return `${publicBaseUrl()}/join/${familyId}`
}

export async function createFamily(input: {
  familyName: string
  storytellerName: string
  birthYear: number | null
  organizerName: string
}) {
  const { data: family, error } = await supabase
    .from('families')
    .insert({ name: input.familyName, storyteller_name: input.storytellerName, birth_year: input.birthYear })
    .select()
    .single()
  if (error) throw error
  // Whoever creates the family joins it as organizer.
  await joinFamily(family.id, input.organizerName, 'organizer')
  return family
}
