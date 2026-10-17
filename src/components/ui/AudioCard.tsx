import { Pause, Play } from 'lucide-react'
import { formatDuration } from '../../lib/format'
import { useAudio } from '../../lib/useAudio'

const variants = {
  sand: 'bg-sand',
  field: 'bg-field',
  paper: 'bg-paper shadow-card',
}

export function AudioCard({ title, audioUrl, variant = 'sand' }: { title: string; audioUrl: string; variant?: keyof typeof variants }) {
  const { ref, playing, current, duration, toggle } = useAudio(audioUrl)
  const length = formatDuration(duration)
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-4 ${variants[variant]}`}>
      <audio ref={ref} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause recording' : 'Play recording'}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ember text-white shadow-ember hover:bg-ember-dark"
      >
        {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[17px] leading-snug font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">Original recording{length && ` · ${length}`}</p>
      </div>
      <span className="text-sm font-medium tabular-nums text-muted">{formatDuration(current) || '0:00'}</span>
    </div>
  )
}
