import gsap from 'gsap'
import { el } from './dom'
import type { SoundCue, SoundKind } from './sound'
import { builders, type Scene, type SceneType } from '../scenes'

export interface SceneCtx {
  el: HTMLElement
  tl: gsap.core.Timeline
  dur: number
  W: number
  H: number
  onFrame(fn: (t: number) => void): void
  cue(kind: SoundKind, t: number, opts?: Omit<SoundCue, 't' | 'kind'>): void
}
export interface SceneInfo {
  id: string
  type: SceneType
  start: number
  end: number
}
export interface Stage {
  master: gsap.core.Timeline
  duration: number
  scenes: SceneInfo[]
  cues: SoundCue[]
  seek(t: number): void
}

const NOT_PROPS = new Set(['duration', 'ease', 'delay', 'immediateRender', 'overwrite', 'stagger', 'startAt', 'data', 'id', 'transformOrigin', 'parent', 'keyframes'])

export function findOverlaps(master: gsap.core.Timeline, scenes: SceneInfo[]): string[] {
  const byTarget = new Map<object, { prop: string; start: number; end: number }[]>()
  for (const child of master.getChildren(true, true, false)) {
    const tween = child as gsap.core.Tween
    if (tween.duration() <= 0) continue
    let start = tween.startTime()
    for (let p = tween.parent; p && p !== master; p = p.parent) start += p.startTime()
    const vars = tween.vars as Record<string, unknown>
    const props = Object.keys(vars)
      .filter((k) => !NOT_PROPS.has(k) && !k.startsWith('on'))
      .flatMap((k) => (k === 'attr' ? Object.keys(vars.attr as object).map((a) => `attr.${a}`) : [k]))
    if (Array.isArray(vars.keyframes)) {
      for (const kf of vars.keyframes as Record<string, unknown>[]) for (const k of Object.keys(kf)) if (!NOT_PROPS.has(k) && !props.includes(k)) props.push(k)
    }
    for (const target of tween.targets()) {
      const list = byTarget.get(target as object) ?? []
      for (const prop of props) list.push({ prop, start, end: start + tween.duration() })
      byTarget.set(target as object, list)
    }
  }
  const out: string[] = []
  for (const [target, list] of byTarget) {
    list.sort((a, b) => a.start - b.start)
    for (let i = 0; i < list.length; i++) {
      const clash = list.slice(i + 1).find((o) => o.prop === list[i].prop && o.start < list[i].end - 0.02)
      if (!clash) continue
      const node = target as HTMLElement
      const scene = scenes.find((s) => clash.start >= s.start && clash.start < s.end)
      const name = node.tagName ? `<${node.tagName.toLowerCase()} class="${node.className}">` : JSON.stringify(Object.keys(node))
      out.push(`${scene?.id ?? '?'}  ${name}  ${clash.prop}: ${list[i].start.toFixed(2)}–${list[i].end.toFixed(2)}s overlaps ${clash.start.toFixed(2)}–${clash.end.toFixed(2)}s`)
    }
  }
  return out
}

export function buildStage(root: HTMLElement, storyboard: Scene[], W: number, H: number, post?: (t: number) => void): Stage {
  const master = gsap.timeline({ paused: true })
  const scenes: SceneInfo[] = []
  const cues: SoundCue[] = []
  const hooks: { start: number; end: number; fn: (t: number) => void }[] = []
  let cursor = 0

  storyboard.forEach((cfg, i) => {
    const builder = builders[cfg.type] as { duration?(c: Scene): number; build(ctx: SceneCtx, c: Scene): void }
    const dur = cfg.duration ?? builder.duration?.(cfg)
    if (dur === undefined) throw new Error(`Scene #${i} (${cfg.type}) needs a duration`)
    const start = Math.max(0, cursor - (cfg.overlap ?? 0))
    const end = start + dur
    const id = cfg.id ?? `${cfg.type}-${i}`
    const node = el('div', `scene scene-${cfg.type}`, root)
    node.dataset.id = id
    node.style.zIndex = String(10 + (cfg.under ? 2 * i - 3 : 2 * i))
    const tl = gsap.timeline()
    builder.build(
      {
        el: node,
        tl,
        dur,
        W,
        H,
        onFrame: (fn) => hooks.push({ start, end, fn }),
        cue: (kind, t, opts) => cues.push({ ...opts, kind, t: start + t }),
      },
      cfg,
    )
    if (start === 0) node.style.visibility = 'visible'
    else master.set(node, { visibility: 'visible' }, start)
    master.add(tl, start)
    if (i < storyboard.length - 1) master.set(node, { visibility: 'hidden' }, end)
    scenes.push({ id, type: cfg.type, start, end })
    cursor = end
  })
  master.set({}, {}, cursor)

  const runHooks = () => {
    const t = master.time()
    for (const h of hooks) if (t >= h.start && t <= h.end) h.fn(t - h.start)
    post?.(t)
  }
  master.eventCallback('onUpdate', runHooks)
  const seek = (t: number) => {
    master.pause()
    master.time(Math.min(Math.max(t, 0), cursor))
    runHooks()
  }
  master.progress(1).progress(0)
  seek(0)
  return { master, duration: cursor, scenes, cues, seek }
}
