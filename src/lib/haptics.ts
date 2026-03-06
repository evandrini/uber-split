export function hapticPulse(pattern: number | number[] = 10) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return
  }

  navigator.vibrate(pattern)
}
