// Client wrappers for the AI pipeline (Supabase Edge Functions).
import { supabase } from './supabase'
import type { Chapter, Memo } from './types'

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    // Surface the function's own error message when there is one.
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error ?? error.message)
  }
  return data as T
}

/** Transcribe (if needed) + tag a memo with life stage, people, place, years, sensitivity. */
export async function processMemo(memoId: string) {
  const { memo } = await invoke<{ memo: Memo }>('process-memo', { memo_id: memoId })
  return memo
}

/** Write or rewrite the draft chapter for one life stage. Approved chapters come back locked. */
export async function stitchChapter(familyId: string, lifeStageId: string, force = false) {
  return invoke<{ chapter: Chapter; locked: boolean }>('stitch-chapter', {
    family_id: familyId,
    life_stage_id: lifeStageId,
    force,
  })
}
