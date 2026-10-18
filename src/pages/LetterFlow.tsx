// /record — record a letter, then decide when the family hears it, check the people it
// mentions, add a P.S., and finish. ?secret=1 starts a sealed letter ("Something you've never
// told anyone"); ?add=<letterId> adds another piece to a letter that's still in progress;
// ?start=1 starts recording right away (the Letterbox mic).
import { Check, EyeOff, Info, PenLine, UserCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  getLifeMap,
  getReleasePresets,
  getViewer,
  listMyLetters,
  setNameChoices as saveNameChoices,
  updatePieceTranscript,
  type Viewer,
} from '../api'
import { MiniRecorder } from '../components/MiniRecorder'
import { ReleasePicker, releaseChoiceError } from '../components/ReleasePicker'
import { AppShell, TAGLINE } from '../components/ui/AppShell'
import { AudioCard } from '../components/ui/AudioCard'
import { PrimaryButton, SecondaryButton, TextButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextArea } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { OptionList, OptionRow, PillInput } from '../components/ui/OptionList'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordButton } from '../components/ui/RecordButton'
import { Segmented } from '../components/ui/Segmented'
import { formatDuration } from '../lib/format'
import { thumbFor } from '../lib/illustrations'
import { PS_PROMPT_LABEL, recipientNames, releaseSummary } from '../lib/letterText'
import { useLetterRecorder } from '../lib/useLetterRecorder'
import type { Letter, LifeStage, NameChoice, Person, ReleaseChoice, ReleasePreset, Sensitivity } from '../types'

type Step = 'record' | 'saving' | 'release' | 'people' | 'ps' | 'done' | 'added'

// Remount on ?add= / ?secret= changes so each letter starts from a clean slate.
export default function LetterFlowRoute() {
  const { search } = useLocation()
  return <LetterFlow key={search} />
}

const LANGS = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-TW', label: '中文' },
] as const

