// Every memo with its transcript and AI tags, grouped by life stage (timeline) or by place.
// Each life stage can be turned into a draft chapter, which then shows up in Review.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { generateChapter, getLifeMap, listMemos } from '../api'
import type { LifeStage, Memo } from '../types'

type GroupBy = 'stage' | 'place'
type Group = { key: string; title: string; subtitle?: string; stageId?: string; memos: Memo[] }

function yearsOf(m: Memo) {
  const t = m.tags
  if (!t?.year_start) return null
  const range = t.year_end && t.year_end !== t.year_start ? `${t.year_start}–${t.year_end}` : `${t.year_start}`
  return t.year_is_estimate ? `~${range}` : range
}

function byYear(a: Memo, b: Memo) {
  return (a.tags?.year_start ?? 9999) - (b.tags?.year_start ?? 9999) || a.createdAt.localeCompare(b.createdAt)
}

function groupMemos(memos: Memo[], stages: LifeStage[], by: GroupBy): Group[] {
  if (by === 'stage') {
    const groups: Group[] = stages.map((s) => ({
      key: s.id,
      title: s.label,
      subtitle: [s.years, s.place].filter(Boolean).join(' · '),
      stageId: s.id,
      memos: memos.filter((m) => m.stageId === s.id).sort(byYear),
    }))
    const unplaced = memos.filter((m) => !m.stageId || !stages.some((s) => s.id === m.stageId))
    if (unplaced.length) groups.push({ key: 'unplaced', title: 'Not placed yet', memos: unplaced.sort(byYear) })
    return groups
  }

  const map = new Map<string, Memo[]>()
  for (const m of memos) {
    const place = m.tags?.place?.trim() || 'Unknown place'
    map.set(place, [...(map.get(place) ?? []), m])
  }
  return [...map.entries()]
    .map(([place, ms]) => ({ key: place, title: place, memos: ms.sort(byYear) }))
    .sort((a, b) => byYear(a.memos[0], b.memos[0]))
}

export default function Memories() {
  const navigate = useNavigate()
  const [memos, setMemos] = useState<Memo[] | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('stage')
  const [writing, setWriting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listMemos(), getLifeMap()])
      .then(([m, map]) => {
        setMemos(m)
        setStages(map?.stages ?? [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  async function writeChapter(stageId: string) {
    setWriting(stageId)
    setError(null)
    try {
      await generateChapter(stageId)
      navigate('/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setWriting(null)
    }
  }

  if (memos === null) return error ? <p className="text-red-700">{error}</p> : <p className="text-stone-500">Loading…</p>

  const groups = groupMemos(memos, stages, groupBy)

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Memories</h1>
        <p className="text-stone-600">
          Every recording, transcribed and placed on the timeline. Turn a life stage into a chapter when it has enough memories.
        </p>
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-1">
          {(['stage', 'place'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-md px-4 py-2 text-base font-medium ${groupBy === g ? 'bg-stone-800 text-white' : 'text-stone-700'}`}
            >
              By {g === 'stage' ? 'time period' : 'place'}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{error}</p>}
      {memos.length === 0 && <p className="text-stone-600">No recordings yet.</p>}

      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-2">
            <div>
              <h2 className="text-2xl font-semibold">{g.title}</h2>
              <p className="text-base text-stone-500">
                {[g.subtitle, `${g.memos.length} ${g.memos.length === 1 ? 'memory' : 'memories'}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            {groupBy === 'stage' && g.stageId && (
              <button
                disabled={g.memos.length === 0 || writing !== null}
                onClick={() => writeChapter(g.stageId!)}
                className="rounded-lg bg-stone-800 px-4 py-2 text-base font-semibold text-white disabled:opacity-40"
              >
                {writing === g.stageId ? 'Writing…' : 'Write chapter'}
              </button>
            )}
          </div>

          {g.memos.length === 0 && <p className="text-base text-stone-400">Nothing about this period yet.</p>}

          <ul className="space-y-3">
            {g.memos.map((m) => (
              <MemoCard key={m.id} memo={m} stageLabel={groupBy === 'place' ? stages.find((s) => s.id === m.stageId)?.label : undefined} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function MemoCard({ memo, stageLabel }: { memo: Memo; stageLabel?: string }) {
  const t = memo.tags
  const chips = [
    stageLabel,
    yearsOf(memo),
    t?.place,
    ...(t?.people ?? []),
    ...(t?.unmatched_people ?? []).map((p) => `${p} (new)`),
  ].filter(Boolean) as string[]

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{t?.summary ?? (memo.transcript ? 'Memory' : 'Not transcribed yet')}</p>
        {t?.sensitive && (
          <span title={t.sensitivity_reason ?? ''} className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-900">
            🔒 Private
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={i} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-sm text-stone-700">{c}</span>
          ))}
          {(t?.themes ?? []).map((th) => (
            <span key={th} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-800">{th}</span>
          ))}
          {t?.tone && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-sm text-purple-800">{t.tone}</span>}
        </div>
      )}

      {memo.transcript && <Transcript memo={memo} />}

      {memo.audioUrl && <audio controls src={memo.audioUrl} className="mt-3 w-full" />}
      <p className="mt-2 text-sm text-stone-400">Recorded {new Date(memo.createdAt).toLocaleString()}</p>
    </li>
  )
}

// Original-language transcript with an English translation toggle (shown only when they differ).
function Transcript({ memo }: { memo: Memo }) {
  const english = memo.tags?.transcript_en
  const hasTranslation = !!english && english.trim() !== memo.transcript?.trim()
  const [lang, setLang] = useState<'original' | 'english'>('original')
  const text = lang === 'english' && hasTranslation ? english : memo.transcript

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-base text-stone-500">
        Transcript{memo.tags?.language ? ` · ${memo.tags.language}` : ''}
      </summary>
      {hasTranslation && (
        <div className="mt-2 inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
          {(['original', 'english'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-3 py-1 font-medium ${lang === l ? 'bg-stone-800 text-white' : 'text-stone-700'}`}
            >
              {l === 'original' ? `Original${memo.tags?.language ? ` (${memo.tags.language})` : ''}` : 'English'}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-base leading-relaxed text-stone-700">{text}</p>
    </details>
  )
}
