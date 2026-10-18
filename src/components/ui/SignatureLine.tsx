import { ChopSeal } from './ChopSeal'

// Handwritten line + a small seal, signed at the bottom of book pages.
export function SignatureLine({ text = 'Small voices make a long home.', seal = '家書', className = '' }: { text?: string; seal?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-3 ${className}`}>
      <p className="text-script max-w-[180px] -rotate-[4deg] text-right">{text}</p>
      <ChopSeal text={seal} size={26} />
    </div>
  )
}
