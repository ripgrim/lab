export type Box = { x: number; y: number; w: number; h: number }

export type SkeletonPiece = Box & { kind: 'surface' | 'text' | 'icon'; opacity: number; radius?: string; fill?: string }

export type Rule = { axis: 'x' | 'y'; at: number; from: number; to: number }

export type Dimension = { axis: 'x' | 'y'; x: number; y: number; length: number; label: string; flip?: boolean }

export type Anatomy = {
  width: number
  height: number
  skeleton: SkeletonPiece[]
  outlines: Box[]
  bands: Box[]
  keylines: Rule[]
  edges: Rule[]
  dimensions: Dimension[]
}

const isTransparent = (color: string) => color === 'transparent' || /\/\s*0\)$|,\s*0\)$/.test(color)

const intersect = (a: Box, b: Box): Box | undefined => {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const w = Math.min(a.x + a.w, b.x + b.w) - x
  const h = Math.min(a.y + a.h, b.y + b.h) - y
  return w > 0.5 && h > 0.5 ? { x, y, w, h } : undefined
}

const round = (value: number) => String(Math.round(value))

export function measureAnatomy(root: HTMLElement, unit = 1): Anatomy {
  const rootRect = root.getBoundingClientRect()
  const scale = rootRect.width / root.offsetWidth || 1
  const local = (r: DOMRect): Box => ({
    x: (r.left - rootRect.left) / scale,
    y: (r.top - rootRect.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  })

  const state = new Map<Element, { opacity: number; clip: Box }>()
  state.set(root, { opacity: Number(getComputedStyle(root).opacity), clip: { x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight } })

  const rootStyle = getComputedStyle(root)
  const skeleton: SkeletonPiece[] = [
    { kind: 'surface', x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight, opacity: 1, radius: rootStyle.borderRadius, fill: rootStyle.backgroundColor },
  ]
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  for (let node = walker.nextNode() as Element | null; node; node = walker.nextNode() as Element | null) {
    const parent = state.get(node.parentElement!)
    if (!parent) continue
    const style = getComputedStyle(node)
    if (style.display === 'none') continue
    const skipped = node instanceof HTMLElement && node.dataset.anatomy === 'skip'
    const opacity = skipped ? 0 : parent.opacity * Number(style.opacity)
    const box = local(node.getBoundingClientRect())
    const clipped = style.overflow !== 'visible' || style.overflowX !== 'visible' ? intersect(parent.clip, box) : parent.clip
    if (!clipped) continue
    state.set(node, { opacity, clip: clipped })
    if (opacity < 0.02 || style.visibility === 'hidden') continue

    if (node instanceof SVGSVGElement) {
      const visible = intersect(parent.clip, box)
      if (visible) skeleton.push({ kind: 'icon', ...visible, opacity })
      continue
    }
    if (!(node instanceof HTMLElement) || node.closest('svg')) continue

    const marked = node.dataset.anatomy === 'surface'
    if (marked || (box.w >= 20 && box.h >= 20 && (!isTransparent(style.backgroundColor) || style.boxShadow !== 'none'))) {
      const visible = intersect(parent.clip, box)
      if (visible && Math.max(box.w, box.h) < 40) skeleton.push({ kind: 'icon', ...visible, opacity })
      else if (visible) {
        skeleton.push({
          kind: 'surface',
          ...visible,
          opacity,
          radius: style.borderRadius,
          fill: isTransparent(style.backgroundColor) ? 'var(--card)' : style.backgroundColor,
        })
      }
    }
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(child)
      for (const line of range.getClientRects()) {
        const b = local(line)
        const bar = Math.max(4, b.h * 0.42)
        const visible = intersect(clipped, { x: b.x, y: b.y + (b.h - bar) / 2, w: b.w, h: bar })
        if (visible) skeleton.push({ kind: 'text', ...visible, opacity })
      }
    }
  }

  const outlines: Box[] = []
  const bands: Box[] = []
  const keylines: Rule[] = []
  const edges: Rule[] = []
  const dimensions: Dimension[] = []
  const OFFSET = 12 * unit

  for (const node of root.querySelectorAll<HTMLElement | SVGElement>('[data-guide], [data-measure], [data-edge]')) {
    if ((state.get(node)?.opacity ?? 0) < 0.5) continue
    const box = local(node.getBoundingClientRect())
    const area = local((node.closest<HTMLElement>('[data-guide-root]') ?? root).getBoundingClientRect())
    const style = getComputedStyle(node)

    const axes = node.dataset.guide ?? ''
    if (axes.includes('x')) for (const at of [box.x, box.x + box.w]) keylines.push({ axis: 'x', at, from: area.y, to: area.y + area.h })
    if (axes.includes('y')) for (const at of [box.y, box.y + box.h]) keylines.push({ axis: 'y', at, from: area.x, to: area.x + area.w })

    for (const side of (node.dataset.edge ?? '').split(' ').filter(Boolean)) {
      if (side === 'bottom' || side === 'top') edges.push({ axis: 'y', at: side === 'top' ? box.y : box.y + box.h, from: area.x, to: area.x + area.w })
      if (side === 'left' || side === 'right') edges.push({ axis: 'x', at: side === 'left' ? box.x : box.x + box.w, from: area.y, to: area.y + area.h })
    }

    const measures = (node.dataset.measure ?? '').split(' ').filter(Boolean)
    if (measures.includes('outline')) outlines.push(box)
    const top = box.y - OFFSET
    const span = (x: number, w: number) => {
      if (w < 0.5) return
      bands.push({ x, y: box.y, w, h: box.h })
      dimensions.push({ axis: 'x', x, y: top, length: w, label: round(w) })
    }
    for (const measure of measures) {
      if (measure === 'width') dimensions.push({ axis: 'x', x: box.x, y: top, length: box.w, label: round(box.w) })
      if (measure === 'height') {
        const at = node.dataset.measureAt
        const left = at === 'left'
        const x = left ? box.x - OFFSET : at ? box.x + box.w * Number(at) : box.x + box.w + OFFSET
        dimensions.push({ axis: 'y', x, y: box.y, length: box.h, label: round(box.h), flip: left })
      }
      if (measure === 'padding') {
        span(box.x, parseFloat(style.paddingLeft))
        span(box.x + box.w - parseFloat(style.paddingRight), parseFloat(style.paddingRight))
      }
      if (measure === 'gap') {
        const gap = parseFloat(style.columnGap)
        const first = node.firstElementChild
        if (gap && first) {
          const lead = local(first.getBoundingClientRect())
          span(lead.x + lead.w, gap)
        }
      }
    }
  }

  return { width: root.offsetWidth, height: root.offsetHeight, skeleton, outlines, bands, keylines, edges, dimensions }
}