function LetterFlow() {
  const [params] = useSearchParams()
  const addId = params.get('add')
  const secret = params.get('secret') === '1'
  const autoStart = params.get('start') === '1'
  const navigate = useNavigate()

  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [addTo, setAddTo] = useState<Letter | null>(null)
  const [stages, setStages] = useState<LifeStage[]>([])
  const [lang, setLang] = useState<string>('en-US')
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
    getLifeMap()
      .then((map) => setStages(map?.stages ?? []))
      .catch((err) => console.error(err))
    if (addId) {
      listMyLetters()
        .then(({ letters }) => setAddTo(letters.find((l) => l.id === addId) ?? null))
        .catch((err) => console.error(err))
    }
  }, [addId])

  // The Letterbox mic sends ?start=1. A timer (cleared on unmount) so a dev-mode double mount
  // can't open the microphone twice.
  const { start } = rec
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!autoStart || autoStarted.current) return
    const id = window.setTimeout(() => {
      autoStarted.current = true
      start()
    }, 0)
    return () => window.clearTimeout(id)
  }, [autoStart, start])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  if (viewer && !viewer.isStoryteller) {
    return (
      <AppShell back="/book">
        <PageHeader title="Letters are written here" subtitle={`Only ${viewer.storytellerName} can record letters. Her shared letters are in the family book.`} />
        <PrimaryButton onClick={() => navigate('/book')}>Open the family book</PrimaryButton>
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

  const errorBox = error && <Notice tone="error">{error}</Notice>

  const transcriptBox = (
    <details className="surface-card p-4" open={!transcript}>
      <summary className="cursor-pointer font-serif text-[17px] text-ink">What we heard</summary>
      <p className="text-meta mt-1">Fix anything we got wrong. {transcript ? '' : 'We couldn’t hear the words, so you can type them here.'}</p>
      <TextArea aria-label="Transcript" className="mt-3" value={transcript} onChange={(e) => setTranscript(e.target.value)} onBlur={saveTranscript} />
    </details>
  )

  const thisLetterCard = letter && (
    <AudioCard
      title={letter.title}
      meta="Just now"
      urls={letter.pieces.map((p) => p.audioUrl)}
      thumb={thumbFor(letter.stageId, stages)}
      menu={[{ label: 'Forget this', danger: true, onSelect: forgetRecording }]}
    />
  )

  // --- record ---
  if (step === 'record' || step === 'saving') {
    const recording = rec.recording
    const title = addTo ? 'Add to your letter' : secret ? 'Something you’ve never told anyone' : 'What do you remember?'
    const subtitle = addTo
      ? `Adding part ${addTo.pieces.length + 1} to “${addTo.title}”.`
      : secret
        ? 'It starts sealed. You decide who hears it, and when.'
        : 'A place, a person, a taste, a moment. Your voice keeps it alive.'
    return (
      <AppShell hero="hero-grandma" back="/letterbox" subtitle={TAGLINE}>
        <PageHeader title={title} subtitle={subtitle} />
        <RecordButton
          state={step === 'saving' ? 'saving' : recording ? 'recording' : 'idle'}
          onClick={recording ? handleStop : rec.start}
          label={step === 'saving' ? 'Keeping it safe…' : recording ? formatDuration(rec.elapsed) : addTo ? 'Record the next part' : 'Record a memory'}
          sublabel={recording ? 'Tap to stop' : step === 'record' ? 'Even one minute is enough.' : undefined}
        />

        <div className="mt-4 space-y-4 text-center">
          {privateRoom && <p className="font-serif text-[17px] text-pine">No one can hear this until you decide.</p>}
          {/* Private room: no live words on screen. */}
          {recording && !privateRoom && rec.liveTranscript && (
            <Card className="text-left">
              <p className="text-body">{rec.liveTranscript}</p>
            </Card>
          )}
          {recording && (
            <TextButton tone="muted" onClick={rec.forget}>
              Forget this
            </TextButton>
          )}
          {!recording && step === 'record' && <Segmented label="Language" value={lang} onChange={setLang} options={LANGS} />}
          {(rec.error || error) && <Notice tone="error">{rec.error ?? error}</Notice>}
        </div>
      </AppShell>
    )
  }

  // --- release decision ---
  if (step === 'release' && letter) {
    const cta = choice.releaseMode === 'now' ? 'Send to the family book' : choice.releaseMode === 'private' ? 'Keep it for me' : 'Seal this memory'
    return (
      <AppShell hero="hero-grandma-tea" heroSize="short" back="/letterbox">
        <PageHeader title="When should they hear it?" subtitle="You can choose who can hear this memory and when to release it." />
        <div className="space-y-4">
          {thisLetterCard}
          {sensitivity?.flagged && (
            <Notice icon={<Info size={20} strokeWidth={1.5} className="text-pine" aria-hidden="true" />}>
              This letter mentions some difficult moments. Would you like to choose when your family hears it?
            </Notice>
          )}
          <ReleasePicker value={choice} onChange={setChoice} presets={presets} members={members} storytellerName={storytellerName} />
          {transcriptBox}
          {errorBox}
          <PrimaryButton disabled={busy} onClick={continueFromRelease}>
            {busy ? 'Saving…' : cta}
          </PrimaryButton>
          <div className="text-center">
            <TextButton tone="muted" disabled={busy} onClick={forgetRecording}>
              Forget this recording
            </TextButton>
          </div>
        </div>
      </AppShell>
    )
  }

  // --- people in the letter ---
  if (step === 'people' && letter) {
    return (
      <AppShell back="/letterbox">
        <PageHeader title="This letter mentions" subtitle={`${mentioned.map((p) => p.name).join(', ')}. Choose how each of them appears.`} />
        <div className="space-y-4">
          {mentioned.map((person) => {
            const c = choices.find((x) => x.personId === person.id)!
            const update = (patch: Partial<NameChoice>) => setChoices((prev) => prev.map((x) => (x.personId === person.id ? { ...x, ...patch } : x)))
            return (
              <Card key={person.id}>
                <p className="text-card-title text-[21px]">{person.name}</p>
                {person.relation && <p className="text-meta">{person.relation}</p>}
                <OptionList label={`How ${person.name} appears`} className="mt-3 -mx-2">
                  <OptionRow selected={c.choice === 'keep'} onSelect={() => update({ choice: 'keep' })} icon={UserCheck} title="Keep the name" />
                  <OptionRow selected={c.choice === 'replace'} onSelect={() => update({ choice: 'replace' })} icon={PenLine} title="Replace it with a description">
                    <PillInput aria-label={`Description for ${person.name}`} value={c.replacement ?? ''} onChange={(e) => update({ replacement: e.target.value })} placeholder="my brother" />
                  </OptionRow>
                  <OptionRow selected={c.choice === 'exclude'} onSelect={() => update({ choice: 'exclude' })} icon={EyeOff} title={`Never show this letter to ${person.name}`} />
                </OptionList>
              </Card>
            )
          })}
          {errorBox}
          <PrimaryButton disabled={busy} onClick={continueFromPeople}>
            {busy ? 'Saving…' : 'Continue'}
          </PrimaryButton>
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
      <AppShell back="/letterbox">
        <PageHeader title="Add a P.S." subtitle={`A few words just for ${forWhom}. They’ll hear it first, before the letter.`} />
        <div className="space-y-4">
          <MiniRecorder label="P.S." hint={`Talk to ${forWhom} directly.`} lang={lang} onSave={addPs('ps')} />
          <MiniRecorder label="Why are you telling them this?" hint="Optional" lang={lang} onSave={addPs('why')} />
          <MiniRecorder label="What do you hope they understand?" hint="Optional" lang={lang} onSave={addPs('hope')} />

          {letter.psPieces.length > 0 && (
            <Card>
              <p className="text-card-title">Saved</p>
              <ul className="mt-1 divide-y divide-hairline">
                {letter.psPieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <Check size={18} strokeWidth={1.75} className="shrink-0 text-pine" aria-hidden="true" />
                    <span className="text-body min-w-0 flex-1">{PS_PROMPT_LABEL[p.prompt ?? 'ps']}</span>
                    <TextButton
                      tone="muted"
                      onClick={() =>
                        run(async () => {
                          await forgetPiece(letter.id, p.id)
                          setLetter({ ...letter, psPieces: letter.psPieces.filter((x) => x.id !== p.id) })
                        })
                      }
                    >
                      Forget this
                    </TextButton>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {errorBox}
          <PrimaryButton onClick={() => setStep('done')}>{letter.psPieces.length ? 'Continue' : 'Skip'}</PrimaryButton>
        </div>
      </AppShell>
    )
  }

  // --- added a piece ---
  if (step === 'added' && letter) {
    return (
      <AppShell back="/letterbox">
        <PageHeader title="Added to your letter" subtitle={`“${letter.title}” now has ${letter.pieces.length} parts. They’ll be played in order.`} />
        <div className="space-y-4">
          {thisLetterCard}
          {transcriptBox}
          {errorBox}
          {letter.status === 'finished' ? (
            <Notice>This letter is finished.</Notice>
          ) : (
            <>
              <PrimaryButton onClick={() => navigate(`/record?add=${letter.id}&n=${letter.pieces.length}`)}>Add another piece</PrimaryButton>
              <SecondaryButton disabled={busy} onClick={() => finish()}>
                This letter is finished
              </SecondaryButton>
            </>
          )}
          <div className="flex flex-col items-center">
            <TextButton tone="muted" disabled={busy} onClick={forgetRecording}>
              Forget this piece
            </TextButton>
            <TextButton onClick={() => navigate('/letterbox')}>Back to my letterbox</TextButton>
          </div>
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
      : letter.releaseMode === 'private' ? 'No one can hear this until you decide. You can share it any time from your letters.'
      : releaseSummary(letter, viewer?.members ?? [])
    return (
      <AppShell back="/letterbox">
        <PageHeader title={title} subtitle={subtitle} />
        <div className="space-y-4">
          {thisLetterCard}
          {letter.releaseMode !== 'now' &&
            (letter.status === 'in_progress' ? (
              <Card>
                <p className="text-card-title">Is this letter finished?</p>
                <p className="text-meta mt-1 text-[15px]">You can tell it in pieces. Add more any time{sealed ? '. It reaches them only once it’s finished.' : '.'}</p>
                <div className="mt-4 space-y-3">
                  <PrimaryButton disabled={busy} onClick={() => finish()}>
                    This letter is finished
                  </PrimaryButton>
                  <SecondaryButton onClick={() => navigate(`/record?add=${letter.id}`)}>Add to this letter</SecondaryButton>
                </div>
              </Card>
            ) : (
              <Notice>
                This letter is finished.{sealed && ' Only you can change it, until someone opens it.'}
              </Notice>
            ))}
          {errorBox}
          {letter.releaseMode === 'now' && <SecondaryButton onClick={() => navigate('/chapters')}>See it in Review</SecondaryButton>}
          <PrimaryButton onClick={() => navigate('/letterbox')}>Back to my letterbox</PrimaryButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/letterbox">
      <p className="text-body pt-10 text-center text-muted">Loading…</p>
    </AppShell>
  )
}
