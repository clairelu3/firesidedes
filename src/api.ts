// All data access for the app goes through this file.
// For now everything is backed by in-memory arrays seeded from mockData.ts.
// When the backend is ready, swap each function body for a fetch() call to the
// real API — keep the signatures the same so the screens don't need to change.

import { mockChapters, mockMemos } from './mockData'
import type { Chapter, LifeMap, Memo } from './types'

let lifeMap: LifeMap | null = null
const memos: Memo[] = structuredClone(mockMemos)
const chapters: Chapter[] = structuredClone(mockChapters)

export async function saveLifeMap(map: LifeMap): Promise<LifeMap> {
  lifeMap = structuredClone(map)
  return structuredClone(lifeMap)
}

export async function getLifeMap(): Promise<LifeMap | null> {
  return lifeMap ? structuredClone(lifeMap) : null
}

export async function uploadMemo(blob: Blob): Promise<Memo> {
  const memo: Memo = {
    id: crypto.randomUUID(),
    audioUrl: URL.createObjectURL(blob),
    createdAt: new Date().toISOString(),
  }
  memos.push(memo)
  return { ...memo }
}

export async function listMemos(): Promise<Memo[]> {
  return structuredClone(memos)
}

export async function listChapters(): Promise<Chapter[]> {
  return structuredClone(chapters)
}

export async function updateChapter(
  id: string,
  changes: Partial<Omit<Chapter, 'id'>>,
): Promise<Chapter> {
  const index = chapters.findIndex((c) => c.id === id)
  if (index === -1) throw new Error(`Chapter not found: ${id}`)
  chapters[index] = { ...chapters[index], ...structuredClone(changes) }
  return structuredClone(chapters[index])
}
