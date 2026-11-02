import { rng } from './dom'

export type SoundKind = 'tick' | 'pop' | 'click' | 'chime' | 'clack'

export interface SoundCue {
  t: number
  kind: SoundKind
  pan?: number
  gain?: number
  dur?: number
  pitch?: number
}

export interface Sound {
  l: Float32Array
  r: Float32Array
  sampleRate: number
}

const SR = 48000

export function synthesize(cues: SoundCue[], duration: number, opts: { volume?: number } = {}): Sound {
  const n = Math.ceil(duration * SR)
  const l = new Float32Array(n)
  const r = new Float32Array(n)
  const rand = rng(1)
  const vol = opts.volume ?? 0.5
  const put = (i: number, s: number, pan: number) => {
    if (i < 0 || i >= n) return
    const a = ((Math.min(1, Math.max(-1, pan)) + 1) * Math.PI) / 4
    l[i] += s * Math.cos(a)
    r[i] += s * Math.sin(a)
  }
  const voices: Record<SoundKind, (c: SoundCue, i0: number, g: number, pan: number) => void> = {
    tick: (_, i0, g, pan) => {
      for (let k = 0; k < 0.012 * SR; k++) put(i0 + k, (rand() * 2 - 1) * Math.exp(-k / (0.002 * SR)) * g, pan)
    },
    pop: (c, i0, g, pan) => {
      const f = c.pitch ?? 660
      for (let k = 0; k < 0.08 * SR; k++) put(i0 + k, Math.sin((2 * Math.PI * f * k) / SR) * Math.exp(-k / (0.015 * SR)) * g * 0.6, pan)
    },
    click: (c, i0, g, pan) => {
      const f = c.pitch ?? 2400
      let low = 0
      for (let k = 0; k < 0.03 * SR; k++) {
        low += ((rand() * 2 - 1) - low) * 0.35
        const body = Math.sin((2 * Math.PI * f * k) / SR) * Math.exp(-k / (0.0015 * SR)) * 0.5
        put(i0 + k, (low * Math.exp(-k / (0.004 * SR)) + body) * g * 0.7, pan)
      }
    },
    chime: (c, i0, g, pan) => {
      const f = c.pitch ?? 1046.5
      for (let k = 0; k < 1.1 * SR; k++) {
        const attack = Math.min(1, k / (0.004 * SR))
        const s = Math.sin((2 * Math.PI * f * k) / SR) * Math.exp(-k / (0.32 * SR)) + 0.45 * Math.sin((2 * Math.PI * f * 2.76 * k) / SR) * Math.exp(-k / (0.12 * SR))
        put(i0 + k, s * attack * g * 0.32, pan)
      }
    },
    clack: (_, i0, g, pan) => {
      let low = 0
      for (let k = 0; k < 0.06 * SR; k++) {
        low += ((rand() * 2 - 1) - low) * 0.18
        const thump = Math.sin((2 * Math.PI * 170 * k) / SR) * Math.exp(-k / (0.012 * SR))
        put(i0 + k, (low * 1.6 * Math.exp(-k / (0.006 * SR)) + thump * 0.7) * g, pan)
      }
    },
  }
  for (const c of cues) voices[c.kind](c, Math.round(c.t * SR), vol * (c.gain ?? 1), c.pan ?? 0)
  return { l, r, sampleRate: SR }
}

export function wavBase64(s: Sound): string {
  const n = s.l.length
  const v = new DataView(new ArrayBuffer(44 + n * 4))
  const text = (o: number, str: string) => [...str].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  text(0, 'RIFF')
  v.setUint32(4, 36 + n * 4, true)
  text(8, 'WAVEfmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 2, true)
  v.setUint32(24, s.sampleRate, true)
  v.setUint32(28, s.sampleRate * 4, true)
  v.setUint16(32, 4, true)
  v.setUint16(34, 16, true)
  text(36, 'data')
  v.setUint32(40, n * 4, true)
  const pcm = (x: number) => Math.round(Math.max(-1, Math.min(1, x)) * 32767)
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 4, pcm(s.l[i]), true)
    v.setInt16(46 + i * 4, pcm(s.r[i]), true)
  }
  const bytes = new Uint8Array(v.buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
