// A compact record row for short recordings: a P.S., the two spoken prompts, a voice reply.
import { LoaderCircle, Mic, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../lib/format'
import { type Recording, useLetterRecorder } from '../lib/useLetterRecorder'
import { Button } from './ui/Button'

type Props = {
  label: string
  hint?: string
  lang?: string
  onSave: (recording: Recording) => Promise<void>
}

export function MiniRecorder({ label, hint, lang = 'en-US', onSave }: Props) {
  const rec = useLetterRecorder(lang)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function stop() {
    const recording = await rec.stop()
    if (!recording) return
    setSaving(true)
    setError(null)
    try {
      await onSave(recording)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'We couldn’t save that. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl bg-field p-4">
      <p className="text-[17px] font-bold text-ink">{label}</p>
      {hint && <p className="mt-1 text-[15px] leading-normal text-muted">{hint}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {rec.recording ? (
          <>
            <Button size="compact" onClick={stop} icon={<Square size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />}>
              Stop · {formatDuration(rec.elapsed)}
            </Button>
            <Button size="compact" variant="secondary" onClick={rec.forget} icon={<Trash2 size={18} aria-hidden="true" />}>
              Forget this
            </Button>
          </>
        ) : (
          <Button
            size="compact"
            variant="secondary"
            onClick={rec.start}
            disabled={saving}
            icon={saving ? <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
          >
            {saving ? 'Saving…' : 'Record'}
          </Button>
        )}
      </div>
      {(rec.error || error) && (
        <p className="mt-3 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
          {rec.error ?? error}
        </p>
      )}
    </div>
  )
}
