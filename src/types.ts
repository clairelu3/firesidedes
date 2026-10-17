export type LifeStage = { id: string; label: string; years: string; place: string; livedWith: string }
export type Person = { id: string; name: string; nickname?: string; relation: string }
export type LifeMap = { name: string; birthYear: number; stages: LifeStage[]; people: Person[] }
// AI tags from backend/ai.py tag_memo()
export type MemoTags = {
  language?: string
  transcript_en?: string // English translation; the original is Memo.transcript
  summary?: string
  place?: string | null
  year_start?: number | null
  year_end?: number | null
  year_is_estimate?: boolean
  people?: string[]
  unmatched_people?: string[]
  themes?: string[]
  tone?: string
  sensitive?: boolean
  sensitivity_reason?: string | null
  storybook?: Storybook // Storytime version, cached by the backend
}
export type StorybookPage = { text: string; text_native: string | null; illustration: string }
// Storytime movie: one continuous animation; rest_times[i] = where card i (title, pages…, end) settles.
export type StoryMovie = { url: string; rest_times: number[]; duration: number }
export type Storybook = { title: string; pages: StorybookPage[]; video?: StoryMovie }
export type Memo = { id: string; audioUrl: string; transcript?: string; createdAt: string; stageId?: string; tags?: MemoTags }
export type Passage = { text: string; memoId: string }
export type Chapter = { id: string; title: string; stageId: string; passages: Passage[]; status: 'draft' | 'approved' | 'hidden' }

// 'member' is the original role (shown as Reader); storyteller/reader need the roles SQL.
export type FamilyRole = 'organizer' | 'storyteller' | 'reader' | 'member'
export type Family = { code: string; name: string; photoUrl?: string; createdAt: string }
export type FamilyMember = { id: string; familyCode: string; name: string; role: FamilyRole; relationship?: string; createdAt: string }
