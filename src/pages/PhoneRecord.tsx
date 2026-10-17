// /r — where the QR code points. One big record button; saving uploads to POST /api/memos,
// which transcribes (Whisper), tags, and places the memo on the timeline.
import { useState } from 'react'
import { type ApiMemo, type ApiStage, listStages, uploadMemo } from '../lib/qrApi'
import { useRecorder } from '../lib/useRecorder'

type Phase = 'idle' | 'review' | 'saving' | 'done' | 'error'

export default function PhoneRecord() {
  const rec = useRecorder()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ApiMemo | null>(null)
  const [stages, setStages] = useState<ApiStage[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  function stop() {
    rec.stop()
    setPhase('review')
  }

  async function save() {
    if (!rec.audio) return
    setFailure(null)
    setPhase('saving')
    try {
      const [memo, s] = await Promise.all([uploadMemo(rec.audio), listStages().catch(() => [])])
      setResult(memo)
      setStages(s)
      setPhase('done')
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  function again() {
    rec.reset()
    setResult(null)
    setPhase('idle')
  }

  const mm = String(Math.floor(rec.seconds / 60))
  const ss = String(rec.seconds % 60).padStart(2, '0')
  const tags = result?.tags

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 text-stone-900">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold">Tell one memory</h1>
          <p className="mt-1 text-lg text-stone-600">Any language. A minute or two is plenty.</p>
        </header>

        {phase === 'idle' && (
          <>
            <button
              onClick={rec.recording ? stop : rec.start}
              className={`mx-auto flex h-48 w-48 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg transition ${
                rec.recording ? 'animate-pulse bg-red-600' : 'bg-amber-700'
              }`}
            >
              {rec.recording ? `Stop  ${mm}:${ss}` : 'Record'}
            </button>
            {rec.error && <p className="text-red-700">{rec.error}</p>}
          </>
        )}

        {phase === 'review' && rec.audio && (
          <div className="flex flex-col gap-4">
            <audio controls src={URL.createObjectURL(rec.audio)} className="w-full" />
            <div className="flex gap-3">
              <button onClick={again} className="flex-1 rounded-xl border border-stone-300 bg-white py-4 text-lg">Redo</button>
              <button onClick={save} className="flex-1 rounded-xl bg-amber-700 py-4 text-lg font-semibold text-white">Save memory</button>
            </div>
          </div>
        )}

        {phase === 'saving' && (
          <p className="text-center text-lg text-stone-600 animate-pulse">Listening and placing it on your timeline…</p>
        )}

        {phase === 'done' && result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-lg font-semibold">Saved ✓</p>
              {tags?.summary && <p className="mt-1 text-stone-700">{tags.summary}</p>}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-stone-600">
                <dt>Life stage</dt>
                <dd>{stages.find((s) => s.id === result.stage_id)?.label ?? 'Not sure yet'}</dd>
                {tags?.place && <><dt>Place</dt><dd>{tags.place}</dd></>}
                {tags?.year_start && (
                  <>
                    <dt>Years</dt>
                    <dd>
                      {tags.year_is_estimate ? 'around ' : ''}
                      {tags.year_start}
                      {tags.year_end && tags.year_end !== tags.year_start ? `–${tags.year_end}` : ''}
                    </dd>
                  </>
                )}
                {!!tags?.people?.length && <><dt>People</dt><dd>{tags.people.join(', ')}</dd></>}
              </dl>
              {tags?.sensitive && (
                <p className="mt-3 rounded-lg bg-amber-100 p-2 text-sm text-amber-900">🔒 Kept private until you choose who can see it.</p>
              )}
            </div>
            <button onClick={again} className="rounded-xl bg-amber-700 py-4 text-lg font-semibold text-white">Record another</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col gap-3">
            <p className="text-red-700">Something went wrong: {failure}</p>
            <p className="text-sm text-stone-500">Your recording is still here.</p>
            <button onClick={save} className="rounded-xl bg-amber-700 py-4 text-lg font-semibold text-white">Try again</button>
          </div>
        )}
      </div>
    </main>
  )
}
