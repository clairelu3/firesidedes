import { useEffect, useState } from 'react'
import { listChapters, updateChapter } from '../api'
import type { Chapter } from '../types'

const badgeClass: Record<Chapter['status'], string> = {
  draft: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  hidden: 'bg-stone-200 text-stone-700',
}

export default function Review() {
  const [chapters, setChapters] = useState<Chapter[]>([])

  useEffect(() => {
    listChapters().then(setChapters)
  }, [])

  async function save(id: string, changes: Partial<Omit<Chapter, 'id'>>) {
    const updated = await updateChapter(id, changes)
    setChapters((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  function editPassageLocally(chapterId: string, index: number, text: string) {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? { ...c, passages: c.passages.map((p, i) => (i === index ? { ...p, text } : p)) }
          : c,
      ),
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Review your chapters</h1>
        <p className="mt-2 text-stone-600">
          Edit anything that isn’t quite right. Approved chapters are shared with your family.
        </p>
      </header>

      {chapters.length === 0 && <p className="text-stone-600">No chapters yet.</p>}

      {chapters.map((chapter) => (
        <article key={chapter.id} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{chapter.title}</h2>
            <span className={`rounded-full px-3 py-1 text-base font-medium capitalize ${badgeClass[chapter.status]}`}>
              {chapter.status}
            </span>
          </div>

          {chapter.passages.map((passage, i) => (
            <textarea
              key={i}
              aria-label={`Passage ${i + 1}`}
              value={passage.text}
              rows={4}
              onChange={(e) => editPassageLocally(chapter.id, i, e.target.value)}
              onBlur={() => save(chapter.id, { passages: chapter.passages })}
              className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-lg leading-relaxed focus:border-stone-700 focus:outline-none"
            />
          ))}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => save(chapter.id, { status: 'approved' })}
              className="rounded-lg bg-green-700 px-6 py-3 text-lg font-semibold text-white hover:bg-green-800"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => save(chapter.id, { status: 'hidden' })}
              className="rounded-lg border-2 border-stone-400 px-6 py-3 text-lg font-semibold text-stone-800 hover:bg-stone-100"
            >
              Hide
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
