import { useEffect, useRef, useState } from 'react'
import { listMemos, uploadMemo } from '../api'
import type { Memo } from '../types'

export default function Record() {
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    listMemos().then(setMemos)
    // Release the mic if the user navigates away mid-recording.
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setSaving(true)
        try {
          await uploadMemo(blob)
          setMemos(await listMemos())
        } catch (e) {
          setError(`We couldn’t save that recording: ${e instanceof Error ? e.message : e}`)
        } finally {
          setSaving(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('We couldn’t reach your microphone. Please allow microphone access and try again.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }

  return (
    <div className="space-y-10">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Tell a story</h1>
        <p className="mt-2 text-xl text-stone-600">Even 1 minute is enough.</p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={saving}
          aria-pressed={recording}
          className={`flex h-48 w-48 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-400 ${
            recording ? 'animate-pulse bg-red-600' : 'bg-stone-800 hover:bg-stone-900'
          }`}
        >
          {recording ? 'Stop' : 'Record'}
        </button>
        <p className="text-lg text-stone-600" aria-live="polite">
          {recording
            ? 'Recording… tap Stop when you’re done.'
            : saving
              ? 'Listening and placing it on your timeline…'
              : 'Tap to start recording.'}
        </p>
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-lg text-red-800">{error}</p>}
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Your recordings</h2>
        {memos.length === 0 ? (
          <p className="text-stone-600">No recordings yet.</p>
        ) : (
          <ul className="space-y-3">
            {memos.map((memo) => (
              <li key={memo.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-base text-stone-500">{new Date(memo.createdAt).toLocaleString()}</p>
                {memo.transcript && <p className="mt-1">{memo.transcript}</p>}
                {memo.tags?.transcript_en && memo.tags.transcript_en.trim() !== memo.transcript?.trim() && (
                  <p className="mt-1 text-base italic text-stone-600">English: {memo.tags.transcript_en}</p>
                )}
                <audio controls src={memo.audioUrl} className="mt-3 w-full" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
