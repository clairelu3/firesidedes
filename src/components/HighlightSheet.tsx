// Family side only (the storyteller's screens stay one step each, with no gesture sheets):
// a memory highlight from the story text, opened as a bottom sheet.
// Peeks first (title, year · place, the first line); swipe up, or tap the handle or the hint, for
// the full detail, a photo and the part of her recording that tells it.
import { ChevronUp, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'
import type { AudioClip, Highlight } from '../types'
import { BottomSheet, type Detent } from './ui/BottomSheet'
import { Waveform } from './ui/AudioCard'

// Highlight state for a screen: pass `show` as useHighlightedText's onOpen (or leave it out for the
// storyteller), `activeId` to tint the open phrase, `isOpen` to hide sticky bars, and render `sheet`.
export function useHighlightSheet(from?: string) {
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  return {
    isOpen: highlight !== null,
    activeId: highlight?.id,
    show: setHighlight,
    sheet: <HighlightSheet highlight={highlight} from={from} onClose={() => setHighlight(null)} />,
  }
}

const HEIGHTS = { medium: 'max(30dvh, 260px)', large: '85dvh' }

function firstSentence(text: string) {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
}

export function HighlightSheet({ highlight, from, onClose }: { highlight: Highlight | null; from?: string; onClose: () => void }) {
  const [detent, setDetent] = useState<Detent>('medium')
  // Keep the last highlight on screen while the sheet slides away; each new one opens at the peek.
  const [last, setLast] = useState(highlight)
  if (highlight && highlight !== last) {
    setLast(highlight)
    setDetent('medium')
  }
  const h = highlight ?? last
  const meta = [h?.year, h?.place].filter(Boolean).join(' · ')

  return (
    <BottomSheet
      open={!!highlight}
      onClose={onClose}
      title={h?.title ?? ''}
      detent={detent}
      onDetentChange={setDetent}
      heights={HEIGHTS}
      dragBody
      backdropClassName="bg-ink/25"
    >
      {h && (
        <div className="font-serif">
          {meta && <p className="text-meta -mt-1">{meta}</p>}
          {detent === 'medium' ? (
            <>
              <p className="mt-3 line-clamp-2 text-[17px] leading-[1.55] text-ink">{firstSentence(h.detail)}</p>
              <button
                type="button"
                onClick={() => setDetent('large')}
                aria-expanded={false}
                className="mt-2 -ml-1 inline-flex h-9 items-center gap-1 rounded-full px-1 text-[14px] text-pine hover:underline"
              >
                <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
                Swipe up for more
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-[18px] leading-[1.7] text-ink">{h.detail}</p>
              {h.image && <img src={h.image} alt={h.title} className="mt-6 aspect-[4/3] w-full rounded-[14px] object-cover" />}
              {h.audioClip && <ClipPlayer clip={h.audioClip} label={from ? `Hear ${from} tell it` : 'Hear it in her words'} seed={h.id} />}
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

// Plays just clip.start → clip.start + clip.duration of the recording, in the letter cards' style.
function ClipPlayer({ clip, label, seed }: { clip: AudioClip; label: string; seed: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0) // seconds into the clip

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onTime = () => {
      const t = el.currentTime - clip.start
      if (t >= clip.duration) {
        el.pause()
        el.currentTime = clip.start
        setCurrent(0)
      } else setCurrent(Math.max(0, t))
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setCurrent(0)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.pause()
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [clip])

  function toggle() {
    const el = ref.current
    if (!el) return
    if (playing) return el.pause()
    if (el.currentTime < clip.start || el.currentTime >= clip.start + clip.duration) el.currentTime = clip.start
    el.play().catch((err) => console.error(err))
  }

  return (
    <div className="mt-6 rounded-[16px] border border-hairline bg-cream/60 p-3">
      <p className="text-[14px] text-pine">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <audio ref={ref} src={clip.url} preload="metadata" />
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine text-card hover:bg-pine-dark"
        >
          {playing ? <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" aria-hidden="true" />}
        </button>
        <Waveform seed={seed} progress={current / clip.duration} playing={playing} />
        <span className="w-9 shrink-0 text-right text-[13px] tabular-nums text-muted">
          {formatDuration(playing || current > 0 ? current : clip.duration)}
        </span>
      </div>
    </div>
  )
}
