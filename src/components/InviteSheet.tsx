import { Check, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { PrimaryButton } from './ui/Button'

export function InviteSheet({ code, familyName, onClose }: { code: string; familyName: string; onClose: () => void }) {
  const url = `${window.location.origin}/family/${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this invite link', url)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-paper relative w-full max-w-[430px] rounded-t-[24px] px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-float"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          <X size={22} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <h2 id="invite-title" className="text-title pr-12">
          Invite your family
        </h2>
        <p className="text-body mt-2 text-muted">
          Scan this code or share the link to join {familyName}. They’ll just enter their name.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="surface-card p-4">
            <QRCodeSVG value={url} size={196} fgColor="#1F4D3A" bgColor="#FBF7EF" marginSize={0} level="M" title="Invite QR code" />
          </div>
        </div>
        <p className="text-meta mt-6 rounded-[14px] bg-parchment px-4 py-3 break-all text-ink">{url}</p>
        <PrimaryButton
          onClick={copy}
          arrow={false}
          className="mt-4"
          icon={copied ? <Check size={20} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={20} strokeWidth={1.75} aria-hidden="true" />}
        >
          {copied ? 'Copied' : 'Copy link'}
        </PrimaryButton>
        {isLocal && (
          <p className="text-meta mt-4 text-center">
            This link only works on this computer. Run <code className="font-semibold">npm run dev -- --host</code> to
            invite phones on the same Wi-Fi.
          </p>
        )}
      </div>
    </div>
  )
}
