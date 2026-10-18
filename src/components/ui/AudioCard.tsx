// A recording as a card: thumbnail · title · "Feb 14, 2025 · 3:06" · play, waveform, duration · ⋮.
// Plays one recording or several back to back (a letter told in pieces).
import { Pause, Play } from 'lucide-react'
import { isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { formatDuration } from '../../lib/format'
import type { IllustrationSlot } from '../../lib/illustrations'
import { CardMenu, type MenuItem } from './CardMenu'
import { Illustration } from './Illustration'

type Props = {
  title: ReactNode
  meta?: string // e.g. "Feb 14, 2025"; the length is added once known
  audioUrl?: string
  urls?: string[]
  thumb?: IllustrationSlot | ReactNode | null // null = no thumbnail
  menu?: MenuItem[]
  note?: ReactNode // a small line under the meta (status, "Part 2 of 3")
  onTitleClick?: () => void // makes the title a button (e.g. open the chapter text)
  autoPlay?: boolean
  onFinished?: () => void
  children?: ReactNode // extra content inside the card, under the player
  className?: string
}

export function AudioCard({ title, meta, audioUrl, urls, thumb, menu = [], note, onTitleClick, autoPlay = false, onFinished, children, className = '' }: Props) {
  // Keyed by the URLs themselves, so a parent re-render with a new array doesn't restart playback.
  const tracksKey = (urls ?? [audioUrl ?? '']).filter(Boolean).join('\n')
  const tracks = useMemo(() => (tracksKey ? tracksKey.split('\n') : []), [tracksKey])
  const player = useSequence(tracks, autoPlay, onFinished)
  const length = formatDuration(player.duration)
  const titleText = typeof title === 'string' ? title : 'this recording'

  return (
    <article className={`surface-card relative p-3 ${className}`}>
      <div className="flex gap-4">
        {thumb !== null && thumb !== undefined && (
          <div className="size-24 shrink-0 overflow-hidden rounded-[12px]">
            {isValidElement(thumb) ? thumb : <Illustration slot={thumb as IllustrationSlot} className="size-full" />}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div className={menu.length ? 'pr-7' : ''}>
            <h3 className="text-card-title">
              {onTitleClick ? (
                <button type="button" onClick={onTitleClick} className="text-left underline-offset-4 hover:underline">
                  {title}
                </button>
              ) : (
                title
              )}
            </h3>
            {(meta || length) && <p className="text-meta mt-0.5">{[meta, length].filter(Boolean).join('  ·  ')}</p>}
            {note && <p className="text-meta mt-0.5">{note}</p>}
          </div>
          {tracks.length > 0 && (
            <div className="mt-2 flex items-center gap-3">
              {player.audio}
              <button
                type="button"
                onClick={player.toggle}
                aria-label={`${player.playing ? 'Pause' : 'Play'} ${titleText}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine text-card hover:bg-pine-dark"
              >
                {player.playing ? <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" aria-hidden="true" />}
              </button>
              <Waveform seed={titleText} progress={player.progress} playing={player.playing} />
              <span className="w-9 shrink-0 text-right font-serif text-[13px] tabular-nums text-muted">
                {player.playing || player.current > 0 ? formatDuration(player.current) : length || '0:00'}
              </span>
            </div>
          )}
        </div>
      </div>
      <CardMenu items={menu} className="top-2 right-1.5" />
      {children && <div className="mt-3 border-t border-hairline px-1 pt-3">{children}</div>}
    </article>
  )
}

// Static bars from the title (so each card has its own shape), animated while playing.
function Waveform({ seed, progress, playing }: { seed: string; progress: number; playing: boolean }) {
  const bars = useMemo(() => {
    let h = 0
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const heights: number[] = []
    for (let i = 0; i < 34; i++) {
      h = (h * 1103515245 + 12345) >>> 0
      const wave = Math.sin(i / 3) * 0.25 + 0.55
      heights.push(Math.max(0.18, Math.min(1, wave + ((h % 100) / 100 - 0.5) * 0.7)))
    }
    return heights
  }, [seed])
  return (
    <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden="true">
      {bars.map((v, i) => (
        <span
          key={i}
          className={`w-[2px] shrink-0 rounded-full ${i / bars.length < progress ? 'bg-pine' : 'bg-pine/30'} ${playing ? 'motion-safe:animate-wave' : ''}`}
          style={{ height: `${v * 100}%`, animationDelay: playing ? `${(i % 7) * 90}ms` : undefined }}
        />
      ))}
    </div>
  )
}

// One <audio> element stepping through tracks. MediaRecorder webm files report duration
// Infinity until scanned, so we seek far ahead once to make the browser compute it.
function useSequence(tracks: string[], autoPlay: boolean, onFinished?: () => void) {
  const ref = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)
  const wantPlay = useRef(autoPlay)
  const finished = useRef(onFinished)
  useEffect(() => {
    finished.current = onFinished
  }, [onFinished])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let fixing = false
    setCurrent(0)
    setDuration(null)
    const readDuration = () => {
      if (el.duration === Infinity && !fixing) {
        fixing = true
        el.currentTime = 1e101
      } else if (Number.isFinite(el.duration)) {
        setDuration(el.duration)
        if (fixing) {
          fixing = false
          el.currentTime = 0
        }
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => {
      if (!fixing) setCurrent(el.currentTime)
    }
    const onEnded = () => {
      setCurrent(0)
      if (index < tracks.length - 1) {
        wantPlay.current = true
        setIndex(index + 1)
      } else {
        wantPlay.current = false
        setPlaying(false)
        setIndex(0)
        finished.current?.()
      }
    }
    el.addEventListener('loadedmetadata', readDuration)
    el.addEventListener('durationchange', readDuration)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    if (el.readyState >= 1) readDuration()
    if (wantPlay.current) el.play().catch(() => setPlaying(false))
    return () => {
      el.removeEventListener('loadedmetadata', readDuration)
      el.removeEventListener('durationchange', readDuration)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [index, tracks])

  function toggle() {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      wantPlay.current = true
      el.play().catch((err) => console.error('Audio playback failed', err))
    } else {
      wantPlay.current = false
      el.pause()
    }
  }

  const trackProgress = duration ? Math.min(1, current / duration) : 0
  const progress = tracks.length ? (index + trackProgress) / tracks.length : 0
  const audio = tracks.length ? <audio ref={ref} src={tracks[index]} preload="metadata" /> : null
  return { audio, toggle, playing, current, duration, index, progress }
}
