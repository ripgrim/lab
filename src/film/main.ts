import '../index.css'
import './film.css'
import gsap from 'gsap'
import { el } from './engine/dom'
import { registerMotion } from './engine/motion'
import { synthesize, wavBase64, type Sound } from './engine/sound'
import { buildStage, findOverlaps, type Stage } from './engine/stage'
import { filmSlugs, loadFilm, type Film } from '../films'

const filmSlugToSpecimen = (film: string) => film.replace(/-anatomy$/, '')

declare global {
  interface Window {
    __video?: {
      film: string
      theme: 'light' | 'dark'
      duration: number
      fps: number
      width: number
      height: number
      scenes: Stage['scenes']
      cues: Stage['cues']
      seek(t: number): void
      show(t: number): Promise<void>
      overlaps(): string[]
      get(selector: string, prop: string): number
      wav(): Promise<string>
    }
  }
}

const stageEl = document.getElementById('stage')!
const viewport = document.getElementById('viewport')!
const params = new URLSearchParams(location.search)

async function boot() {
  const slug = params.get('film') ?? filmSlugs[0]
  const film = await loadFilm(slug)
  const { width: W, height: H, fps } = film.video
  document.title = `${slug} · Film`
  Object.assign(stageEl.style, { width: `${W}px`, height: `${H}px` })
  const dark = params.has('theme') ? params.get('theme') === 'dark' : (film.theme.dark ?? false)
  document.documentElement.classList.toggle('dark', dark)
  for (const [name, value] of Object.entries(film.theme.vars)) stageEl.style.setProperty(name, value)
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => undefined)))
  await document.fonts.ready
  registerMotion(film.theme.motion)
  const stage = buildStage(stageEl, film.storyboard, W, H)
  let track: Sound | undefined
  const soundtrack = () => (track ??= synthesize(stage.cues, stage.duration, film.theme.sound))
  window.__video = {
    film: slug,
    theme: dark ? 'dark' : 'light',
    duration: stage.duration,
    fps,
    width: W,
    height: H,
    scenes: stage.scenes,
    cues: stage.cues,
    seek: stage.seek,
    show: async (t) => stage.seek(t),
    overlaps: () => findOverlaps(stage.master, stage.scenes),
    get: (selector, prop) => {
      const node = stageEl.querySelector(selector)
      return node ? Number(gsap.getProperty(node, prop)) : NaN
    },
    wav: async () => (stage.cues.length ? wavBase64(soundtrack()) : ''),
  }
  for (const c of window.__video.overlaps()) console.warn('Overlapping tweens:', c)
  if (params.has('render')) return void document.body.classList.add('render')
  player(stage, film, soundtrack)
}

