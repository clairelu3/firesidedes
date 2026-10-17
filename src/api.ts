// All data access for the app goes through this file, backed by Supabase.
// Screens only use these functions, so the DB shape can change here without
// touching src/pages/. DB ids are integers; the app uses strings.

import { supabase } from './lib/supabase'
import { resizeImage } from './lib/image'
import type {
  Chapter,
  Family,
  FamilyMember,
  LifeMap,
  LifeStage,
  Memo,
  MemoTags,
  Passage,
  Person,
  StoryMovie,
  Storybook,
} from './types'

// Memo audio is uploaded by the backend (POST /api/memos), so there's no memos bucket constant here.
const FAMILY_PHOTOS_BUCKET = 'family-photos'
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

// TODO: this always inserts new rows, so saving the life map twice duplicates
// stages and people. Needs an update/upsert path (or a "replace all") on the backend.
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

/** Re-run transcription + AI tagging on a memo's saved audio (e.g. one saved while the backend had no OpenAI key). */
export async function reprocessMemo(memoId: string): Promise<Memo> {
  const res = await fetch(`/api/memos/${encodeURIComponent(memoId)}/reprocess`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Retry failed (${res.status})`)
  return toMemo((await res.json()) as MemoRow)
}

// For idempotent backend calls: retry once on a 5xx (e.g. a dropped Supabase connection on the backend).
async function postWithRetry(url: string): Promise<Response> {
  const res = await fetch(url, { method: 'POST' })
  if (res.status < 500) return res
  await new Promise((r) => setTimeout(r, 600))
  return fetch(url, { method: 'POST' })
}

/** Storytime: one memo as a rhyming kids' picture book. Cached on the memo; regenerate makes a new version. */
export async function makeStorybook(memoId: string, regenerate = false): Promise<Storybook> {
  const res = await postWithRetry(`/api/memos/${encodeURIComponent(memoId)}/storybook?regenerate=${regenerate}`)
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Storytime failed (${res.status})`)
  return res.json()
}

/** Storytime movie: renders the storybook as one continuous watercolor animation (~20 s to render, then cached). */
export async function makeStoryMovie(memoId: string, regenerate = false): Promise<StoryMovie> {
  const res = await postWithRetry(`/api/memos/${encodeURIComponent(memoId)}/storybook/video?regenerate=${regenerate}`)
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Movie failed (${res.status})`)
  return res.json()
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

// --- Families ---
// No real auth for the hackathon: "who am I" is a member id saved in localStorage,
// and organizer-only actions are checked in the browser. This is NOT real security —
// anyone with the anon key can write to these tables directly.

type FamilyRow = { code: string; name: string | null; photo_url: string | null; created_at: string }
type FamilyMemberRow = {
  id: number
  family_code: string
  name: string
  role: string
  relationship?: string | null // only present once the relationship column SQL has run
  created_at: string
}

const FAMILY_ROLES: FamilyMember['role'][] = ['organizer', 'storyteller', 'reader', 'member']
const IDENTITY_KEY = 'fireside-me'

const UNIQUE_VIOLATION = '23505'

function toFamily(row: FamilyRow): Family {
  return {
    code: row.code,
    name: row.name || 'Our family',
    photoUrl: row.photo_url || undefined,
    createdAt: row.created_at,
  }
}

function toFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: String(row.id),
    familyCode: row.family_code,
    name: row.name,
    role: FAMILY_ROLES.find((r) => r === row.role) ?? 'member',
    relationship: row.relationship || undefined,
    createdAt: row.created_at,
  }
}

function memberKey(code: string) {
  return `fireside-member:${code}`
}

export async function getFamily(code: string): Promise<Family | null> {
  const { data, error } = await supabase.from('families').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return data ? toFamily(data as FamilyRow) : null
}

export async function ensureFamily(code: string): Promise<Family> {
  const { error } = await supabase
    .from('families')
    .upsert({ code }, { onConflict: 'code', ignoreDuplicates: true })
  if (error) throw error
  const family = await getFamily(code)
  if (!family) throw new Error(`Family not found after creating it: ${code}`)
  return family
}

export async function listFamilyMembers(code: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_code', code)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as FamilyMemberRow[]).map(toFamilyMember)
}

async function insertMember(code: string, name: string, role: FamilyMember['role']) {
  return supabase.from('family_members').insert({ family_code: code, name, role }).select().single()
}

// The first person to join becomes the organizer. The unique partial index on
// family_members(family_code) where role = 'organizer' settles races: if someone
// else became organizer first, the insert fails and we join as a member instead.
export async function joinFamily(code: string, name: string): Promise<FamilyMember> {
  await ensureFamily(code)

  const { count, error: countError } = await supabase
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('family_code', code)
    .eq('role', 'organizer')
  if (countError) throw countError

  if (!count) {
    const { data, error } = await insertMember(code, name, 'organizer')
    if (!error) return toFamilyMember(data as FamilyMemberRow)
    if (error.code !== UNIQUE_VIOLATION) throw error
  }

  const { data, error } = await insertMember(code, name, 'member')
  if (error) throw error
  return toFamilyMember(data as FamilyMemberRow)
}

// Resizes in the browser (max 1600px, JPEG ~0.85), uploads to
// family-photos/<code>/cover.jpg and saves a cache-busted public URL on the family.
export async function uploadFamilyPhoto(code: string, file: File): Promise<string> {
  const jpeg = await resizeImage(file)
  const path = `${code}/cover.jpg`

  const { error: uploadError } = await supabase.storage
    .from(FAMILY_PHOTOS_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(FAMILY_PHOTOS_BUCKET).getPublicUrl(path)
  const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error } = await supabase.from('families').update({ photo_url: photoUrl }).eq('code', code)
  if (error) throw error
  return photoUrl
}

export function getCurrentMember(code: string): string | null {
  try {
    return localStorage.getItem(memberKey(code))
  } catch {
    return null
  }
}

export function saveCurrentMember(code: string, memberId: string) {
  try {
    localStorage.setItem(memberKey(code), memberId)
  } catch {
    // Storage unavailable — they'll be asked for their name again next visit.
  }
}

// "Who am I" across screens (header initials, which family /family opens).
// Same caveat as above: localStorage only, not real identity.
export type MyIdentity = { code: string; name: string }

export function getMyIdentity(): MyIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    return raw ? (JSON.parse(raw) as MyIdentity) : null
  } catch {
    return null
  }
}

export function saveMyIdentity(identity: MyIdentity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    // Storage unavailable — header falls back to the life map name.
  }
}

// Synchronous best guess at the current user's name: family identity first,
// then the storyteller name saved by saveLifeMap.
export function getMyName(): string | null {
  return getMyIdentity()?.name || readStoryteller()?.name || null
}
