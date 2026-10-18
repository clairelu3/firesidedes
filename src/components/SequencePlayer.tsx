// Plays several recordings back to back (a letter told in pieces, or its P.S.), styled like AudioCard.
import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'

const variants = {
  sand: 'bg-sand',
  field: 'bg-field',
  paper: 'bg-paper shadow-card',
}

type Props = {
  title: string
  urls: string[]
  variant?: keyof typeof variants
  autoPlay?: boolean
  onFinished?: () => void
}

export function SequencePlayer({ title, urls, variant = 'sand', autoPlay = false, onFinished }: Props) {
  const playable = urls.filter(Boolean)
  const ref = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const wantPlay = useRef(autoPlay)
  const finished = useRef(onFinished)
  useEffect(() => {
    finished.current = onFinished
  }, [onFinished])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setCurrent(el.currentTime)
    const onEnded = () => {
      setCurrent(0)
      if (index < playable.length - 1) {
        wantPlay.current = true
        setIndex(index + 1)
      } else {
        wantPlay.current = false
        setPlaying(false)
        setIndex(0)
        finished.current?.()
      }
    }
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    if (wantPlay.current) el.play().catch(() => setPlaying(false))
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [index, playable.length])

  if (playable.length === 0) return null

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

  return (
    <div className={`flex items-center gap-4 rounded-2xl p-4 ${variants[variant]}`}>
      <audio ref={ref} src={playable[index]} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ember text-white shadow-ember hover:bg-ember-dark"
      >
        {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[17px] leading-snug font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{playable.length > 1 ? `Part ${index + 1} of ${playable.length}` : 'Original recording'}</p>
      </div>
      <span className="text-sm font-medium tabular-nums text-muted">{formatDuration(current) || '0:00'}</span>
    </div>
  )
}
