// Shared row types — mirror supabase/schema.sql.

export type Role = 'storyteller' | 'reader' | 'organizer'

export interface Family {
  id: string
  name: string
  storyteller_name: string | null
  birth_year: number | null
  created_at: string
}

export interface Member {
  id: string
  family_id: string
  name: string
  role: Role
}

export interface LifeStage {
  id: string
  family_id: string
  label: string
  place: string | null
  start_year: number | null
  end_year: number | null
  lived_with: string | null
  school_or_work: string | null
  sort_order: number
}

export interface Person {
  id: string
  family_id: string
  name: string
  nicknames: string[]
  relationship: string | null
  notes: string | null
}

export type MemoStatus = 'uploaded' | 'processing' | 'tagged' | 'error'

export interface Memo {
  id: string
  family_id: string
  member_id: string | null
  audio_path: string | null
  duration_sec: number | null
  transcript: string | null
  language: string | null
  status: MemoStatus
  error: string | null
  summary: string | null
  life_stage_id: string | null
  place: string | null
  year_start: number | null
  year_end: number | null
  year_is_estimate: boolean
  people_ids: string[]
  unmatched_people: string[]
  events: string[]
  tone: string | null
  sensitive: boolean
  sensitivity_reason: string | null
  created_at: string
}

export interface ChapterSentence {
  text: string
  memo_ids: string[]
  kind: 'quote' | 'narration' | 'connective'
  uncertain: boolean
}

export type Audience = 'only_me' | 'my_kids' | 'whole_family' | 'future'

export interface Chapter {
  id: string
  family_id: string
  life_stage_id: string | null
  title: string
  year_range: string | null
  sentences: ChapterSentence[]
  open_questions: string[]
  memo_ids: string[]
  status: 'draft' | 'approved' | 'hidden'
  audience: Audience
  sensitive: boolean
  updated_at: string
}
