export type LifeStage = { id: string; label: string; years: string; place: string; livedWith: string }
export type Person = { id: string; name: string; nickname?: string; relation: string }
export type LifeMap = { name: string; birthYear: number; stages: LifeStage[]; people: Person[] }
// AI tags from backend/ai.py tag_memo()
export type MemoTags = {
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
}
export type Memo = { id: string; audioUrl: string; transcript?: string; createdAt: string; stageId?: string; tags?: MemoTags }
export type Passage = { text: string; memoId: string }
export type Chapter = { id: string; title: string; stageId: string; passages: Passage[]; status: 'draft' | 'approved' | 'hidden' }
