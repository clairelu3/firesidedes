import { Button } from './Button'

export const STICKY_ACTION_BAR_HEIGHT = 88

export function StickyActionBar({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
}: {
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" onClick={onBack} size="bar" className="w-[30%]">
        Back
      </Button>
      <Button onClick={onContinue} disabled={continueDisabled} chevron size="bar" className="flex-1">
        {continueLabel}
      </Button>
    </div>
  )
}
