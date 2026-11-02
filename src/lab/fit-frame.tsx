import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FitFrame({ width, height, padding = 0, className, children }: { width: number; height: number; padding?: number; className?: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const node = outer.current
    if (!node) return
    const fit = () => setScale(Math.min(1, (node.clientWidth - padding * 2) / width, (node.clientHeight - padding * 2) / height))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    return () => observer.disconnect()
  }, [width, height, padding])

  return (
    <div ref={outer} className={cn('relative grid place-items-center overflow-hidden', className)}>
      <div style={{ width: width * scale, height: height * scale }}>
        <div className="relative origin-top-left" style={{ width, height, scale: String(scale), visibility: scale ? undefined : 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
