import { ChevronRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'field' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-ember text-white shadow-ember hover:bg-ember-dark',
  secondary: 'border border-line bg-paper text-ink hover:bg-field',
  field: 'bg-field text-ink hover:bg-line',
  ghost: 'text-ember hover:bg-ember-tint/50',
}

const sizes = {
  lg: 'h-[60px] gap-2 px-6 text-xl',
  bar: 'h-16 gap-1.5 px-4 text-lg', // sticky action bar
  compact: 'h-[60px] gap-1.5 px-3 text-[17px]', // two buttons side by side in a narrow panel
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: keyof typeof sizes
  chevron?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'lg', chevron = false, icon, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-bold [&_svg]:shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {chevron && <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" className="-mr-1" />}
    </button>
  )
}
