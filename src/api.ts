// All data access for the app goes through this file, backed by Supabase.
// Screens only use these functions, so the DB shape can change here without
// touching src/pages/. DB ids are integers; the app uses strings.

import { supabase } from './lib/supabase'
import type { Chapter, LifeMap, LifeStage, Memo, MemoTags, Passage, Person } from './types'

const STORYTELLER_KEY = 'fireside-storyteller'

type LifeStageRow = {
  id: number
  label: string | null
  place: string | null
  start_year: number | null
  end_year: number | null
  notes: string | null
}
type PersonRow = { id: number; name: string | null; nickname: string | null; relationship: string | null }
type MemoRow = {
  id: number
  audio_url: string | null
  transcript: string | null
  created_at: string
  stage_id?: number | null
  tags?: MemoTags | null
}
type ChapterRow = { id: number; stage_id: number | null; title: string | null; body: unknown; status: string | null }

// --- mapping helpers ---

function parseYears(years: string): { start_year: number | null; end_year: number | null } {
  const found = years.match(/\d{4}/g) ?? []
  return {
    start_year: found[0] ? Number(found[0]) : null,
    end_year: found[1] ? Number(found[1]) : null,
  }
}

function formatYears(start: number | null, end: number | null): string {
  if (start && end) return `${start}–${end}`
  return String(start ?? end ?? '')
}

function toLifeStage(row: LifeStageRow): LifeStage {
  return {
    id: String(row.id),
    label: row.label ?? '',
    years: formatYears(row.start_year, row.end_year),
    place: row.place ?? '',
    livedWith: row.notes ?? '',
  }
}

function toPerson(row: PersonRow): Person {
  return {
    id: String(row.id),
    name: row.name ?? '',
    nickname: row.nickname || undefined,
    relation: row.relationship ?? '',
  }
}

function toMemo(row: MemoRow): Memo {
  return {
    id: String(row.id),
    audioUrl: row.audio_url ?? '',
    transcript: row.transcript ?? undefined,
    createdAt: row.created_at,
    stageId: row.stage_id == null ? undefined : String(row.stage_id),
    tags: row.tags ?? undefined,
  }
}

function toPassages(body: unknown): Passage[] {
  const list =
    Array.isArray(body) ? body
    : body && typeof body === 'object' && Array.isArray((body as { passages?: unknown }).passages)
      ? (body as { passages: unknown[] }).passages
      : []
  return list.map((item) => {
    const p = (item ?? {}) as { text?: unknown; memoId?: unknown; memo_id?: unknown }
    const memoId = p.memoId ?? p.memo_id
    return { text: typeof p.text === 'string' ? p.text : '', memoId: memoId == null ? '' : String(memoId) }
  })
}

function fromPassages(passages: Passage[]) {
  return passages.map((p) => {
    const memoId = Number(p.memoId)
    return { text: p.text, memoId: Number.isFinite(memoId) && p.memoId !== '' ? memoId : null }
  })
}

const STATUSES: Chapter['status'][] = ['draft', 'approved', 'hidden']

function toChapter(row: ChapterRow): Chapter {
  const status = STATUSES.find((s) => s === row.status) ?? 'draft'
  return {
    id: String(row.id),
    title: row.title ?? '',
    stageId: row.stage_id == null ? '' : String(row.stage_id),
    passages: toPassages(row.body),
    status,
  }
}

function readStoryteller(): { name: string; birthYear: number } | null {
  try {
    const raw = localStorage.getItem(STORYTELLER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoryteller(name: string, birthYear: number) {
  try {
    localStorage.setItem(STORYTELLER_KEY, JSON.stringify({ name, birthYear }))
  } catch {
    // Storage unavailable (private mode etc.) — name/birth year just won't persist.
  }
}

// --- API ---

export async function saveLifeMap(map: LifeMap): Promise<LifeMap> {
  writeStoryteller(map.name, map.birthYear)

  const stageRows = map.stages
    .filter((s) => [s.label, s.years, s.place, s.livedWith].some((v) => v.trim()))
    .map((s) => ({ label: s.label, place: s.place, notes: s.livedWith, ...parseYears(s.years) }))
  const personRows = map.people
    .filter((p) => [p.name, p.nickname ?? '', p.relation].some((v) => v.trim()))
    .map((p) => ({ name: p.name, nickname: p.nickname || null, relationship: p.relation }))

  let stages: LifeStage[] = []
  if (stageRows.length) {
    const { data, error } = await supabase.from('life_stages').insert(stageRows).select()
    if (error) throw error
    stages = (data as LifeStageRow[]).map(toLifeStage)
  }

  let people: Person[] = []
  if (personRows.length) {
    const { data, error } = await supabase.from('people').insert(personRows).select()
    if (error) throw error
    people = (data as PersonRow[]).map(toPerson)
  }

  return { name: map.name, birthYear: map.birthYear, stages, people }
}

export async function getLifeMap(): Promise<LifeMap | null> {
  const [stagesRes, peopleRes] = await Promise.all([
    supabase.from('life_stages').select('*').order('start_year', { ascending: true }),
    supabase.from('people').select('*').order('id', { ascending: true }),
  ])
  if (stagesRes.error) throw stagesRes.error
  if (peopleRes.error) throw peopleRes.error

  const storyteller = readStoryteller()
  const stages = (stagesRes.data as LifeStageRow[]).map(toLifeStage)
  const people = (peopleRes.data as PersonRow[]).map(toPerson)
  if (!storyteller && stages.length === 0 && people.length === 0) return null

  return {
    name: storyteller?.name ?? '',
    birthYear: storyteller?.birthYear ?? 0,
    stages,
    people,
  }
}

// Goes through the FastAPI backend so the memo gets transcribed (Whisper) and tagged before it's saved.
export async function uploadMemo(blob: Blob): Promise<Memo> {
  const contentType = blob.type.split(';')[0].trim() || 'audio/webm'
  const ext = contentType.includes('mp4') ? 'm4a' : contentType.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', blob, `memo.${ext}`)
  const res = await fetch('/api/memos', { method: 'POST', body: form })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Upload failed (${res.status})`)
  return toMemo((await res.json()) as MemoRow)
}

/** AI writes a draft chapter from every memo placed in this life stage. */
export async function generateChapter(stageId: string): Promise<Chapter> {
  const res = await fetch(`/api/chapters/generate?stage_id=${encodeURIComponent(stageId)}`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Chapter failed (${res.status})`)
  return toChapter((await res.json()) as ChapterRow)
}

export async function listMemos(): Promise<Memo[]> {
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as MemoRow[]).map(toMemo)
}

export async function listChapters(): Promise<Chapter[]> {
  const { data, error } = await supabase.from('chapters').select('*').order('id', { ascending: true })
  if (error) throw error
  return (data as ChapterRow[]).map(toChapter)
}

export async function updateChapter(
  id: string,
  changes: Partial<Omit<Chapter, 'id'>>,
): Promise<Chapter> {
  const patch: Partial<Omit<ChapterRow, 'id'>> = {}
  if (changes.title !== undefined) patch.title = changes.title
  if (changes.status !== undefined) patch.status = changes.status
  if (changes.stageId !== undefined) patch.stage_id = changes.stageId === '' ? null : Number(changes.stageId)
  if (changes.passages !== undefined) patch.body = fromPassages(changes.passages)

  const { data, error } = await supabase
    .from('chapters')
    .update(patch)
    .eq('id', Number(id))
    .select()
    .single()
  if (error) throw error
  return toChapter(data as ChapterRow)
}
