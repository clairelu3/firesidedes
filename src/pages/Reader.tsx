import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listChapters, listMemos } from '../api'
import type { Chapter, Memo } from '../types'

export default function Reader() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])

  useEffect(() => {
    Promise.all([listChapters(), listMemos()]).then(([c, m]) => {
      setChapters(c.filter((ch) => ch.status === 'approved'))
      setMemos(m)
    })
  }, [])

  if (chapters === null) return null

  if (chapters.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center">
        <h1 className="font-serif text-3xl">The book is still being written</h1>
        <p className="mt-3 text-xl text-stone-600">
          No chapters have been approved yet. Check back soon!
        </p>
        <Link to="/review" className="mt-6 inline-block rounded-lg bg-stone-800 px-6 py-3 text-lg font-semibold text-white">
          Go to Review
        </Link>
      </div>
    )
  }

  const memoById = new Map(memos.map((m) => [m.id, m]))

  return (
    <div className="space-y-16 font-serif">
      {chapters.map((chapter, ci) => (
        <article key={chapter.id} className="rounded-xl bg-white px-6 py-10 shadow-sm sm:px-12">
          <p className="text-center text-base uppercase tracking-widest text-stone-500">Chapter {ci + 1}</p>
          <h1 className="mt-2 text-center text-4xl">{chapter.title}</h1>
          <div className="mt-10 space-y-8">
            {chapter.passages.map((passage, i) => {
              const audioUrl = memoById.get(passage.memoId)?.audioUrl
              return (
                <section key={i}>
                  <p className="text-xl leading-loose text-stone-800">{passage.text}</p>
                  {audioUrl && <audio controls src={audioUrl} className="mt-3 w-full" />}
                </section>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}
