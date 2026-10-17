import { useCallback, useEffect, useRef, useState } from 'react'

// Wraps an <audio> element: play state, current time and duration.
// MediaRecorder webm files often report duration = Infinity until the browser has
// scanned the whole file, so we seek far ahead once to force it to compute it.
export function useAudio(src: string | undefined) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let fixing = false
    setPlaying(false)
    setCurrent(0)
    setDuration(null)

    const readDuration = () => {
      if (el.duration === Infinity && !fixing) {
        fixing = true
        el.currentTime = 1e101
      } else if (Number.isFinite(el.duration)) {
        setDuration(el.duration)
        if (fixing) {
          fixing = false
          el.currentTime = 0
        }
      }
    }
    const onTime = () => {
      if (!fixing) setCurrent(el.currentTime)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }

    el.addEventListener('loadedmetadata', readDuration)
    el.addEventListener('durationchange', readDuration)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    if (el.readyState >= 1) readDuration()
    return () => {
      el.removeEventListener('loadedmetadata', readDuration)
      el.removeEventListener('durationchange', readDuration)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [src])

  const toggle = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (el.paused) el.play().catch((err) => console.error('Audio playback failed', err))
    else el.pause()
  }, [])

  const pause = useCallback(() => ref.current?.pause(), [])

  return { ref, playing, current, duration, toggle, pause }
}
