import { Check, ChevronLeft, ChevronRight, Clock, EyeOff, Map, Pencil } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { getLifeMap, getMyName, listChapters, listMemos, updateChapter } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { Button } from '../components/ui/Button'
import { LogoMark } from '../components/ui/LogoMark'
import { Divider, StoryPassages } from '../components/ui/story'
import { firstName, numberToWords, readMinutes, startYear } from '../lib/format'
import type { Chapter, LifeStage, Memo } from '../types'

const REVIEW_PANEL_HEIGHT = 150

const statusStyle: Record<Chapter['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-draft text-draft-ink' },
  approved: { label: 'Approved', className: 'bg-ember-tint text-ember' },
  hidden: { label: 'Hidden', className: 'bg-paper text-muted' },
}

export default function Chapters() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [name, setName] = useState(() => getMyName())
  const [index, setIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([listChapters(), getLifeMap(), listMemos()])
      .then(([c, map, m]) => {
        setChapters(c)
        setStages(map?.stages ?? [])
        if (map?.name) setName(map.name)
        setMemos(m)
        const firstDraft = c.findIndex((ch) => ch.status === 'draft')
        setIndex(firstDraft === -1 ? 0 : firstDraft)
      })
      .catch((err) => {
        console.error(err)
        setChapters([])
        setError(true)
      })
  }, [])

  if (chapters === null) {
    return (
      <AppShell tone="review">
        <p className="pt-10 text-center text-lg text-muted">Loading chapters…</p>
      </AppShell>
    )
  }

  if (chapters.length === 0) {
    return (
      <AppShell tone="review">
        <section className="mt-4 rounded-[28px] bg-paper px-6 py-12 text-center shadow-card">
          <LogoMark className="mx-auto h-9 w-auto text-ember" />
          <h1 className="text-display mt-5 text-[32px] text-ink">No chapters to review yet.</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-[17px] leading-normal text-muted">
            {error ? 'We couldn’t load your chapters. Check your connection and refresh.' : 'Keep recording. Postscript will write your first chapter soon.'}
          </p>
        </section>
      </AppShell>
    )
  }

  const chapter = chapters[Math.min(index, chapters.length - 1)]!
  const stage = stages.find((s) => s.id === chapter.stageId)
  const year = startYear(stage?.years)
  const audioUrl = memos.find((m) => m.id === chapter.passages[0]?.memoId)?.audioUrl
  const first = firstName(name)
  const status = statusStyle[chapter.status]

  function replaceChapter(updated: Chapter) {
    setChapters((prev) => prev && prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  function editPassage(i: number, text: string) {
    replaceChapter({ ...chapter, passages: chapter.passages.map((p, j) => (j === i ? { ...p, text } : p)) })
  }

  async function savePassages() {
    try {
      replaceChapter(await updateChapter(chapter.id, { passages: chapter.passages }))
    } catch (err) {
      console.error(err)
    }
  }

  async function setStatus(next: Chapter['status']) {
    if (!chapters) return
    setSaving(true)
    try {
      const updated = await updateChapter(chapter.id, { status: next })
      const list = chapters.map((c) => (c.id === updated.id ? updated : c))
      setChapters(list)
      setEditing(false)
      // Move on to the next draft, wrapping around; stay put if none are left.
      const i = list.indexOf(updated)
      for (let step = 1; step < list.length; step++) {
        const j = (i + step) % list.length
        if (list[j]!.status === 'draft') {
          setIndex(j)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          break
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      tone="review"
      floatingHeight={REVIEW_PANEL_HEIGHT}
      floating={
        <div className="rounded-3xl bg-paper p-5 shadow-float">
          <p className="font-serif text-lg font-semibold text-ink">Does this feel true to your memory?</p>
          <div className="mt-4 flex gap-3">
            <Button variant="field" onClick={() => setStatus('hidden')} disabled={saving} size="compact" className="w-[35%]" icon={<EyeOff size={20} aria-hidden="true" />}>
              Hide
            </Button>
            <Button onClick={() => setStatus('approved')} disabled={saving} size="compact" className="flex-1" icon={<Check size={20} strokeWidth={2.75} aria-hidden="true" />}>
              Approve chapter
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-8 items-center rounded-xl px-3 text-[13px] font-semibold ${status.className}`}>{status.label}</span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-paper px-4 text-[15px] font-semibold text-ink shadow-card hover:bg-field"
        >
          {editing ? <Check size={18} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
          {editing ? 'Done' : 'Edit chapter'}
        </button>
      </div>

      {chapters.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <PagerButton label="Previous chapter" disabled={index === 0} onClick={() => { setIndex(index - 1); setEditing(false) }}>
            <ChevronLeft size={22} aria-hidden="true" />
          </PagerButton>
          <p className="min-w-[110px] text-center text-sm font-semibold text-muted">
            {status.label} · {index + 1} of {chapters.length}
          </p>
          <PagerButton label="Next chapter" disabled={index === chapters.length - 1} onClick={() => { setIndex(index + 1); setEditing(false) }}>
            <ChevronRight size={22} aria-hidden="true" />
          </PagerButton>
        </div>
      )}

      <article className="mt-3 rounded-[28px] bg-paper px-6 py-8 shadow-card">
        <p className="text-eyebrow text-center">
          Chapter {numberToWords(index + 1)}
          {year && ` · ${year}`}
        </p>
        <h1 className="text-display mt-3 text-center text-[40px] text-ink">{chapter.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm font-medium text-muted">
          {stage?.place && (
            <span className="inline-flex items-center gap-1.5">
              <Map size={16} aria-hidden="true" />
              {stage.place}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} aria-hidden="true" />
            {readMinutes(chapter.passages)} min read
          </span>
        </div>
        <Divider className="my-7" />

        {editing ? (
          <div className="space-y-4">
            {chapter.passages.map((p, i) => (
              <AutoTextarea
                key={i}
                aria-label={`Passage ${i + 1}`}
                value={p.text}
                onChange={(e) => editPassage(i, e.target.value)}
                onBlur={savePassages}
                className="text-story w-full resize-none rounded-2xl bg-field px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              />
            ))}
          </div>
        ) : (
          <StoryPassages passages={chapter.passages} />
        )}

        {audioUrl && (
          <div className="mt-8">
            <AudioCard title={first ? `Hear ${first} tell it` : 'Hear the original recording'} audioUrl={audioUrl} variant="sand" />
          </div>
        )}
      </article>
    </AppShell>
  )
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-12 items-center justify-center rounded-full text-ink hover:bg-paper/70 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return <textarea ref={ref} rows={3} {...props} />
}
