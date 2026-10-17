import { createClient } from 'npm:@supabase/supabase-js@2'

export const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Life map + roster for a family, rendered as text the model reads at every step. */
export async function loadFamilyContext(familyId: string) {
  const [{ data: family }, { data: stages }, { data: people }] = await Promise.all([
    db.from('families').select('*').eq('id', familyId).single(),
    db.from('life_stages').select('*').eq('family_id', familyId).order('sort_order'),
    db.from('people').select('*').eq('family_id', familyId),
  ])
  if (!family) throw new Error(`Family ${familyId} not found`)

  const lifeMap = (stages ?? [])
    .map(
      (s) =>
        `- [stage_id=${s.id}] ${s.label}: ${s.place ?? '?'}, ${s.start_year ?? '?'}–${s.end_year ?? '?'}` +
        (s.lived_with ? `; lived with ${s.lived_with}` : '') +
        (s.school_or_work ? `; ${s.school_or_work}` : ''),
    )
    .join('\n')

  const roster = (people ?? [])
    .map(
      (p) =>
        `- [person_id=${p.id}] ${p.name}` +
        (p.nicknames?.length ? ` (also called: ${p.nicknames.join(', ')})` : '') +
        (p.relationship ? ` — ${p.relationship}` : '') +
        (p.notes ? `. ${p.notes}` : ''),
    )
    .join('\n')

  const text = `<storyteller>
Name: ${family.storyteller_name ?? 'unknown'}
Born: ${family.birth_year ?? 'unknown'}
</storyteller>

<life_map>
${lifeMap || '(no life stages yet)'}
</life_map>

<people_roster>
${roster || '(no people yet)'}
</people_roster>`

  return { family, stages: stages ?? [], people: people ?? [], text }
}
