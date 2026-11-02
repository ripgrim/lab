export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
export const easeDrawer = (p: number) => 1 - Math.pow(1 - p, 4)

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function tween(from: number, to: number, ms: number, onUpdate: (value: number) => void, ease = easeOut, onDone?: () => void) {
  if (reduced() || ms <= 0) {
    onUpdate(to)
    onDone?.()
    return () => {}
  }
  const start = performance.now()
  let frame = requestAnimationFrame(function step(now) {
    const p = Math.min(1, (now - start) / ms)
    onUpdate(from + (to - from) * ease(p))
    if (p < 1) frame = requestAnimationFrame(step)
    else onDone?.()
  })
  return () => cancelAnimationFrame(frame)
}
