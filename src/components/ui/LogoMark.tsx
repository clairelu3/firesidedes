// Three short strokes leaning right, like leaves or flames. Colored via currentColor.
export function LogoMark({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" className={className} fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" aria-hidden="true">
      <path d="M4 22.5 L8.2 11" />
      <path d="M10.6 25 L16 4" />
      <path d="M17.6 22 L21 12" />
    </svg>
  )
}
