import type { Passage } from '../../types'

export function Diamond({ className = '' }: { className?: string }) {
  return <span className={`block size-2 rotate-45 bg-ember ${className}`} aria-hidden="true" />
}

export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator">
      <span className="h-px flex-1 bg-line" />
      <Diamond />
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function DropCapParagraph({ children }: { children: string }) {
  return (
    <p className="text-story first-letter:float-left first-letter:mr-3 first-letter:mt-2 first-letter:font-display first-letter:text-[92px] first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-ember">
      {children}
    </p>
  )
}

export function PullQuote({ children, align = 'left' }: { children: string; align?: 'left' | 'center' }) {
  if (align === 'center') {
    return (
      <blockquote className="py-2 text-center">
        <span className="mx-auto block h-0.5 w-12 bg-ember" aria-hidden="true" />
        <p className="my-6 font-display text-[28px] font-medium leading-snug tracking-[-0.01em] text-quote">{children}</p>
        <span className="mx-auto block h-0.5 w-12 bg-ember" aria-hidden="true" />
      </blockquote>
    )
  }
  return (
    <blockquote className="border-l-[3px] border-ember pl-6">
      <p className="font-serif text-[26px] font-medium leading-snug text-quote">{children}</p>
    </blockquote>
  )
}

function isQuotation(text: string) {
  return /^\s*[“"]/.test(text)
}

// Passages as book text: drop cap on the first paragraph, quotations as pull quotes.
export function StoryPassages({ passages, quoteAlign = 'left' }: { passages: Passage[]; quoteAlign?: 'left' | 'center' }) {
  return (
    <div className="space-y-6">
      {passages.map((p, i) => {
        if (isQuotation(p.text)) return <PullQuote key={i} align={quoteAlign}>{p.text.trim()}</PullQuote>
        if (i === 0) return <DropCapParagraph key={i}>{p.text}</DropCapParagraph>
        return <p key={i} className="text-story">{p.text}</p>
      })}
    </div>
  )
}
