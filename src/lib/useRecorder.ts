// Records audio with MediaRecorder. Transcription happens on the backend (Whisper).
import { useCallback, useRef, useState } from 'react'

export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setAudio(null)
    setSeconds(0)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError(
        window.isSecureContext
          ? 'Microphone access was blocked. Allow it in your browser settings and try again.'
          : 'The microphone only works over HTTPS. Open this page with https://',
      )
      return
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => {
      setAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
      stream.getTracks().forEach((t) => t.stop())
    }
    recorder.start()
    recorderRef.current = recorder

    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    setRecording(true)
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }, [])

  const reset = useCallback(() => {
    setAudio(null)
    setSeconds(0)
  }, [])

  return { recording, audio, seconds, error, start, stop, reset }
}
