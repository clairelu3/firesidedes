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

export function inviteUrl(familyId: string) {
  return `${window.location.origin}/join/${familyId}`
}
