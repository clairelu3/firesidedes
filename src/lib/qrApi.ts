// Calls to the FastAPI backend (backend/main.py) used by the QR + phone-record flow.
// Vite proxies /api → http://localhost:8000.

export type MemoTags = {
  stage_id: number | null
  summary?: string
  place?: string | null
  year_start?: number | null
  year_end?: number | null
  year_is_estimate?: boolean
  people?: string[]
  unmatched_people?: string[]
  themes?: string[]
  sensitive?: boolean
}

export type ApiMemo = {
  id: number
  audio_url: string
  transcript: string | null
  tags: MemoTags | null
  stage_id: number | null
  created_at: string
}

export type ApiStage = { id: number; label: string; place: string | null; start_year: number | null; end_year: number | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function uploadMemo(audio: Blob): Promise<ApiMemo> {
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', audio, `memo.${ext}`)
  return request('/api/memos', { method: 'POST', body: form })
}

export const listMemos = () => request<ApiMemo[]>('/api/memos')
export const listStages = () => request<ApiStage[]>('/api/life-map')

/** Base URL a phone can reach: VITE_PUBLIC_URL if set, else the laptop's Wi-Fi IP instead of localhost. */
export function publicBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_URL as string | undefined
  if (configured) return configured.replace(/\/$/, '')
  const { protocol, hostname, port, origin } = window.location
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocal && __LAN_IP__) return `${protocol}//${__LAN_IP__}${port ? `:${port}` : ''}`
  return origin
}

export const RECORD_PATH = '/r'
