import { ChevronRight, Headphones } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLifeMap, getMyName, listChapters, listMemos } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { HeaderIconButton } from '../components/ui/Header'
import { LogoMark } from '../components/ui/LogoMark'
import { Diamond, StoryPassages } from '../components/ui/story'
import { firstName, numberToWords, startYear } from '../lib/format'
import { useAudio } from '../lib/useAudio'
import type { Chapter, LifeStage, Memo } from '../types'

type Part = { number: number; stage?: LifeStage; chapters: Chapter[] }

// Approved chapters grouped by life stage, in timeline order (getLifeMap sorts by start year).
// Chapters whose stage we can't find go in a final part.
function groupIntoParts(chapters: Chapter[], stages: LifeStage[]): Part[] {
  const parts: Part[] = []
  for (const stage of stages) {
    const inStage = chapters.filter((c) => c.stageId === stage.id)
    if (inStage.length) parts.push({ number: parts.length + 1, stage, chapters: inStage })
  }
  const known = new Set(stages.map((s) => s.id))
  const rest = chapters.filter((c) => !known.has(c.stageId))
  if (rest.length) parts.push({ number: parts.length + 1, chapters: rest })
  return parts
}

const sectionId = (c: Chapter) => `chapter-${c.id}`

function scrollToChapter(c: Chapter) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(sectionId(c))?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export default function Book() {
  const [parts, setParts] = useState<Part[] | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const [name, setName] = useState(() => getMyName())
  const [currentId, setCurrentId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listChapters(), getLifeMap(), listMemos()])
      .then(([chapters, map, m]) => {
        const approved = chapters.filter((c) => c.status === 'approved')
        const grouped = groupIntoParts(approved, map?.stages ?? [])
        setParts(grouped)
        setMemos(m)
        if (map?.name) setName(map.name)
        setCurrentId(grouped[0]?.chapters[0]?.id ?? null)
      })
      .catch((err) => {
        console.error(err)
        setParts([])
      })
  }, [])

  const ordered = parts?.flatMap((p) => p.chapters) ?? []
  const audioFor = (c: Chapter | undefined) => memos.find((m) => m.id === c?.passages[0]?.memoId)?.audioUrl || undefined

  // Track which chapter is on screen so the header's headphones play the right recording.
  const orderedKey = ordered.map((c) => c.id).join(',')
  useEffect(() => {
    if (!orderedKey) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setCurrentId(visible[0].target.getAttribute('data-chapter-id'))
      },
      { rootMargin: '-80px 0px -55% 0px' },
    )
    document.querySelectorAll('[data-chapter-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [orderedKey])

  const current = ordered.find((c) => c.id === currentId)
  const headerAudioUrl = audioFor(current)
  const { ref: headerAudioRef, playing: headerPlaying, toggle: toggleHeaderAudio } = useAudio(headerAudioUrl)
  const first = firstName(name)

  const headerAction = headerAudioUrl ? (
    <HeaderIconButton label={headerPlaying ? 'Pause this chapter’s recording' : 'Play this chapter’s recording'} active={headerPlaying} onClick={toggleHeaderAudio}>
      <Headphones size={22} aria-hidden="true" />
    </HeaderIconButton>
  ) : undefined

  if (parts === null) {
    return (
      <AppShell avatarVariant="sand">
        <p className="pt-10 text-center text-lg text-muted">Opening your book…</p>
      </AppShell>
    )
  }

  if (parts.length === 0) {
    return (
      <AppShell avatarVariant="sand">
        <section className="mt-4 rounded-[28px] bg-paper px-6 py-12 text-center shadow-card">
          <LogoMark className="mx-auto h-9 w-auto text-ember" />
          <h1 className="text-display mt-5 text-[32px] text-ink">The book is still being written</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-[17px] leading-normal text-muted">
            Your family’s book will appear here once chapters are approved.
          </p>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell avatarVariant="sand" headerAction={headerAction}>
      {headerAudioUrl && <audio ref={headerAudioRef} src={headerAudioUrl} preload="metadata" />}
      {parts.map((part, pi) => (
        <div key={part.number}>
          <PartBanner part={part} first={pi === 0} />
          {part.chapters.map((chapter) => {
            const next = ordered[ordered.indexOf(chapter) + 1]
            const audioUrl = audioFor(chapter)
            return (
              <article key={chapter.id} id={sectionId(chapter)} data-chapter-id={chapter.id} className="scroll-mt-[72px] py-10">
                <p className="text-eyebrow text-center">
                  Part {numberToWords(part.number)}
                  {part.stage?.label && ` · ${part.stage.label}`}
                </p>
                <h2 className="text-display mt-3 text-center text-[44px] text-ink">{chapter.title}</h2>
                <Diamond className="mx-auto mt-5" />

                <div className="mt-8">
                  <StoryPassages passages={chapter.passages} quoteAlign="center" />
                </div>

                {audioUrl && (
                  <div className="mt-10">
                    <AudioCard title={first ? `Hear this story in ${first}’s voice` : 'Hear the original recording'} audioUrl={audioUrl} variant="paper" />
                  </div>
                )}

                {next && (
                  <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-eyebrow">Next chapter</p>
                      <p className="text-display mt-2 text-[28px] text-ink">{next.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToChapter(next)}
                      aria-label={`Go to next chapter: ${next.title}`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-paper"
                    >
                      <ChevronRight size={22} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ))}
    </AppShell>
  )
}

function PartBanner({ part, first }: { part: Part; first: boolean }) {
  const year = startYear(part.stage?.years)
  return (
    <div className={`relative -mx-5 flex h-[300px] flex-col items-center justify-center overflow-hidden bg-ember-dark px-5 text-center ${first ? '-mt-6' : ''}`}>
      <span className="absolute -top-16 -left-40 size-[340px] rounded-full border border-parchment/15" aria-hidden="true" />
      <span className="absolute -right-36 -bottom-32 size-[360px] rounded-full border border-parchment/15" aria-hidden="true" />
      <p className="relative text-[11px] font-semibold tracking-[0.25em] text-parchment/70 uppercase">Part {numberToWords(part.number)}</p>
      <LogoMark className="relative mt-5 h-8 w-auto text-peach" />
      {year ? (
        <p className="relative mt-3 font-display text-[64px] leading-none font-semibold tracking-[-0.02em] text-parchment">{year}</p>
      ) : (
        part.stage?.label && <p className="text-display relative mt-3 text-[44px] text-parchment">{part.stage.label}</p>
      )}
      {part.stage?.place && <p className="relative mt-3 text-[13px] text-parchment/70">{part.stage.place}</p>}
    </div>
  )
}
