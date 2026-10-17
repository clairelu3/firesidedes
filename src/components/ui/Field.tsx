import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  // 'paper' for fields placed on a grey (field-colored) surface.
  tone?: 'field' | 'paper'
}

export function Field({ label, tone = 'field', className = '', id, ...rest }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`h-16 w-full min-w-0 rounded-2xl px-5 text-xl font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted/60 focus-visible:ring-2 focus-visible:ring-ember/40 ${
          tone === 'paper' ? 'bg-paper' : 'bg-field'
        }`}
        {...rest}
      />
    </div>
  )
}
