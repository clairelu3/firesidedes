import { ChevronRight, Clock, LoaderCircle, Mic, Pause, Play, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getLifeMap, getMyName, listMemos, uploadMemo } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { firstName, formatDuration, formatMemoDate, greeting, memoTitle } from '../lib/format'
import { useAudio } from '../lib/useAudio'
import type { Memo } from '../types'

type Phase = 'idle' | 'recording' | 'uploading'

const VISIBLE_MEMOS = 3

export default function Record() {
  // 'uploading' covers Kenza's `saving` state: the backend transcribes and places the memo.
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const [showAll, setShowAll] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [name, setName] = useState(() => getMyName())
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    listMemos().then(setMemos).catch((err) => console.error(err))
    getLifeMap()
      .then((map) => map?.name && setName(map.name))
      .catch((err) => console.error(err))
    // Release the mic if the user navigates away mid-recording.
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (phase !== 'recording') return
    const started = Date.now()
    const id = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 250)
    return () => window.clearInterval(id)
  }, [phase])

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
        try {
          await uploadMemo(blob)
          setMemos(await listMemos())
        } catch (err) {
          console.error(err)
          // Keep the backend's reason (e.g. missing API key) so it's easy to debug.
          setError(`We couldn’t save that recording: ${err instanceof Error ? err.message : err}`)
        } finally {
          setPhase('idle')
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setElapsed(0)
      setPhase('recording')
    } catch {
      setError('We couldn’t reach your microphone. Please allow microphone access and try again.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setPhase('uploading')
  }

  const first = firstName(name)
  const visible = showAll ? memos : memos.slice(0, VISIBLE_MEMOS)
  const recording = phase === 'recording'

  return (
    <AppShell>
      <PageHeader
        eyebrow={first ? `${greeting()}, ${first}` : greeting()}
        title="What’s on your mind?"
        subtitle="Tell it the way you remember it. Fireside will help with the rest."
      />

      <section className="rounded-[28px] bg-paper px-6 py-8 text-center shadow-card">
        <h2 className="text-display text-[30px] text-ink">Record a memory</h2>
        <p className="mt-2 text-base leading-normal text-muted">Share any moment you want your family to remember.</p>

        <div className="relative mx-auto mt-6 flex size-[220px] items-center justify-center">
          <span className={`absolute size-[220px] rounded-full bg-ember/[0.06] ${recording ? 'motion-safe:animate-halo [animation-delay:300ms]' : ''}`} aria-hidden="true" />
          <span className={`absolute size-[180px] rounded-full bg-ember/15 ${recording ? 'motion-safe:animate-halo' : ''}`} aria-hidden="true" />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={phase === 'uploading'}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
            aria-pressed={recording}
            className="relative flex size-[140px] items-center justify-center rounded-full bg-ember text-white shadow-ember transition-colors hover:bg-ember-dark disabled:opacity-80"
          >
            {phase === 'idle' && <Mic size={48} strokeWidth={1.75} aria-hidden="true" />}
            {phase === 'recording' && <Square size={40} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
            {phase === 'uploading' && <LoaderCircle size={44} className="motion-safe:animate-spin" aria-hidden="true" />}
          </button>
        </div>

        <div className="mt-4" aria-live="polite">
          {phase === 'idle' && (
            <>
              <p className="text-lg font-bold text-ink">Tap to start</p>
              <p className="mt-1 text-base text-muted">Even 1 minute is enough.</p>
            </>
          )}
          {phase === 'recording' && (
            <>
              <p className="text-2xl font-bold tabular-nums text-ink">{formatDuration(elapsed)}</p>
              <p className="mt-1 text-base text-muted">Tap to stop</p>
            </>
          )}
          {phase === 'uploading' && (
            <>
              <p className="text-lg font-bold text-ink">Listening…</p>
              <p className="mt-1 text-base text-muted">Placing it on your timeline. This can take a moment.</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-display text-[26px] text-ink">Your recent memories</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              {memos.length} {memos.length === 1 ? 'recording' : 'recordings'}
            </p>
          </div>
          {memos.length > VISIBLE_MEMOS && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="-mr-2 flex h-12 shrink-0 items-center gap-0.5 rounded-xl px-2 text-base font-semibold text-ember hover:bg-ember-tint/50"
            >
              {showAll ? 'Show less' : 'See all'}
              <ChevronRight size={18} strokeWidth={2.5} className={showAll ? '-rotate-90' : ''} aria-hidden="true" />
            </button>
          )}
        </div>

        {memos.length === 0 && phase !== 'uploading' ? (
          <Card>
            <p className="text-center text-base text-muted">Your memories will show up here.</p>
          </Card>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-paper shadow-card">
            {phase === 'uploading' && (
              <li className="flex h-20 items-center gap-4 px-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-field text-ember">
                  <Clock size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold text-ink">Saving your memory…</p>
                  <p className="text-sm text-muted">Just now · {formatDuration(elapsed)}</p>
                </div>
              </li>
            )}
            {visible.map((memo) => (
              <MemoRow
                key={memo.id}
                memo={memo}
                active={playingId === memo.id}
                onActivate={() => setPlayingId(memo.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}

function MemoRow({ memo, active, onActivate }: { memo: Memo; active: boolean; onActivate: () => void }) {
  const { ref, playing, duration, toggle, pause } = useAudio(memo.audioUrl || undefined)

  // Only one memo plays at a time.
  useEffect(() => {
    if (!active) pause()
  }, [active, pause])

  const title = memoTitle(memo.transcript, memo.createdAt)
  const length = formatDuration(duration)
  const english = memo.tags?.transcript_en?.trim()
  const showEnglish = english && english !== memo.transcript?.trim()

  return (
    <li className="flex min-h-20 items-center gap-2 py-3 pr-2 pl-4">
      {memo.audioUrl && <audio ref={ref} src={memo.audioUrl} preload="metadata" />}
      <button
        type="button"
        onClick={() => {
          if (!playing) onActivate()
          toggle()
        }}
        disabled={!memo.audioUrl}
        aria-label={`${playing ? 'Pause' : 'Play'} ${title}`}
        className="flex min-w-0 flex-1 items-center gap-4 self-stretch text-left"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-field text-ember">
          {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold text-ink">{title}</span>
          {showEnglish && <span className="block truncate text-sm italic text-ink/70">English: {english}</span>}
          <span className="block truncate text-sm text-muted">
            {formatMemoDate(memo.createdAt)}
            {length && ` · ${length}`}
          </span>
        </span>
      </button>
      {memo.transcript && !memo.transcript.startsWith('[stub') && !memo.tags?.sensitive && (
        <Link
          to={`/storytime/${memo.id}`}
          aria-label={`Storytime: make ${title} into a kids' storybook`}
          title="Storytime"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ember hover:bg-ember-tint/60"
        >
          <Sparkles size={22} aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}
