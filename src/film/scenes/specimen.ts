import gsap from 'gsap'
import { measureAnatomy, type Box } from '@/anatomy/measure'
import { paintAnatomy, revealAnatomy } from '@/anatomy/paint'
import { findSpecimen } from '@/specimens'
import { el } from '../engine/dom'
import { curves } from '../engine/motion'
import { mountReact } from '../engine/react'
import type { SoundKind } from '../engine/sound'
import type { SceneCtx } from '../engine/stage'

export type Look = { ui: number; skeleton: number; guides: number }

export type Beat = {
  at: number
  over?: number
  cursor?: string
  click?: string
  camera?: string
  zoom?: number
  anchor?: [number, number]
  vars?: Record<string, number>
  values?: Record<string, number>
  follow?: string
  sound?: SoundKind
  hand?: 'arrow' | 'grab'
  look?: Partial<Look>
  ease?: string
}

export interface SpecimenScene {
  type: 'specimen'
  duration: number
  specimen: string
  fit?: number
  pill?: { options: string[]; active: string }
  cursorFrom?: [number, number]
  values?: Record<string, number>
  beats: Beat[]
}

const CURSOR = `<svg width="22" height="24" viewBox="0 0 22 24" fill="none"><path d="M3.5 2.2v17.6c0 .7.8 1 1.3.5l4.2-4.3 2.9 6.3c.2.5.8.7 1.3.5l2.1-1c.5-.2.7-.8.5-1.3l-2.9-6.2h6c.7 0 1-.8.5-1.3L4.8 1.7c-.5-.5-1.3-.1-1.3.5Z" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>`

const FIST_PATH = 'M7.6 6.2c.9 0 1.6.6 1.7 1.4.3-.6.9-1 1.6-1 .8 0 1.4.5 1.6 1.2.3-.4.8-.6 1.4-.6 1 0 1.8.8 1.8 1.8v.5c.3-.2.6-.3 1-.3 1 0 1.8.8 1.8 1.8v3.3c0 3.5-2.6 6.2-6 6.2h-1.3c-1.7 0-3.3-.8-4.3-2.2l-2.3-3.2c-.5-.7-.4-1.7.3-2.2.6-.5 1.5-.4 2 .2l.4.5V8c0-1 .8-1.8 1.8-1.8Z'
const FIST = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="${FIST_PATH}" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.3 7.6v3.2M12.5 8v2.8M15.9 9.4v2" stroke="white" stroke-width="1.1" stroke-linecap="round"/></svg>`

const center = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2]

