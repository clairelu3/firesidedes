// /storytime/:memoId — one memory as a rhyming picture book for the grandkids, one page at a time,
// with the storyteller's language under each page and her real recording one tap away.
import { BookOpen, ChevronLeft, ChevronRight, Clapperboard, Pause, Play, RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { listMemos, makeStoryMovie, makeStorybook } from '../api'
import { AppShell } from '../components/ui/AppShell'
import { Card } from '../components/ui/Card'
import { Diamond } from '../components/ui/story'
import { useAudio } from '../lib/useAudio'
import type { Memo, StoryMovie, Storybook } from '../types'

export default function Storytime() {
  const { memoId } = useParams<{ memoId: string }>()
  const [memo, setMemo] = useState<Memo | null>(null)
  const [book, setBook] = useState<Storybook | null>(null)
  const [page, setPage] = useState(0)
  const [showNative, setShowNative] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'movie' | 'pages'>('movie')
  const [making, setMaking] = useState(false)
  const [movieError, setMovieError] = useState<string | null>(null)

  async function makeMovie(regenerate = false) {
    if (!memoId || !book) return
    setMaking(true)
    setMovieError(null)
    try {
      const video = await makeStoryMovie(memoId, regenerate)
      setBook({ ...book, video })
      setMode('movie')
    } catch (e) {
      setMovieError(e instanceof Error ? e.message : String(e))
    } finally {
      setMaking(false)
    }
  }

  async function load(regenerate = false) {
    if (!memoId) return
    setLoading(true)
    setError(null)
    try {
      const [b, memos] = await Promise.all([makeStorybook(memoId, regenerate), listMemos()])
      setBook(b)
      setMemo(memos.find((m) => m.id === memoId) ?? null)
      setPage(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoId])

  const back = (
    <Link to="/record" className="-ml-2 inline-flex h-12 items-center gap-1 rounded-xl px-2 text-base font-semibold text-ember hover:bg-ember-tint/50">
      <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
      Memories
    </Link>
  )

  if (loading) {
    return (
      <AppShell>
        {back}
        <Card className="mt-4 py-14 text-center">
          <Sparkles size={36} className="mx-auto text-ember" aria-hidden="true" />
          <p className="mt-4 animate-pulse font-display text-2xl text-ink">Turning this memory into a storybook…</p>
        </Card>
      </AppShell>
    )
  }

  if (error || !book) {
    return (
      <AppShell>
        {back}
        <Card className="mt-4 text-center">
          <p className="text-base text-ink">{error ?? 'No storybook yet.'}</p>
        </Card>
      </AppShell>
    )
  }

  const p = book.pages[page]
  const last = page === book.pages.length - 1
  const hasNative = book.pages.some((pg) => pg.text_native)

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2">
        {back}
        <div className="flex gap-1">
          {hasNative && mode === 'pages' && (
            <button
              onClick={() => setShowNative((v) => !v)}
              className="h-10 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-field"
            >
              {showNative ? 'English only' : 'Both languages'}
            </button>
          )}
          <button
            onClick={() => load(true)}
            aria-label="Write a new version"
            className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-field"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 inline-flex rounded-xl bg-field p-1">
        {([['movie', 'Movie', Clapperboard], ['pages', 'Pages', BookOpen]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold ${mode === m ? 'bg-paper text-ink shadow-card' : 'text-muted'}`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {mode === 'movie' && book.video ? (
        <MovieViewer movie={book.video} onRemake={() => makeMovie(true)} remaking={making} />
      ) : mode === 'movie' ? (
        <Card className="mt-3 text-center">
          <Clapperboard size={36} className="mx-auto text-ember" aria-hidden="true" />
          <p className="mt-3 font-display text-2xl text-ink">Make it a movie</p>
          <p className="mt-1 text-base text-muted">
            Every card becomes a scene in one watercolor animation, with music. The characters travel with you from card to card.
          </p>
          <button
            onClick={() => makeMovie()}
            disabled={making}
            className="mt-5 inline-flex h-14 items-center gap-2 rounded-2xl bg-ember px-6 text-lg font-semibold text-white shadow-ember disabled:opacity-60"
          >
            {making ? 'Painting the scenes… (about 20 s)' : '🎬 Make it a movie'}
          </button>
          {movieError && <p className="mt-3 text-base text-ember">{movieError}</p>}
        </Card>
      ) : (
        <>
      <article className="mt-3 flex min-h-[28rem] flex-col rounded-3xl border border-cream-border bg-cream px-6 py-8 shadow-card">
        {page === 0 ? (
          <header className="text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-ember">
              <Sparkles size={14} aria-hidden="true" /> Storytime
            </p>
            <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-ink">{book.title}</h1>
            <Diamond className="mx-auto mt-4" />
          </header>
        ) : (
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-muted">{book.title}</p>
        )}

        <div className="my-auto py-8 text-center">
          <p className="whitespace-pre-line font-serif text-[26px] leading-relaxed text-ink">{p.text}</p>
          {showNative && p.text_native && (
            <p className="mt-5 whitespace-pre-line text-xl leading-relaxed text-quote">{p.text_native}</p>
          )}
        </div>

        {p.illustration && (
          <p className="rounded-2xl bg-paper/70 px-4 py-3 text-center text-sm italic text-muted">🎨 {p.illustration}</p>
        )}
      </article>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          disabled={page === 0}
          onClick={() => setPage((n) => n - 1)}
          aria-label="Previous page"
          className="flex size-14 items-center justify-center rounded-full bg-paper text-ink shadow-card disabled:opacity-30"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <div className="flex gap-1.5" aria-label={`Page ${page + 1} of ${book.pages.length}`}>
          {book.pages.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === page ? 'w-6 bg-ember' : 'w-2 bg-line'}`} />
          ))}
        </div>
        <button
          disabled={last}
          onClick={() => setPage((n) => n + 1)}
          aria-label="Next page"
          className="flex size-14 items-center justify-center rounded-full bg-ember text-white shadow-ember disabled:opacity-30"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>

        </>
      )}

      {memo?.audioUrl && <HearIt src={memo.audioUrl} />}
    </AppShell>
  )
}

