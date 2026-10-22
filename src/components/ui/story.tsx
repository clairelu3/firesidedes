import { useMemo, type KeyboardEvent, type ReactNode } from 'react'
import type { Highlight, Passage } from '../../types'

export function Diamond({ className = '' }: { className?: string }) {
  return <span className={`block size-1.5 rotate-45 bg-vermilion ${className}`} aria-hidden="true" />
}

export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator">
      <span className="h-px flex-1 bg-hairline" />
      <Diamond />
      <span className="h-px flex-1 bg-hairline" />
    </div>
  )
}

export function DropCapParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-story first-letter:float-left first-letter:mt-1.5 first-letter:mr-2.5 first-letter:font-display first-letter:text-[74px] first-letter:leading-[0.8] first-letter:font-semibold first-letter:text-vermilion">
      {children}
    </p>
  )
}

export function PullQuote({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'center' }) {
  if (align === 'center') {
    return (
      <blockquote className="py-2 text-center">
        <span className="mx-auto block h-px w-12 bg-vermilion" aria-hidden="true" />
        <p className="my-5 font-display text-[27px] leading-snug font-medium text-pine italic">{children}</p>
        <span className="mx-auto block h-px w-12 bg-vermilion" aria-hidden="true" />
      </blockquote>
    )
  }
  return (
    <blockquote className="border-l-2 border-pine pl-5">
      <p className="font-display text-[25px] leading-snug font-medium text-pine italic">{children}</p>
    </blockquote>
  )
}

function isQuotation(text: string) {
  return /^\s*[“"]/.test(text)
}

type Mark = { start: number; end: number; highlight: Highlight }

// Phrase as a pattern: case-insensitive, any run of spaces, straight or curly apostrophes.
function phrasePattern(phrase: string) {
  const parts = phrase.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]"))
  return new RegExp(parts.join('\\s+'), 'gi')
}

// Where each highlight lands: its first occurrence across the texts that doesn't overlap another.
function placeHighlights(texts: string[], highlights: Highlight[]): Mark[][] {
  const marks: Mark[][] = texts.map(() => [])
  for (const highlight of highlights) {
    if (!highlight.phrase.trim()) continue
    const re = phrasePattern(highlight.phrase)
    search: for (let i = 0; i < texts.length; i++) {
      re.lastIndex = 0
      for (let m = re.exec(texts[i]!); m; m = re.exec(texts[i]!)) {
        const start = m.index
        const end = start + m[0].length
        if (marks[i]!.some((k) => start < k.end && end > k.start)) continue
        marks[i]!.push({ start, end, highlight })
        break search
      }
    }
  }
  for (const list of marks) list.sort((a, b) => a.start - b.start)
  return marks
}

function withHighlights(text: string, marks: Mark[], onOpen: (h: Highlight) => void, activeId?: string): ReactNode {
  if (!marks.length) return text
  const out: ReactNode[] = []
  let at = 0
  for (const { start, end, highlight } of marks) {
    if (start > at) out.push(text.slice(at, start))
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen(highlight)
      }
    }
    // An inline span (not <button>) so a multi-word phrase wraps like the rest of the text, and a
    // drop cap's ::first-letter still reaches into it when the phrase starts the paragraph.
    out.push(
      <span
        key={highlight.id}
        role="button"
        tabIndex={0}
        aria-label={`More about: ${highlight.phrase}`}
        aria-haspopup="dialog"
        onClick={() => onOpen(highlight)}
        onKeyDown={onKeyDown}
        className={`cursor-pointer rounded-[3px] font-medium text-pine underline decoration-pine/35 decoration-2 underline-offset-[5px] transition-colors [box-decoration-break:clone] [-webkit-tap-highlight-color:transparent] hover:bg-pine/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine active:bg-pine/10 ${activeId === highlight.id ? 'bg-pine/10' : ''}`}
      >
        {text.slice(start, end)}
      </span>,
    )
    at = end
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}

export type HighlightOptions = {
  highlights?: Highlight[]
  activeId?: string // the highlight whose sheet is open, shown tinted
  onOpen?: (highlight: Highlight) => void // leave out (e.g. for the storyteller) to render plain text
}

// The one place story text becomes tappable highlights: Review, the Family Book and the letter
// reader all render through this. Returns each text as nodes, the first occurrence of each phrase
// (across all the texts) wrapped in a jade button. Without onOpen or highlights it's plain text.
export function useHighlightedText(texts: string[], { highlights, activeId, onOpen }: HighlightOptions): ReactNode[] {
  const key = texts.join('\u0000')
  const enabled = !!onOpen
  const marks = useMemo(() => (highlights?.length && enabled ? placeHighlights(key.split('\u0000'), highlights) : null), [key, highlights, enabled])
  return texts.map((text, i) => (marks && onOpen ? withHighlights(text, marks[i] ?? [], onOpen, activeId) : text))
}

// Passages as book text: drop cap on the first paragraph, quotations as pull quotes.
export function StoryPassages({ passages, quoteAlign = 'left', ...highlightOptions }: { passages: Passage[]; quoteAlign?: 'left' | 'center' } & HighlightOptions) {
  const texts = passages.map((p) => (isQuotation(p.text) ? p.text.trim() : p.text))
  const body = useHighlightedText(texts, highlightOptions)
  return (
    <div className="space-y-5">
      {passages.map((p, i) => {
        if (isQuotation(p.text)) return <PullQuote key={i} align={quoteAlign}>{body[i]}</PullQuote>
        if (i === 0) return <DropCapParagraph key={i}>{body[i]}</DropCapParagraph>
        return <p key={i} className="text-story">{body[i]}</p>
      })}
    </div>
  )
}
