// A compact record card for short recordings: a P.S., the two spoken prompts, a voice reply.
import { LoaderCircle, Mic, Square } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../lib/format'
import { type Recording, useLetterRecorder } from '../lib/useLetterRecorder'
import { TextButton } from './ui/Button'
import { Notice } from './ui/Notice'

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
    <div className="surface-card p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={rec.recording ? stop : rec.start}
          disabled={saving}
          aria-label={rec.recording ? `Stop recording ${label}` : `Record ${label}`}
          className={`relative flex size-14 shrink-0 items-center justify-center rounded-full bg-vermilion text-white shadow-mic hover:bg-vermilion-dark disabled:opacity-70`}
        >
          {rec.recording && <span className="absolute -inset-2 rounded-full bg-vermilion/15 motion-safe:animate-halo" aria-hidden="true" />}
          {saving ? (
            <LoaderCircle size={22} strokeWidth={1.5} className="relative motion-safe:animate-spin" aria-hidden="true" />
          ) : rec.recording ? (
            <Square size={18} fill="currentColor" strokeWidth={0} className="relative" aria-hidden="true" />
          ) : (
            <Mic size={24} strokeWidth={1.5} className="relative" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-card-title">{label}</p>
          <p className="text-meta">{rec.recording ? `Recording · ${formatDuration(rec.elapsed)} · tap to stop` : saving ? 'Saving…' : hint}</p>
        </div>
      </div>
      {rec.recording && (
        <div className="mt-2 flex justify-end">
          <TextButton tone="muted" onClick={rec.forget}>
            Forget this
          </TextButton>
        </div>
      )}
      {(rec.error || error) && (
        <Notice tone="error" className="mt-3">
          {rec.error ?? error}
        </Notice>
      )}
    </div>
  )
}