export const specimen = {
  build(ctx: SceneCtx, cfg: SpecimenScene) {
    const { tl, W, H } = ctx
    const entry = findSpecimen(cfg.specimen)
    if (!entry) throw new Error(`No specimen "${cfg.specimen}"`)

    const camera = el('div', 'film-camera', ctx.el)
    Object.assign(camera.style, { position: 'absolute', left: '0', top: '0', width: `${entry.width}px`, height: `${entry.height}px`, transformOrigin: '0 0' })
    const host = el('div', 'film-specimen', camera)
    const values: Record<string, number> = { ...cfg.values }
    const mounted = mountReact(host, entry.Component, { t: 0, values: { ...values } })
    const root = mounted.node
    const overlay = el('div', 'film-overlay', camera)
    Object.assign(overlay.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '999' })

    const pillItems = new Map<string, HTMLElement>()
    let pillHeight = 0
    if (cfg.pill) {
      const pill = el('div', 'film-pill absolute left-1/2 flex -translate-x-1/2 gap-0.5 rounded-[10px] bg-muted p-0.5 shadow-inset', camera)
      pill.style.top = `${entry.height + 28}px`
      for (const option of cfg.pill.options) pillItems.set(option, el('div', 'flex h-7 items-center rounded-[8px] px-3.5 text-[13px] font-medium text-muted-foreground', pill, option))
      pillHeight = pill.offsetHeight + 28
    }

    const cursor = el('div', 'film-cursor', camera)
    Object.assign(cursor.style, { position: 'absolute', left: '0', top: '0', zIndex: '1000' })
    const sizer = el('div', 'film-cursor-size', cursor)
    const pointer = el('div', 'film-pointer', sizer)
    pointer.innerHTML = CURSOR
    Object.assign(pointer.style, { position: 'absolute', left: '-3.5px', top: '-2px', transformOrigin: '3.5px 2px', filter: 'drop-shadow(0 1px 2px oklch(0 0 0 / 0.3))' })

    const boxOf = (target: string): Box => {
      const origin = root.getBoundingClientRect()
      const localScale = origin.width / root.offsetWidth || 1
      const node = target.startsWith('pill:') ? pillItems.get(target.slice(5)) : root.querySelector(target)
      if (!node) throw new Error(`No target "${target}" in ${cfg.specimen}`)
      const r = node.getBoundingClientRect()
      return { x: (r.left - origin.left) / localScale, y: (r.top - origin.top) / localScale, w: r.width / localScale, h: r.height / localScale }
    }

    const totalH = entry.height + pillHeight
    const s0 = (cfg.fit ?? 0.92) * Math.min(W / entry.width, H / totalH)
    const full = { x: (W - s0 * entry.width) / 2, y: (H - s0 * totalH) / 2, scale: s0 }
    const frame = (target: string, zoom = 1, [ax, ay]: [number, number] = [0.5, 0.5]) => {
      if (target === 'full') return full
      const scale = s0 * zoom
      const [cx, cy] = center(boxOf(target))
      return { x: W * ax - scale * cx, y: H * ay - scale * cy, scale }
    }
    gsap.set(camera, full)

    const [fromX, fromY] = cfg.cursorFrom ?? [entry.width * 0.62, entry.height * 0.72]
    gsap.set(cursor, { opacity: cfg.beats.some((b) => b.cursor || b.click || b.follow) ? 1 : 0 })
    type Move = { start: number; end: number; to: [number, number]; follow?: string }
    const moves: Move[] = []
    const hands = cfg.beats.filter((b) => b.hand).map((b) => ({ at: b.at, hand: b.hand! })).sort((a, b) => a.at - b.at)
    const fist = el('div', 'film-fist', sizer)
    fist.innerHTML = FIST
    Object.assign(fist.style, { position: 'absolute', left: '-12px', top: '-12px', filter: 'drop-shadow(0 1px 2px oklch(0 0 0 / 0.3))', visibility: 'hidden' })

    const look: Look = { ui: 1, skeleton: 0, guides: 0 }
    const picks: { t: number; option: string }[] = cfg.pill ? [{ t: -1, option: cfg.pill.active }] : []

    const settled = { ...values }
    for (const beat of cfg.beats) {
      if (beat.values) Object.assign(settled, beat.values)
      const travel = beat.cursor ?? beat.click
      if (travel) {
        const over = beat.over ?? 0.7
        mounted.render({ t: beat.at, values: { ...settled } })
        moves.push({ start: beat.at - over, end: beat.at, to: center(boxOf(travel)) })
      }
      const respond = beat.click ? beat.at + 0.06 : beat.at
      if (beat.click) {
        tl.to(pointer, { keyframes: [{ scale: 0.86, duration: 0.07, ease: 'press' }, { scale: 1, duration: 0.16, ease: 'settle' }] }, beat.at)
        ctx.cue('click', beat.at)
        if (beat.click.startsWith('pill:')) picks.push({ t: beat.at, option: beat.click.slice(5) })
      }
      if (beat.sound) ctx.cue(beat.sound, beat.at)
      if (beat.values) tl.to(values, { ...beat.values, duration: beat.over ?? 0.3, ease: beat.ease ?? 'glide' }, respond)
      if (beat.follow) {
        const end = respond + (beat.over ?? 0.3)
        mounted.render({ t: end, values: { ...settled } })
        moves.push({ start: beat.at, end, to: center(boxOf(beat.follow)), follow: beat.follow })
      }
      if (beat.vars) tl.to(root, { ...beat.vars, duration: beat.over ?? 0.3, ease: beat.ease ?? 'drawer' }, respond)
      if (beat.look) tl.to(look, { ...beat.look, duration: beat.over ?? 0.5, ease: beat.ease ?? 'settle' }, respond)
      if (beat.camera) tl.to(camera, { ...frame(beat.camera, beat.zoom, beat.anchor), duration: beat.over ?? 1.4, ease: beat.ease ?? 'glide' }, beat.at)
    }

    moves.sort((a, b) => a.start - b.start)
    mounted.render({ t: 0, values: { ...values } })
    const paint = (t: number) => {
      mounted.render({ t, values: { ...values } })
      let [x, y] = [fromX, fromY]
      for (const move of moves) {
        if (t < move.start) break
        if (t >= move.end) {
          ;[x, y] = move.to
          continue
        }
        if (move.follow) [x, y] = center(boxOf(move.follow))
        else {
          const p = curves.glide((t - move.start) / (move.end - move.start))
          ;[x, y] = [x + (move.to[0] - x) * p, y + (move.to[1] - y) * p]
        }
        break
      }
      cursor.style.translate = `${x}px ${y}px`
      const grabbing = hands.filter((h) => h.at <= t).at(-1)?.hand === 'grab'
      pointer.style.visibility = grabbing ? 'hidden' : 'inherit'
      fist.style.visibility = grabbing ? 'inherit' : 'hidden'
      const scale = Number(gsap.getProperty(camera, 'scale'))
      sizer.style.scale = String(1.15 / scale)
      host.style.opacity = String(look.ui)
      overlay.replaceChildren()
      for (const [option, node] of pillItems) {
        const active = [...picks].reverse().find((p) => p.t <= t)?.option === option
        node.className = `flex h-7 items-center rounded-[8px] px-3.5 text-[13px] font-medium ${active ? 'bg-card text-foreground shadow-raised' : 'text-muted-foreground'}`
      }
      if (look.skeleton <= 0.001 && look.guides <= 0.001) return
      const unit = 1.1 / scale
      const painted = paintAnatomy(overlay, measureAnatomy(root, unit), unit)
      painted.skeletonLayer.style.opacity = String(look.skeleton)
      revealAnatomy(painted, look.guides)
    }
    ctx.onFrame(paint)
    paint(0)
  },
}
