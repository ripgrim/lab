import type { Anatomy, Box, Rule } from './measure'

export type PaintedAnatomy = {
  skeletonLayer: HTMLElement
  guideLayer: HTMLElement
  keylines: HTMLElement[]
  edges: HTMLElement[]
  outlines: HTMLElement[]
  bands: HTMLElement[]
  dimensions: HTMLElement[]
  badges: HTMLElement[]
}

const signal = (percent: number) => `color-mix(in oklch, var(--signal) ${percent}%, transparent)`

const layer = (parent: HTMLElement, name: string) => {
  const node = document.createElement('div')
  node.className = `anatomy-${name}`
  Object.assign(node.style, { position: 'absolute', inset: '0', pointerEvents: 'none' })
  parent.appendChild(node)
  return node
}

const block = (parent: HTMLElement, className: string, { x, y, w, h }: Box, style: Partial<CSSStyleDeclaration>, run?: 'x' | 'y') => {
  const node = document.createElement('div')
  node.className = className
  if (run) node.dataset.run = run
  Object.assign(node.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, boxSizing: 'border-box' }, style)
  parent.appendChild(node)
  return node
}

const ruleBox = (rule: Rule, line: number): Box =>
  rule.axis === 'x' ? { x: rule.at - line / 2, y: rule.from, w: line, h: rule.to - rule.from } : { x: rule.from, y: rule.at - line / 2, w: rule.to - rule.from, h: line }

export function paintAnatomy(parent: HTMLElement, anatomy: Anatomy, unit = 1): PaintedAnatomy {
  const line = 1.5 * unit
  const skeletonLayer = layer(parent, 'skeleton')
  const guideLayer = layer(parent, 'guides')

  for (const piece of anatomy.skeleton) {
    block(skeletonLayer, `anatomy-piece anatomy-${piece.kind}`, piece, {
      opacity: String(piece.opacity),
      borderRadius: piece.kind === 'surface' ? piece.radius! : piece.kind === 'text' ? '999px' : '4px',
      background: piece.kind === 'surface' ? piece.fill! : 'var(--skeleton)',
      boxShadow: piece.kind === 'surface' ? 'var(--elevation-hairline)' : '',
    })
  }

  const dash = (axis: 'x' | 'y') =>
    `repeating-linear-gradient(${axis === 'x' ? 'to bottom' : 'to right'}, ${signal(70)} 0 ${5 * unit}px, transparent ${5 * unit}px ${9 * unit}px)`

  const keylines = anatomy.keylines.map((rule) =>
    block(guideLayer, 'anatomy-keyline', ruleBox(rule, line), { background: dash(rule.axis), transformOrigin: rule.axis === 'x' ? '50% 0' : '0 50%' }, rule.axis === 'x' ? 'y' : 'x'),
  )

  const edges = anatomy.edges.map((rule) =>
    block(guideLayer, 'anatomy-edge', ruleBox(rule, line), { background: 'var(--signal)', transformOrigin: rule.axis === 'x' ? '50% 0' : '0 50%' }, rule.axis === 'x' ? 'y' : 'x'),
  )

  const bands = anatomy.bands.map((box) => block(guideLayer, 'anatomy-band', box, { background: signal(22) }))

  const outlines = anatomy.outlines.map((box) =>
    block(guideLayer, 'anatomy-outline', box, { boxShadow: `inset 0 0 0 ${line}px ${signal(85)}`, borderRadius: `${6 * unit}px` }),
  )

  const cap = 9 * unit
  const dimensions: HTMLElement[] = []
  const badges: HTMLElement[] = []
  for (const dim of anatomy.dimensions) {
    const horizontal = dim.axis === 'x'
    const box = horizontal ? { x: dim.x, y: dim.y - cap / 2, w: dim.length, h: cap } : { x: dim.x - cap / 2, y: dim.y, w: cap, h: dim.length }
    const stem = horizontal ? `linear-gradient(var(--signal), var(--signal)) center / 100% ${line}px no-repeat` : `linear-gradient(var(--signal), var(--signal)) center / ${line}px 100% no-repeat`
    const caps = horizontal
      ? { borderLeft: `${line}px solid var(--signal)`, borderRight: `${line}px solid var(--signal)` }
      : { borderTop: `${line}px solid var(--signal)`, borderBottom: `${line}px solid var(--signal)` }
    const node = block(guideLayer, 'anatomy-dimension', box, {})
    dimensions.push(block(node, 'anatomy-dimension-line', { x: 0, y: 0, w: box.w, h: box.h }, { background: stem, transformOrigin: 'center', ...caps }, dim.axis))

    const badge = document.createElement('div')
    badge.className = 'anatomy-badge'
    badge.textContent = dim.label
    Object.assign(badge.style, {
      position: 'absolute',
      ...(horizontal ? { left: '50%', bottom: `${cap / 2 + 4 * unit}px`, translate: '-50% 0' } : dim.flip ? { top: '50%', right: `${cap / 2 + 5 * unit}px`, translate: '0 -50%' } : { top: '50%', left: `${cap / 2 + 5 * unit}px`, translate: '0 -50%' }),
      minWidth: `${22 * unit}px`,
      padding: `0 ${6 * unit}px`,
      borderRadius: '999px',
      background: 'var(--signal)',
      color: 'oklch(0.99 0 0)',
      font: `600 ${12 * unit}px/${20 * unit}px 'Geist Variable', ui-sans-serif, sans-serif`,
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      boxShadow: `0 0 0 ${2 * unit}px var(--background), 0 ${unit}px ${4 * unit}px oklch(0 0 0 / 0.25)`,
      zIndex: '1',
    })
    node.appendChild(badge)
    badges.push(badge)
  }

  return { skeletonLayer, guideLayer, keylines, edges, outlines, bands, dimensions, badges }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const settle = (p: number) => 1 - Math.pow(1 - p, 4)

export function revealAnatomy(painted: PaintedAnatomy, progress: number) {
  const stage = (from: number, to: number) => settle(clamp01((progress - from) / (to - from)))
  const draw = (node: HTMLElement, p: number) => (node.style.scale = node.dataset.run === 'x' ? `${p} 1` : `1 ${p}`)
  const rules = stage(0, 0.4)
  for (const node of [...painted.keylines, ...painted.edges]) draw(node, rules)
  const fills = stage(0.25, 0.6)
  for (const node of [...painted.bands, ...painted.outlines]) node.style.opacity = String(fills)
  const dims = stage(0.45, 0.8)
  for (const node of painted.dimensions) draw(node, dims)
  const labels = stage(0.65, 1)
  for (const badge of painted.badges) Object.assign(badge.style, { opacity: String(labels), scale: String(0.85 + 0.15 * labels) })
}
