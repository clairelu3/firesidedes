// /record — record a letter, then decide when the family hears it, check the people it
// mentions, add a P.S., and finish. ?secret=1 starts a sealed letter ("Something you've never
// told anyone"); ?add=<letterId> adds another piece to a letter that's still in progress.
import { Check, LoaderCircle, Mic, Square, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  addLetterPiece,
  addPsPiece,
  checkSensitive,
  createLetter,
  decideRelease,
  findMentionedPeople,
  finishLetter,
  forgetPiece,
  getReleasePresets,
  getViewer,
  listMyLetters,
  setNameChoices as saveNameChoices,
  updatePieceTranscript,
  type Viewer,
} from '../api'
import { MiniRecorder } from '../components/MiniRecorder'
import { ReleasePicker, releaseChoiceError } from '../components/ReleasePicker'
import { AppShell } from '../components/ui/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { firstName, formatDuration, greeting } from '../lib/format'
import { PS_PROMPT_LABEL, recipientNames, releaseSummary } from '../lib/letterText'
import { useLetterRecorder } from '../lib/useLetterRecorder'
import type { Letter, NameChoice, Person, ReleaseChoice, ReleasePreset, Sensitivity } from '../types'

type Step = 'record' | 'saving' | 'release' | 'people' | 'ps' | 'done' | 'added'

// Remount on ?add= / ?secret= changes so each letter starts from a clean slate.
export default function LetterFlowRoute() {
  const { search } = useLocation()
  return <LetterFlow key={search} />
}

const LANGS = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-TW', label: '中文' },
]

