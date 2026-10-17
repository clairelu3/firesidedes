// Family invite QR. Scanning it opens /join/:familyId → join if needed → record.
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { inviteUrl } from '../lib/members'

export default function FamilyQR({ familyId, size = 220 }: { familyId: string; size?: number }) {
  const url = inviteUrl(familyId)
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <QRCodeSVG value={url} size={size} marginSize={1} />
      <p className="text-center text-stone-600">Scan to join and record a memory</p>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
      >
        {copied ? 'Copied!' : 'Copy invite link'}
      </button>
    </div>
  )
}