function player(stage: Stage, film: Film, soundtrack: () => Sound) {
  const { master, duration, scenes } = stage
  const { width: W, height: H, fps } = film.video
  const fit = () => {
    const s = Math.min(viewport.clientWidth / W, viewport.clientHeight / H)
    stageEl.style.transform = `translate(${(viewport.clientWidth - W * s) / 2}px, ${(viewport.clientHeight - H * s) / 2}px) scale(${s})`
  }
  addEventListener('resize', fit)
  fit()

  let muted = localStorage.getItem('film-muted') === '1'
  let audio: AudioContext | undefined
  let buffer: AudioBuffer | undefined
  let source: AudioBufferSourceNode | undefined
  let started = { film: 0, clock: 0 }
  const quiet = () => {
    source?.stop()
    source = undefined
  }
  const sound = () => {
    quiet()
    if (muted || master.paused() || !stage.cues.length) return
    audio ??= new AudioContext()
    void audio.resume()
    if (!buffer) {
      const s = soundtrack()
      buffer = audio.createBuffer(2, s.l.length, s.sampleRate)
      buffer.getChannelData(0).set(s.l)
      buffer.getChannelData(1).set(s.r)
    }
    source = audio.createBufferSource()
    source.buffer = buffer
    source.connect(audio.destination)
    const latency = (audio.outputLatency || 0) + (audio.baseLatency || 0)
    const at = master.time()
    source.start(0, Math.min(Math.max(0, at + latency), duration - 0.01))
    started = { film: at, clock: audio.currentTime }
  }

  const ui = document.getElementById('ui')!
  const row = el('div', 'row', ui)
  const back = el('a', 'play', row, '← Component')
  const from = params.get('from') ?? filmSlugToSpecimen(params.get('film') ?? '')
  back.href = `/#/s/${from}`
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') location.href = back.href
  })
  const playBtn = el('button', 'play', row, 'Play')
  playBtn.type = 'button'
  const themeBtn = el('button', 'play', row)
  themeBtn.type = 'button'
  const setThemeLabel = () => (themeBtn.textContent = document.documentElement.classList.contains('dark') ? 'Dark' : 'Light')
  setThemeLabel()
  const flipTheme = () => {
    const html = document.documentElement
    const next = !html.classList.contains('dark')
    html.classList.toggle('dark', next)
    params.set('theme', next ? 'dark' : 'light')
    history.replaceState(null, '', `?${params}`)
    window.__video!.theme = next ? 'dark' : 'light'
    stage.seek(master.time())
    setThemeLabel()
  }
  themeBtn.onclick = flipTheme
  const time = el('span', 'time', row)
  const hint = el('span', 'hint', row)
  const track = el('div', 'track', ui)
  const segs = scenes.map((s) => {
    const seg = el('div', 'seg', track, s.id)
    Object.assign(seg.style, { left: `${(s.start / duration) * 100}%`, width: `${((s.end - s.start) / duration) * 100}%` })
    return seg
  })
  const head = el('div', 'head', track)
  let loop: { start: number; end: number } | undefined
  const setHint = () => (hint.textContent = `space play · ←/→ frame · shift 1s · [ ] scene · L loop${loop ? ' on' : ''} · M sound ${muted ? 'off' : 'on'} · T theme`)
  setHint()

  const seek = (t: number) => {
    stage.seek(Math.min(Math.max(t, 0), duration))
    if (source) sound()
  }
  gsap.ticker.add(() => {
    if (loop && !master.paused() && master.time() >= loop.end - 1e-3) {
      master.time(loop.start)
      sound()
    }
    if (source && master.paused()) quiet()
    if (source && audio && Math.abs(started.film + (audio.currentTime - started.clock) - master.time()) > 0.06) sound()
    const t = master.time()
    time.textContent = `${t.toFixed(2)} / ${duration.toFixed(2)}s  f${Math.round(t * fps)}`
    head.style.left = `${(t / duration) * 100}%`
    scenes.forEach((s, i) => segs[i].classList.toggle('on', t >= s.start && t < s.end))
    playBtn.textContent = master.paused() ? 'Play' : 'Pause'
    sessionStorage.setItem(`film-t-${params.get('film')}`, String(t))
  })
  const toggle = () => {
    if (!master.paused()) return void master.pause()
    if (master.time() >= duration - 1e-3) stage.seek(0)
    master.play()
    sound()
  }
  playBtn.onclick = toggle
  const scrub = (e: PointerEvent) => {
    const r = track.getBoundingClientRect()
    seek(((e.clientX - r.left) / r.width) * duration)
  }
  track.onpointerdown = (e) => {
    track.setPointerCapture(e.pointerId)
    scrub(e)
    track.onpointermove = scrub
  }
  track.onpointerup = () => (track.onpointermove = null)
  addEventListener('keydown', (e) => {
    const t = master.time()
    const step = e.shiftKey ? 1 : 1 / fps
    const key = e.key.toLowerCase()
    if (e.key === ' ') toggle()
    else if (e.key === 'ArrowRight') seek(Math.round((t + step) * fps) / fps)
    else if (e.key === 'ArrowLeft') seek(Math.round((t - step) * fps) / fps)
    else if (e.key === ']') seek(scenes.find((s) => s.start > t + 1e-3)?.start ?? duration)
    else if (e.key === '[') seek([...scenes].reverse().find((s) => s.start < t - 0.2)?.start ?? 0)
    else if (key === 'l') {
      const s = scenes.find((s) => t >= s.start && t < s.end)
      loop = loop || !s ? undefined : { start: s.start, end: s.end }
      setHint()
    } else if (key === 't') flipTheme()
    else if (key === 'm') {
      muted = !muted
      localStorage.setItem('film-muted', muted ? '1' : '0')
      sound()
      setHint()
    } else return
    e.preventDefault()
  })
  seek(Number(sessionStorage.getItem(`film-t-${params.get('film')}`) ?? 0))
}

boot()
