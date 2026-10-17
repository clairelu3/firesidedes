export type LifeStage = { id: string; label: string; years: string; place: string; livedWith: string }
export type Person = { id: string; name: string; nickname?: string; relation: string }
export type LifeMap = { name: string; birthYear: number; stages: LifeStage[]; people: Person[] }
export type Memo = { id: string; audioUrl: string; transcript?: string; createdAt: string }
export type Passage = { text: string; memoId: string }
export type Chapter = { id: string; title: string; stageId: string; passages: Passage[]; status: 'draft' | 'approved' | 'hidden' }

// 'member' is the original role (shown as Reader); storyteller/reader need the roles SQL.
export type FamilyRole = 'organizer' | 'storyteller' | 'reader' | 'member'
export type Family = { code: string; name: string; photoUrl?: string; createdAt: string }
export type FamilyMember = { id: string; familyCode: string; name: string; role: FamilyRole; relationship?: string; createdAt: string }