function LetterFlow() {
  const [params] = useSearchParams()
  const addId = params.get('add')
  const secret = params.get('secret') === '1'
  const navigate = useNavigate()

  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [addTo, setAddTo] = useState<Letter | null>(null)
  const [lang, setLang] = useState('en-US')
  const rec = useLetterRecorder(lang)
  const [step, setStep] = useState<Step>('record')
  const [letter, setLetter] = useState<Letter | null>(null)
  const [pieceId, setPieceId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [savedTranscript, setSavedTranscript] = useState('')
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null)
  const [choice, setChoice] = useState<ReleaseChoice>({ releaseMode: secret ? 'private' : 'now', recipients: 'all' })
  const [presets, setPresets] = useState<ReleasePreset[]>([])
  const [mentioned, setMentioned] = useState<Person[]>([])
  const [choices, setChoices] = useState<NameChoice[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getViewer().then(setViewer).catch((err) => console.error(err))
    getReleasePresets().then(setPresets).catch((err) => console.error(err))
    if (addId) {
      listMyLetters()
        .then(({ letters }) => setAddTo(letters.find((l) => l.id === addId) ?? null))
        .catch((err) => console.error(err))
    }
  }, [addId])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell>
        <PageHeader title="Letters are written here" subtitle={`Only ${viewer.storytellerName} can record letters. Her shared letters are in the family book.`} />
        <Button chevron className="w-full" onClick={() => navigate('/book')}>
          Open the family book
        </Button>
      </AppShell>
    )
  }

  const privateRoom = secret || !!addId
  const members = viewer?.members.filter((m) => m.role !== 'storyteller') ?? []
  const storytellerName = viewer?.storytellerName ?? 'Ama'

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleStop() {
    setStep('saving')
    setError(null)
    const recording = await rec.stop()
    if (!recording) {
      setStep('record')
      return
    }
    try {
      if (addTo) {
        const updated = await addLetterPiece(addTo.id, recording.blob, recording.transcript)
        setLetter(updated)
        setPieceId(updated.pieces.at(-1)!.id)
        setStep('added')
      } else {
        const created = await createLetter({ origin: secret ? 'secret' : 'normal', blob: recording.blob, transcript: recording.transcript })
        setLetter(created)
        setPieceId(created.pieces[0]!.id)
        setSensitivity(await checkSensitive(recording.transcript))
        setStep('release')
      }
      setTranscript(recording.transcript)
      setSavedTranscript(recording.transcript)
    } catch (err) {
      console.error(err)
      setError(`We couldn’t save that recording: ${err instanceof Error ? err.message : err}`)
      setStep('record')
    }
  }

  // "Forget this" right after recording: one tap, gone.
  function forgetRecording() {
    if (!letter || !pieceId) return
    run(async () => {
      await forgetPiece(letter.id, pieceId)
      setLetter(null)
      setPieceId(null)
      setTranscript('')
      setSensitivity(null)
      setStep('record')
    })
  }

  function saveTranscript() {
    if (!letter || !pieceId || transcript === savedTranscript) return
    run(async () => {
      const updated = await updatePieceTranscript(letter.id, pieceId, transcript)
      setLetter(updated)
      setSavedTranscript(transcript)
      if (step === 'release') setSensitivity(await checkSensitive(updated.pieces.map((p) => p.transcript ?? '').join('\n')))
    })
  }

  function continueFromRelease() {
    if (!letter) return
    const problem = releaseChoiceError(choice)
    if (problem) {
      setError(problem)
      return
    }
    run(async () => {
      const updated = await decideRelease(letter.id, choice, sensitivity ?? undefined)
      setLetter(updated)
      if (choice.releaseMode === 'date' || choice.releaseMode === 'after') {
        const people = await findMentionedPeople(letter.id)
        if (people.length) {
          setMentioned(people)
          setChoices(people.map((p) => ({ personId: p.id, choice: 'keep', replacement: p.relation ? `my ${p.relation.toLowerCase()}` : '' })))
          setStep('people')
          return
        }
        setStep('ps')
        return
      }
      setStep('done')
    })
  }

  function continueFromPeople() {
    if (!letter) return
    run(async () => {
      setLetter(await saveNameChoices(letter.id, choices))
      setStep('ps')
    })
  }

  function finish(then?: () => void) {
    if (!letter) return
    run(async () => {
      setLetter(await finishLetter(letter.id))
      then?.()
    })
  }

  const errorBox = error && (
    <p className="mt-5 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
      {error}
    </p>
  )

  const transcriptBox = (
    <details className="rounded-2xl bg-field p-4" open={!transcript}>
      <summary className="cursor-pointer text-base font-semibold text-ink">What we heard</summary>
      <p className="mt-1 text-sm text-muted">Fix anything we got wrong. {transcript ? '' : 'We couldn’t hear the words, so you can type them here.'}</p>
      <textarea
        aria-label="Transcript"
        rows={4}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        onBlur={saveTranscript}
        className="mt-3 w-full resize-y rounded-2xl bg-paper px-4 py-3 text-base leading-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
      />
    </details>
  )

  // --- record ---
  if (step === 'record' || step === 'saving') {
    const recording = rec.recording
    const title = addTo ? 'Add to your letter' : secret ? 'Something you’ve never told anyone' : 'Write a letter'
    return (
      <AppShell>
        <PageHeader
          eyebrow={`${greeting()}, ${firstName(storytellerName)}`}
          title={title}
          subtitle={privateRoom ? 'No one can hear this until you decide.' : 'Tell it the way you remember it. Postscript will help with the rest.'}
        />
        <section className="rounded-[28px] bg-paper px-6 py-8 text-center shadow-card">
          {addTo && <p className="text-base text-muted">Adding to “{addTo.title}” · part {addTo.pieces.length + 1}</p>}

          <div className="relative mx-auto mt-6 flex size-[220px] items-center justify-center">
            <span className={`absolute size-[220px] rounded-full bg-ember/[0.06] ${recording ? 'motion-safe:animate-halo [animation-delay:300ms]' : ''}`} aria-hidden="true" />
            <span className={`absolute size-[180px] rounded-full bg-ember/15 ${recording ? 'motion-safe:animate-halo' : ''}`} aria-hidden="true" />
            <button
              type="button"
              onClick={recording ? handleStop : rec.start}
              disabled={step === 'saving'}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              aria-pressed={recording}
              className="relative flex size-[140px] items-center justify-center rounded-full bg-ember text-white shadow-ember transition-colors hover:bg-ember-dark disabled:opacity-80"
            >
              {step === 'saving' ? (
                <LoaderCircle size={44} className="motion-safe:animate-spin" aria-hidden="true" />
              ) : recording ? (
                <Square size={40} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              ) : (
                <Mic size={48} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="mt-4" aria-live="polite">
            {step === 'saving' ? (
              <p className="text-lg font-bold text-ink">Keeping it safe…</p>
            ) : recording ? (
              <>
                <p className="text-2xl font-bold tabular-nums text-ink">{formatDuration(rec.elapsed)}</p>
                <p className="mt-1 text-base text-muted">Tap to stop</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-ink">Tap to start</p>
                <p className="mt-1 text-base text-muted">Even 1 minute is enough.</p>
              </>
            )}
          </div>

          {/* Private room: no live words on screen. */}
          {recording && !privateRoom && rec.liveTranscript && (
            <p className="mt-5 rounded-2xl bg-field px-4 py-3 text-left text-base leading-normal text-ink">{rec.liveTranscript}</p>
          )}
          {privateRoom && <p className="mt-5 text-base font-semibold text-ink">No one can hear this until you decide.</p>}

          {recording && (
            <Button variant="secondary" className="mt-5 w-full" onClick={rec.forget} icon={<Trash2 size={20} aria-hidden="true" />}>
              Forget this
            </Button>
          )}

          {!recording && step === 'record' && (
            <div className="mt-5 inline-flex rounded-2xl bg-field p-1" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`h-11 rounded-xl px-4 text-base font-semibold ${lang === l.code ? 'bg-paper text-ink shadow-card' : 'text-muted'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {(rec.error || error) && (
            <p className="mt-5 rounded-2xl bg-ember-tint px-4 py-3 text-base text-ember-dark" role="alert">
              {rec.error ?? error}
            </p>
          )}
        </section>
      </AppShell>
    )
  }

  // --- release decision ---
  if (step === 'release' && letter) {
    return (
      <AppShell>
        <PageHeader title="When should your family hear this?" subtitle="You can change this later, as long as no one has opened it." />
        <div className="space-y-5">
          {sensitivity?.flagged && (
            <Card className="bg-ember-tint">
              <p className="text-lg font-bold text-ink">This letter mentions some difficult moments. Would you like to choose when your family hears it?</p>
            </Card>
          )}
          <ReleasePicker value={choice} onChange={setChoice} presets={presets} members={members} storytellerName={storytellerName} />
          {transcriptBox}
          {errorBox}
          <Button chevron className="w-full" disabled={busy} onClick={continueFromRelease}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={forgetRecording} icon={<Trash2 size={20} aria-hidden="true" />}>
            Forget this
          </Button>
        </div>
      </AppShell>
    )
  }

  // --- people in the letter ---
  if (step === 'people' && letter) {
    return (
      <AppShell>
        <PageHeader title="This letter mentions:" subtitle={mentioned.map((p) => p.name).join(', ')} />
        <div className="space-y-5">
          {mentioned.map((person) => {
            const c = choices.find((x) => x.personId === person.id)!
            const update = (patch: Partial<NameChoice>) => setChoices((prev) => prev.map((x) => (x.personId === person.id ? { ...x, ...patch } : x)))
            return (
              <Card key={person.id}>
                <p className="text-display text-[24px] text-ink">{person.name}</p>
                {person.relation && <p className="text-sm text-muted">{person.relation}</p>}
                <div className="mt-4 space-y-2">
                  <ChoiceButton selected={c.choice === 'keep'} onClick={() => update({ choice: 'keep' })}>
                    Keep the name
                  </ChoiceButton>
                  <ChoiceButton selected={c.choice === 'replace'} onClick={() => update({ choice: 'replace' })}>
                    Replace it with a description
                  </ChoiceButton>
                  {c.choice === 'replace' && (
                    <input
                      aria-label={`Description for ${person.name}`}
                      value={c.replacement ?? ''}
                      onChange={(e) => update({ replacement: e.target.value })}
                      placeholder="my brother"
                      className="h-14 w-full rounded-2xl bg-field px-4 text-lg font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                    />
                  )}
                  <ChoiceButton selected={c.choice === 'exclude'} onClick={() => update({ choice: 'exclude' })}>
                    Never show this letter to {person.name}
                  </ChoiceButton>
                </div>
              </Card>
            )
          })}
          {errorBox}
          <Button chevron className="w-full" disabled={busy} onClick={continueFromPeople}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      </AppShell>
    )
  }

  // --- P.S. ---
  if (step === 'ps' && letter) {
    const forWhom = recipientNames(letter.recipients, members)
    const addPs = (prompt: 'ps' | 'why' | 'hope') => async (r: { blob: Blob; transcript: string }) => {
      setLetter(await addPsPiece(letter.id, prompt, r.blob, r.transcript))
    }
    return (
      <AppShell>
        <PageHeader title="Add a P.S." subtitle={`A few words just for ${forWhom}. They’ll hear it first, before the letter.`} />
        <div className="space-y-4">
          <MiniRecorder label="P.S." hint={`Talk to ${forWhom} directly.`} lang={lang} onSave={addPs('ps')} />
          <MiniRecorder label="Why are you telling them this?" hint="Optional" lang={lang} onSave={addPs('why')} />
          <MiniRecorder label="What do you hope they understand?" hint="Optional" lang={lang} onSave={addPs('hope')} />

          {letter.psPieces.length > 0 && (
            <Card>
              <p className="text-lg font-bold text-ink">Saved</p>
              <ul className="mt-2 divide-y divide-line">
                {letter.psPieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Check size={20} className="shrink-0 text-ember" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-base text-ink">{PS_PROMPT_LABEL[p.prompt ?? 'ps']}</span>
                    <button
                      type="button"
                      onClick={() =>
                        run(async () => {
                          await forgetPiece(letter.id, p.id)
                          setLetter({ ...letter, psPieces: letter.psPieces.filter((x) => x.id !== p.id) })
                        })
                      }
                      className="h-11 rounded-xl px-3 text-base font-semibold text-ember hover:bg-ember-tint/50"
                    >
                      Forget this
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {errorBox}
          <Button chevron className="w-full" onClick={() => setStep('done')}>
            {letter.psPieces.length ? 'Continue' : 'Skip'}
          </Button>
        </div>
      </AppShell>
    )
  }

  // --- added a piece ---
  if (step === 'added' && letter) {
    return (
      <AppShell>
        <PageHeader title="Added to your letter" subtitle={`“${letter.title}” now has ${letter.pieces.length} parts. They’ll be played in order.`} />
        <div className="space-y-4">
          {transcriptBox}
          {errorBox}
          {letter.status === 'finished' ? (
            <Card>
              <p className="text-lg font-bold text-ink">This letter is finished.</p>
            </Card>
          ) : (
            <>
              <Button className="w-full" onClick={() => navigate(`/record?add=${letter.id}&n=${letter.pieces.length}`)}>
                Add another piece
              </Button>
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => finish()}>
                This letter is finished
              </Button>
            </>
          )}
          <Button variant="secondary" className="w-full" disabled={busy} onClick={forgetRecording} icon={<Trash2 size={20} aria-hidden="true" />}>
            Forget this piece
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/letterbox')}>
            Back to my letterbox
          </Button>
        </div>
      </AppShell>
    )
  }

  // --- done ---
  if (step === 'done' && letter) {
    const sealed = letter.releaseMode === 'date' || letter.releaseMode === 'after'
    const title =
      letter.releaseMode === 'now' ? 'Sent to your family book'
      : letter.releaseMode === 'private' ? 'Kept just for you'
      : 'Your letter is sealed'
    const subtitle =
      letter.releaseMode === 'now' ? 'Your family can read it once it’s approved in Review.'
      : letter.releaseMode === 'private' ? 'No one can hear this until you decide. You can share it any time from My letters.'
      : releaseSummary(letter, viewer?.members ?? [])
    return (
      <AppShell>
        <PageHeader title={title} subtitle={subtitle} />
        <div className="space-y-4">
          {letter.releaseMode !== 'now' &&
            (letter.status === 'in_progress' ? (
              <Card>
                <p className="text-lg font-bold text-ink">Is this letter finished?</p>
                <p className="mt-1 text-[15px] leading-normal text-muted">
                  You can tell it in pieces. Add more any time{sealed ? '. It reaches them only once it’s finished.' : '.'}
                </p>
                <div className="mt-4 space-y-3">
                  <Button className="w-full" disabled={busy} onClick={() => finish()}>
                    This letter is finished
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => navigate(`/record?add=${letter.id}`)}>
                    Add to this letter
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-lg font-bold text-ink">This letter is finished.</p>
                {sealed && <p className="mt-1 text-[15px] text-muted">Only you can change it, until someone opens it.</p>}
              </Card>
            ))}
          {errorBox}
          {letter.releaseMode === 'now' && (
            <Button variant="secondary" className="w-full" onClick={() => navigate('/chapters')}>
              See it in Review
            </Button>
          )}
          <Button chevron className="w-full" onClick={() => navigate('/letterbox')}>
            Back to my letterbox
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <p className="pt-10 text-center text-lg text-muted">Loading…</p>
    </AppShell>
  )
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold ${selected ? 'bg-ember-tint text-ink ring-2 ring-ember' : 'bg-field text-ink hover:bg-line'}`}
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-ember bg-ember text-white' : 'border-muted/50'}`} aria-hidden="true">
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
      {children}
    </button>
  )
}
