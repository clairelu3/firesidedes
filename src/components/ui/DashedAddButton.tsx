import { Plus } from 'lucide-react'

export function DashedAddButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-cream-border bg-cream text-lg font-semibold text-ember hover:bg-sand"
    >
      <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
      {children}
    </button>
  )
}
