// /join/:familyId — where the family QR code points.
// Not in the family yet → enter your name to join. Already in → straight to the record button.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { processMemo } from '../lib/ai'
import { getCurrentMember, joinFamily } from '../lib/members'
import { supabase } from '../lib/supabase'
import type { Family, LifeStage, Member, Memo, Person, Role } from '../lib/types'
import { speechSupported, useRecorder } from '../lib/useRecorder'

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-TW', label: '中文 (台灣)' },
  { code: 'zh-CN', label: '中文 (普通话)' },
  { code: 'es-MX', label: 'Español' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'tl-PH', label: 'Tagalog' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'fr-FR', label: 'Français' },
]

export default function JoinRecord() {
  const { familyId } = useParams<{ familyId: string }>()
  const [family, setFamily] = useState<Family | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!familyId) return
    ;(async () => {
      const { data } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
      if (!data) {
        setNotFound(true)
      } else {
        setFamily(data)
        setMember(await getCurrentMember(familyId))
      }
      setLoading(false)
    })()
  }, [familyId])

  if (loading) return <Shell><p className="text-stone-500">Loading…</p></Shell>
  if (notFound || !family) return <Shell><p className="text-stone-700">This invite link isn't valid. Ask your family for a new QR code.</p></Shell>
  if (!member) return <JoinForm family={family} onJoined={setMember} />
  return <Recorder family={family} member={member} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 text-stone-900">
      <div className="mx-auto flex max-w-md flex-col gap-6">{children}</div>
    </main>
  )
}