function HearIt({ src }: { src: string }) {
  const { ref, playing, toggle } = useAudio(src)
  return (
    <Card className="mt-6 flex items-center gap-4">
      <audio ref={ref} src={src} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ember text-white shadow-ember"
      >
        {playing ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
      </button>
      <div>
        <p className="font-display text-xl text-ink">Hear Grandma tell it</p>
        <p className="text-sm text-muted">Her real recording of this memory</p>
      </div>
    </Card>
  )
}

// One continuous movie; Next plays it to the next card's resting point and pauses there,
// so stepping through cards feels like scenes of one film rather than separate slides.
function MovieViewer({ movie, onRemake, remaking }: { movie: StoryMovie; onRemake: () => void; remaking: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const target = useRef<number | null>(null)
  const raf = useRef(0)
  const [card, setCard] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const rests = movie.rest_times
  const last = rests.length - 1

  const watch = useCallback(() => {
    const v = ref.current
    if (!v) return
    if (target.current !== null && v.currentTime >= target.current) {
      v.pause()
      v.currentTime = target.current
      target.current = null
      setPlaying(false)
      return
    }
    raf.current = requestAnimationFrame(watch)
  }, [])

  const playTo = useCallback(
    async (to: number | null) => {
      const v = ref.current
      if (!v) return
      target.current = to
      cancelAnimationFrame(raf.current)
      try {
        await v.play()
        setNeedsTap(false)
        setPlaying(true)
        raf.current = requestAnimationFrame(watch)
      } catch {
        setNeedsTap(true) // browser blocked autoplay with sound until a tap
      }
    },
    [watch],
  )

  useEffect(() => {
    setCard(0)
    playTo(rests[0])
    return () => cancelAnimationFrame(raf.current)
  }, [movie.url, playTo, rests])

  function next() {
    if (card >= last) return
    setCard(card + 1)
    playTo(rests[card + 1])
  }
  function prev() {
    const v = ref.current
    if (!v || card <= 0) return
    v.pause()
    target.current = null
    v.currentTime = rests[card - 1]
    setCard(card - 1)
    setPlaying(false)
  }
  function playAll() {
    setCard(last)
    playTo(null)
  }

  return (
    <>
      <div className="relative mt-3 overflow-hidden rounded-3xl border border-cream-border bg-cream shadow-card">
        <video
          ref={ref}
          src={movie.url}
          playsInline
          preload="auto"
          onEnded={() => setPlaying(false)}
          className="block aspect-[9/16] w-full"
        />
        {needsTap && (
          <button
            onClick={() => playTo(rests[card])}
            className="absolute inset-0 flex items-center justify-center bg-ink/10"
            aria-label="Start the movie"
          >
            <span className="flex size-20 items-center justify-center rounded-full bg-ember text-white shadow-ember">
              <Play size={34} fill="currentColor" className="ml-1" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          disabled={card === 0}
          onClick={prev}
          aria-label="Previous card"
          className="flex size-14 items-center justify-center rounded-full bg-paper text-ink shadow-card disabled:opacity-30"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <div className="flex gap-1.5" aria-label={`Card ${card + 1} of ${rests.length}`}>
          {rests.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === card ? 'w-6 bg-ember' : 'w-2 bg-line'}`} />
          ))}
        </div>
        <button
          disabled={card >= last || playing}
          onClick={next}
          aria-label="Next card"
          className="flex size-14 items-center justify-center rounded-full bg-ember text-white shadow-ember disabled:opacity-30"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <button onClick={playAll} className="h-10 rounded-xl px-3 text-sm font-semibold text-ember hover:bg-ember-tint/50">
          Play all
        </button>
        <button onClick={onRemake} disabled={remaking} className="h-10 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-field disabled:opacity-50">
          {remaking ? 'Repainting…' : 'Repaint movie'}
        </button>
      </div>
    </>
  )
}
