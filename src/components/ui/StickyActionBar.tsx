import { PrimaryButton, SecondaryButton } from './Button'

export const STICKY_ACTION_BAR_HEIGHT = 72

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
    <div className="flex items-center gap-3">
      <SecondaryButton onClick={onBack} className="w-[32%]">
        Back
      </SecondaryButton>
      <PrimaryButton onClick={onContinue} disabled={continueDisabled} className="flex-1">
        {continueLabel}
      </PrimaryButton>
    </div>
  )
}
