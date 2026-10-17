// /storytime/:memoId — one memory as a rhyming picture book for the grandkids, one page at a time,
// with the storyteller's language under each page and her real recording one tap away.
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { listMemos, makeStorybook } from '../api'
import type { Memo, Storybook } from '../types'

export default function Storytime() {
  const { memoId } = useParams<{ memoId: string }>()
  const [memo, setMemo] = useState<Memo | null>(null)
  const [book, setBook] = useState<Storybook | null>(null)
  const [page, setPage] = useState(0)
  const [showNative, setShowNative] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

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

  if (loading) {
    return (
      <div className="rounded-2xl bg-amber-50 p-12 text-center">
        <p className="text-4xl">✨</p>
        <p className="mt-3 animate-pulse font-serif text-2xl text-stone-700">Turning this memory into a storybook…</p>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{error ?? 'No storybook yet.'}</p>
        <Link to="/memories" className="underline">Back to Memories</Link>
      </div>
    )
  }

  const p = book.pages[page]
  const last = page === book.pages.length - 1
  const hasNative = book.pages.some((pg) => pg.text_native)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/memories" className="text-base text-stone-500 underline">← Memories</Link>
        <div className="flex gap-2">
          {hasNative && (
            <button
              onClick={() => setShowNative((v) => !v)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-base"
            >
              {showNative ? 'English only' : 'Show both languages'}
            </button>
          )}
          <button onClick={() => load(true)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-base">
            New version
          </button>
        </div>
      </div>

      <article className="flex min-h-[26rem] flex-col rounded-3xl border-4 border-amber-200 bg-amber-50 px-6 py-8 font-serif shadow-sm sm:px-12">
        {page === 0 && (
          <p className="text-center text-base uppercase tracking-widest text-amber-800">Storytime</p>
        )}
        {page === 0 && <h1 className="mt-1 text-center text-3xl font-bold text-stone-900 sm:text-4xl">{book.title}</h1>}

        <div className="my-auto py-8 text-center">
          <p className="whitespace-pre-line text-2xl leading-relaxed text-stone-900 sm:text-3xl">{p.text}</p>
          {showNative && p.text_native && (
            <p className="mt-5 whitespace-pre-line text-xl leading-relaxed text-amber-900 sm:text-2xl">{p.text_native}</p>
          )}
        </div>

        {p.illustration && (
          <p className="rounded-xl bg-white/70 px-4 py-2 text-center text-base italic text-stone-500">🎨 {p.illustration}</p>
        )}
      </article>

      <div className="flex items-center justify-between gap-3">
        <button
          disabled={page === 0}
          onClick={() => setPage((n) => n - 1)}
          className="rounded-xl border-2 border-stone-300 bg-white px-5 py-3 text-lg font-semibold disabled:opacity-30"
        >
          ← Back
        </button>
        <span className="text-base text-stone-500">
          Page {page + 1} of {book.pages.length}
        </span>
        <button
          disabled={last}
          onClick={() => setPage((n) => n + 1)}
          className="rounded-xl bg-stone-800 px-5 py-3 text-lg font-semibold text-white disabled:opacity-30"
        >
          Next →
        </button>
      </div>

      {memo?.audioUrl && (
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <button
            onClick={() => audioRef.current?.play()}
            className="rounded-full bg-amber-700 px-6 py-3 text-lg font-semibold text-white"
          >
            ▶ Hear Grandma tell it
          </button>
          <audio ref={audioRef} controls src={memo.audioUrl} className="mt-3 w-full" />
        </div>
      )}
    </div>
  )
}