function JoinForm({ family, onJoined }: { family: Family; onJoined: (m: Member) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('storyteller')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      onJoined(await joinFamily(family.id, name.trim(), role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join')
      setSaving(false)
    }
  }

  return (
    <Shell>
      <header>
        <p className="text-sm uppercase tracking-wide text-amber-800">You're invited</p>
        <h1 className="text-3xl font-semibold">Join {family.name}</h1>
      </header>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-lg">
          Your name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg"
            placeholder="e.g. Mom, Grandpa Lin, Claire"
          />
        </label>
        <fieldset className="flex flex-col gap-2 text-lg">
          <legend className="mb-1">I'm here to…</legend>
          {([
            ['storyteller', 'Tell my stories'],
            ['reader', 'Read and listen'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3">
              <input type="radio" name="role" checked={role === value} onChange={() => setRole(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={saving || !name.trim()} className="rounded-xl bg-amber-700 px-4 py-4 text-lg font-semibold text-white disabled:opacity-50">
          {saving ? 'Joining…' : 'Join family'}
        </button>
      </form>
    </Shell>
  )
}

type Phase = 'idle' | 'review' | 'uploading' | 'tagging' | 'done' | 'error'

function Recorder({ family, member }: { family: Family; member: Member }) {
  const [lang, setLang] = useState(() => LANGUAGES.find((l) => l.code === navigator.language)?.code ?? 'en-US')
  const rec = useRecorder(lang)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Memo | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [savedMemoId, setSavedMemoId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('life_stages').select('*').eq('family_id', family.id).then(({ data }) => setStages(data ?? []))
    supabase.from('people').select('*').eq('family_id', family.id).then(({ data }) => setPeople(data ?? []))
  }, [family.id])

  function stop() {
    rec.stop()
    setPhase('review')
  }

  async function save() {
    if (!rec.audio) return
    setFailure(null)
    try {
      // Upload already succeeded on a previous try → only retry the tagging.
      if (savedMemoId) {
        setPhase('tagging')
        setResult(await processMemo(savedMemoId))
        setPhase('done')
        return
      }
      setPhase('uploading')
      const memoId = crypto.randomUUID()
      const ext = rec.audio.type.includes('mp4') ? 'm4a' : rec.audio.type.includes('ogg') ? 'ogg' : 'webm'
      const path = `${family.id}/${memoId}.${ext}`

      const up = await supabase.storage.from('audio').upload(path, rec.audio, { contentType: rec.audio.type })
      if (up.error) throw up.error

      const ins = await supabase.from('memos').insert({
        id: memoId,
        family_id: family.id,
        member_id: member.id,
        audio_path: path,
        duration_sec: rec.seconds,
        transcript: rec.transcript.trim() || null,
        language: lang,
      })
      if (ins.error) throw ins.error
      setSavedMemoId(memoId)

      setPhase('tagging')
      setResult(await processMemo(memoId))
      setPhase('done')
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  function again() {
    rec.reset()
    setResult(null)
    setSavedMemoId(null)
    setPhase('idle')
  }

  const mm = String(Math.floor(rec.seconds / 60))
  const ss = String(rec.seconds % 60).padStart(2, '0')

  return (
    <Shell>
      <header>
        <p className="text-sm uppercase tracking-wide text-amber-800">{family.name}</p>
        <h1 className="text-3xl font-semibold">Hi {member.name}</h1>
        <p className="mt-1 text-lg text-stone-600">Tap and tell one memory. A minute or two is plenty.</p>
      </header>

      {(phase === 'idle' || rec.recording) && (
        <>
          <label className="flex items-center justify-between gap-2 text-stone-600">
            Language
            <select
              value={lang}
              disabled={rec.recording}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2"
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>

          <button
            onClick={rec.recording ? stop : rec.start}
            className={`mx-auto flex h-48 w-48 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg transition ${
              rec.recording ? 'animate-pulse bg-red-600' : 'bg-amber-700'
            }`}
          >
            {rec.recording ? `Stop  ${mm}:${ss}` : 'Record'}
          </button>

          {rec.error && <p className="text-red-700">{rec.error}</p>}
          {!speechSupported() && (
            <p className="text-sm text-stone-500">This browser can't transcribe live. You can type a short summary after recording.</p>
          )}
          {rec.recording && (rec.transcript || rec.interim) && (
            <p className="rounded-xl bg-white p-4 text-lg text-stone-700">
              {rec.transcript}
              <span className="text-stone-400">{rec.interim}</span>
            </p>
          )}
        </>
      )}

      {phase === 'review' && rec.audio && (
        <div className="flex flex-col gap-4">
          <audio controls src={URL.createObjectURL(rec.audio)} className="w-full" />
          <label className="flex flex-col gap-1 text-stone-600">
            What we heard (fix anything that's wrong)
            <textarea
              value={rec.transcript}
              onChange={(e) => rec.setTranscript(e.target.value)}
              rows={6}
              className="rounded-xl border border-stone-300 bg-white p-3 text-lg text-stone-900"
              placeholder="Type what this memory is about"
            />
          </label>
          <div className="flex gap-3">
            <button onClick={again} className="flex-1 rounded-xl border border-stone-300 bg-white py-4 text-lg">Redo</button>
            <button onClick={save} className="flex-1 rounded-xl bg-amber-700 py-4 text-lg font-semibold text-white">Save memory</button>
          </div>
        </div>
      )}

      {(phase === 'uploading' || phase === 'tagging') && (
        <p className="text-center text-lg text-stone-600">
          {phase === 'uploading' ? 'Saving your recording…' : 'Placing it on your timeline…'}
        </p>
      )}

      {phase === 'done' && result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-white p-4">
            <p className="text-lg font-semibold">Saved ✓</p>
            {result.summary && <p className="mt-1 text-stone-700">{result.summary}</p>}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-stone-600">
              <dt>Life stage</dt>
              <dd>{stages.find((s) => s.id === result.life_stage_id)?.label ?? 'Not sure yet'}</dd>
              {result.place && <><dt>Place</dt><dd>{result.place}</dd></>}
              {(result.year_start || result.year_end) && (
                <>
                  <dt>Years</dt>
                  <dd>
                    {result.year_is_estimate ? 'around ' : ''}
                    {result.year_start === result.year_end || !result.year_end
                      ? result.year_start
                      : `${result.year_start ?? '?'}–${result.year_end}`}
                  </dd>
                </>
              )}
              {(result.people_ids.length > 0 || result.unmatched_people.length > 0) && (
                <>
                  <dt>People</dt>
                  <dd>
                    {[...result.people_ids.map((id) => people.find((p) => p.id === id)?.name), ...result.unmatched_people]
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </>
              )}
            </dl>
            {result.sensitive && (
              <p className="mt-3 rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
                🔒 Kept private until you choose who can see it.
              </p>
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
    </Shell>
  )
}
