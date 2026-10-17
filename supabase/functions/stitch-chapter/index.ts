// POST { family_id, life_stage_id, force? } → write (or rewrite) the draft chapter for one life stage.
// Approved chapters are locked: they are returned unchanged unless force=true.
import { callJSON } from '../_shared/claude.ts'
import { cors, db, json, loadFamilyContext } from '../_shared/context.ts'

const CHAPTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'year_range', 'sentences', 'open_questions', 'sensitive'],
  properties: {
    title: { type: 'string', description: 'Warm, specific, e.g. "The house on Zhongshan Road".' },
    year_range: { type: 'string', description: 'e.g. "1968–1975" or "around 1970".' },
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'memo_refs', 'kind', 'uncertain'],
        properties: {
          text: { type: 'string' },
          memo_refs: { type: 'array', items: { type: 'string' }, description: 'Memo refs like "m1".' },
          kind: { type: 'string', enum: ['quote', 'narration', 'connective'] },
          uncertain: { type: 'boolean' },
        },
      },
    },
    open_questions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Contradictions or gaps to ask the storyteller about, phrased as short questions to her.',
    },
    sensitive: { type: 'boolean' },
  },
}

interface Draft {
  title: string
  year_range: string
  sentences: { text: string; memo_refs: string[]; kind: 'quote' | 'narration' | 'connective'; uncertain: boolean }[]
  open_questions: string[]
  sensitive: boolean
}

const SYSTEM = `You turn a storyteller's short voice memos into one chapter of her family's book. Her children and grandchildren will read it to understand her life, so the chapter has to sound like her, not like you.

You receive her life map, her people roster, the life stage this chapter covers, and the memos anchored to that stage. Each memo has a ref (m1, m2, ...), a transcript, and its tags.

How to write:
- Keep her voice. Prefer her own words: quote her directly wherever a phrase carries her personality, and mark those sentences kind "quote". Retell other parts close to how she said them ("narration"). Add only short "connective" sentences that order events and explain context a grandchild would need (where a place is, who a person is from the roster).
- Order events chronologically within the stage.
- Every sentence lists the memo_refs it comes from. A connective sentence cites the memos it bridges. Never write a sentence with no source.
- Never invent events, names, dates, or feelings that are not in the memos or the life map. If a detail is uncertain, say so in the text ("around 1970", "she thinks it was") and set uncertain to true.
- If two memos disagree (for example, a cousin leaving in 1972 versus 1974), do not pick one. Write it neutrally and add a short question for her to open_questions.
- Set sensitive to true if any included memo is flagged sensitive.
- Write the chapter in English. Keep quotes in English translation if she spoke another language, and keep names and place names as she says them.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { family_id, life_stage_id, force } = await req.json()
    if (!family_id || !life_stage_id) return json({ error: 'family_id and life_stage_id required' }, 400)

    const { data: existing } = await db
      .from('chapters')
      .select('*')
      .eq('family_id', family_id)
      .eq('life_stage_id', life_stage_id)
      .maybeSingle()
    if (existing?.status === 'approved' && !force) return json({ chapter: existing, locked: true })

    const { data: memos } = await db
      .from('memos')
      .select('*')
      .eq('family_id', family_id)
      .eq('life_stage_id', life_stage_id)
      .eq('status', 'tagged')
      .order('created_at')
    if (!memos?.length) return json({ error: 'No tagged memos for this life stage yet' }, 400)

    const ctx = await loadFamilyContext(family_id)
    const stage = ctx.stages.find((s) => s.id === life_stage_id)
    const nameOf = new Map(ctx.people.map((p) => [p.id, p.name]))

    const refToId = new Map<string, string>()
    const memoBlocks = memos
      .map((m, i) => {
        const ref = `m${i + 1}`
        refToId.set(ref, m.id)
        const people = [...(m.people_ids ?? []).map((id: string) => nameOf.get(id)), ...(m.unmatched_people ?? [])]
        return `<memo ref="${ref}" years="${m.year_start ?? '?'}–${m.year_end ?? '?'}${m.year_is_estimate ? ' (estimate)' : ''}" place="${m.place ?? '?'}" people="${people.join(', ')}" sensitive="${m.sensitive}">
${m.transcript}
</memo>`
      })
      .join('\n\n')

    const draft = await callJSON<Draft>({
      system: SYSTEM,
      user: `${ctx.text}

<chapter_stage>${stage?.label ?? 'Unknown stage'} — ${stage?.place ?? '?'}, ${stage?.start_year ?? '?'}–${stage?.end_year ?? '?'}</chapter_stage>

<memos>
${memoBlocks}
</memos>

Write this chapter.`,
      schema: CHAPTER_SCHEMA,
      effort: 'medium',
    })

    const sentences = draft.sentences.map(({ memo_refs, ...s }) => ({
      ...s,
      memo_ids: memo_refs.map((r) => refToId.get(r)).filter(Boolean),
    }))

    const { data: chapter, error } = await db
      .from('chapters')
      .upsert(
        {
          family_id,
          life_stage_id,
          title: draft.title,
          year_range: draft.year_range,
          sentences,
          open_questions: draft.open_questions,
          memo_ids: memos.map((m) => m.id),
          sensitive: draft.sensitive || memos.some((m) => m.sensitive),
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,life_stage_id' },
      )
      .select()
      .single()
    if (error) throw error

    return json({ chapter, locked: false })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
