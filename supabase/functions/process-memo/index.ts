// POST { memo_id } → transcribe (if needed) + extract + anchor. Updates the memo row and returns it.
import { callJSON } from '../_shared/claude.ts'
import { cors, db, json, loadFamilyContext } from '../_shared/context.ts'

const nullableInt = { type: ['integer', 'null'] }
const nullableString = { type: ['string', 'null'] }

const TAG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary', 'life_stage_id', 'place', 'year_start', 'year_end', 'year_is_estimate',
    'people_ids', 'unmatched_people', 'events', 'tone', 'sensitive', 'sensitivity_reason',
  ],
  properties: {
    summary: { type: 'string', description: 'One sentence, plain English, what this memo is about.' },
    life_stage_id: { ...nullableString, description: 'stage_id from the life map, or null if truly unclear.' },
    place: nullableString,
    year_start: nullableInt,
    year_end: nullableInt,
    year_is_estimate: { type: 'boolean' },
    people_ids: { type: 'array', items: { type: 'string' }, description: 'person_ids from the roster.' },
    unmatched_people: { type: 'array', items: { type: 'string' }, description: 'People mentioned who are not in the roster.' },
    events: { type: 'array', items: { type: 'string' }, description: 'Short event labels, e.g. "moved to Taipei".' },
    tone: { type: 'string', description: 'One or two words, e.g. "nostalgic", "angry", "funny".' },
    sensitive: { type: 'boolean' },
    sensitivity_reason: nullableString,
  },
}

interface Tags {
  summary: string
  life_stage_id: string | null
  place: string | null
  year_start: number | null
  year_end: number | null
  year_is_estimate: boolean
  people_ids: string[]
  unmatched_people: string[]
  events: string[]
  tone: string
  sensitive: boolean
  sensitivity_reason: string | null
}

const SYSTEM = `You help a family preserve a parent's or grandparent's life story. The storyteller records short voice memos whenever a memory comes back; you tag each memo so it can be placed on her life timeline and later woven into chapters.

You receive the storyteller's life map (life stages with places and years), a roster of the people in her life, and one memo transcript. The transcript may mix languages (for example Mandarin and English) and may contain speech-to-text errors.

How to tag:
- life_stage_id: anchor the memo to the life stage it is about, using the stage_id values from the life map. Use clues like places, ages, schools, or who she lived with ("when we moved to Taipei" points to the Taipei stage even if no year is spoken). Use null only if nothing in the memo points to a stage.
- Years: give a year range when one is spoken or can be reasonably inferred from the life stage. Set year_is_estimate to true unless she states the year outright.
- people_ids: match people to the roster by name, nickname, or relationship ("my oldest cousin", "Ah-Ming"). Only use person_ids that appear in the roster. Put anyone you cannot match in unmatched_people, described as she refers to them.
- sensitive: true if the memo touches crime or arrests, mental illness, addiction, affairs, abuse, or family estrangement. These stay private until she decides who sees them, so lean toward flagging. Explain briefly in sensitivity_reason.
- Do not invent facts that are not in the transcript or the life map.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  let memoId: string | undefined
  try {
    ;({ memo_id: memoId } = await req.json())
    if (!memoId) return json({ error: 'memo_id required' }, 400)

    const { data: memo, error } = await db.from('memos').select('*').eq('id', memoId).single()
    if (error || !memo) return json({ error: 'memo not found' }, 404)

    await db.from('memos').update({ status: 'processing', error: null }).eq('id', memoId)

    // 1. Transcribe — the browser usually sends a live transcript; fall back to Whisper if a key is set.
    let transcript: string = memo.transcript ?? ''
    if (!transcript.trim() && memo.audio_path) transcript = await transcribeWithWhisper(memo.audio_path)
    if (!transcript.trim()) throw new Error('No transcript: browser speech recognition captured nothing and no OPENAI_API_KEY is set')

    // 2–3. Extract + anchor, with the life map and roster as context.
    const ctx = await loadFamilyContext(memo.family_id)
    const tags = await callJSON<Tags>({
      system: SYSTEM,
      user: `${ctx.text}\n\n<memo_transcript>\n${transcript}\n</memo_transcript>\n\nTag this memo.`,
      schema: TAG_SCHEMA,
      effort: 'low',
    })

    // Drop any ids the model made up.
    const stageIds = new Set(ctx.stages.map((s) => s.id))
    const personIds = new Set(ctx.people.map((p) => p.id))

    const { data: updated } = await db
      .from('memos')
      .update({
        ...tags,
        transcript,
        life_stage_id: tags.life_stage_id && stageIds.has(tags.life_stage_id) ? tags.life_stage_id : null,
        people_ids: tags.people_ids.filter((id) => personIds.has(id)),
        status: 'tagged',
      })
      .eq('id', memoId)
      .select()
      .single()

    return json({ memo: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (memoId) await db.from('memos').update({ status: 'error', error: message }).eq('id', memoId)
    return json({ error: message }, 500)
  }
})

async function transcribeWithWhisper(audioPath: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return ''
  const { data: blob, error } = await db.storage.from('audio').download(audioPath)
  if (error || !blob) throw new Error(`Could not download audio: ${error?.message}`)

  const form = new FormData()
  form.append('file', blob, audioPath.split('/').pop() ?? 'memo.webm')
  form.append('model', 'whisper-1')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Whisper failed: ${await res.text()}`)
  return (await res.json()).text ?? ''
}
