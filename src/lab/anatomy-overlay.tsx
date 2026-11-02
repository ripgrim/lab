import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { measureAnatomy } from '@/anatomy/measure'
import { paintAnatomy, revealAnatomy } from '@/anatomy/paint'

export type AnatomyMode = 'ui' | 'skeleton' | 'guides'

const REVEAL_MS = 900

export function AnatomyOverlay({ mode, children }: { mode: AnatomyMode; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = host.current?.firstElementChild as HTMLElement | null
    const layer = overlay.current
    if (!root || !layer || mode === 'ui') return
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches
    const started = performance.now()
    let frame = 0
    const paint = (now: number) => {
      layer.replaceChildren()
      const unit = root.offsetWidth / root.getBoundingClientRect().width || 1
      const painted = paintAnatomy(layer, measureAnatomy(root, unit), unit)
      painted.guideLayer.hidden = mode !== 'guides'
      revealAnatomy(painted, instant ? 1 : Math.min(1, (now - started) / REVEAL_MS))
      frame = requestAnimationFrame(paint)
    }
    paint(started)
    return () => {
      cancelAnimationFrame(frame)
      layer.replaceChildren()
    }
  }, [mode])

  return (
    <>
      <div ref={host} data-specimen className="transition-opacity duration-200 ease-out" style={{ opacity: mode === 'ui' ? 1 : 0 }}>
        {children}
      </div>
      <div ref={overlay} className="pointer-events-none absolute inset-0" aria-hidden />
    </>
  )
}
