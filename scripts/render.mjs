import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { describe, frameTimes, openFilm, probe as probeFilm, root } from './lib.mjs'

const { values: arg, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    film: { type: 'string' }, theme: { type: 'string' }, out: { type: 'string' }, height: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
    scene: { type: 'string' }, still: { type: 'boolean' }, sheet: { type: 'string' }, crop: { type: 'string' },
    workers: { type: 'string' }, audio: { type: 'string' }, 'no-sound': { type: 'boolean' }, remux: { type: 'boolean' },
    crf: { type: 'string', default: '20' }, preset: { type: 'string', default: 'medium' },
  },
})
const film = await openFilm(arg.film, 5199, arg.theme)

try {
  const probe = await film.browser.newContext()
  const probePage = await film.open(probe)
  const info = await probeFilm(probePage)
  console.log(describe(info))
  const outDir = resolve(root, 'out', arg.theme ? `${info.film}-${info.theme}` : info.film)
  mkdirSync(outDir, { recursive: true })
  let soundPath
  if (!arg.still && !arg.sheet && !arg.audio && !arg['no-sound']) {
    const wav = await probePage.evaluate(() => window.__video.wav())
    if (wav) writeFileSync((soundPath = resolve(outDir, 'sound.wav')), Buffer.from(wav, 'base64'))
  }
  await probe.close()

  if (arg.remux) {
    const audio = arg.audio ? resolve(arg.audio) : soundPath
    if (!audio) throw new Error('No soundtrack to remux: the film has no cues (or --no-sound was given)')
    const target = arg.out ? resolve(arg.out) : resolve(outDir, 'video.mp4')
    const tmp = target.replace(/\.mp4$/, '.remux.mp4')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', target, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', tmp])
    renameSync(tmp, target)
    console.log(`${target}  (new soundtrack)`)
    process.exit(0)
  }

  const context = await film.browser.newContext({
    viewport: { width: info.width, height: info.height },
    deviceScaleFactor: Number(arg.height ?? info.height) / info.height,
  })
  const [cx, cy, cw, ch] = arg.crop ? arg.crop.split(',').map(Number) : []
  const clip = arg.crop ? { x: cx, y: cy, width: cw, height: ch } : undefined
  const seekTo = (page, t) => page.evaluate((time) => window.__video.show(time), t)

  if (arg.still) {
    const t = Number(positionals[0] ?? 0)
    const page = await film.open(context)
    await seekTo(page, t)
    const path = arg.out ? resolve(arg.out) : resolve(outDir, `still-${t.toFixed(2)}.png`)
    await page.screenshot({ path, clip })
    console.log(path)
  } else {
    let from = Number(arg.from ?? 0)
    let to = Number(arg.to ?? info.duration)
    if (arg.scene) {
      const s = info.scenes.find((s) => s.id === arg.scene)
      if (!s) throw new Error(`No scene "${arg.scene}". Scenes: ${info.scenes.map((s) => s.id).join(', ')}`)
      ;[from, to] = [s.start, s.end]
    }
    const fps = Number(arg.sheet ?? info.fps)
    const frames = frameTimes(from, to, fps)
    const out = arg.out ? resolve(arg.out) : resolve(outDir, arg.sheet ? 'sheet.jpg' : arg.scene ? `${arg.scene}.mp4` : 'video.mp4')
    const input = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-']
    const audio = arg.audio ? resolve(arg.audio) : soundPath
    const cols = 6
    const ffArgs = arg.sheet
      ? [...input, '-vf', `scale=480:-1,tile=${cols}x${Math.ceil(frames.length / cols)}:padding=4`, '-frames:v', '1', '-q:v', '3', out]
      : [
          ...input,
          ...(audio ? ['-ss', String(from), '-i', audio] : []),
          '-c:v', 'libx264', '-preset', arg.preset, '-crf', arg.crf, '-pix_fmt', 'yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:in_range=pc:out_range=tv', '-movflags', '+faststart',
          ...(audio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
          out,
        ]
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] })
    const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())))

    const workers = Math.min(Number(arg.workers ?? Math.max(2, Math.floor(availableParallelism() / 2))), frames.length)
    const pages = await Promise.all(Array.from({ length: workers }, () => film.open(context)))
    const started = Date.now()
    const ready = new Map()
    let next = 0
    let written = 0
    let flushing = false
    let reported = 0
    const flush = async () => {
      if (flushing) return
      flushing = true
      while (ready.has(written)) {
        const ok = ff.stdin.write(ready.get(written))
        ready.delete(written++)
        if (!ok) await new Promise((r) => ff.stdin.once('drain', r))
      }
      flushing = false
      if (process.stdout.isTTY) process.stdout.write(`\r${written}/${frames.length} frames`)
      else if (written - reported >= frames.length / 10) console.log(`${(reported = written)}/${frames.length} frames`)
    }
    await Promise.all(
      pages.map(async (page) => {
        while (next < frames.length) {
          const i = next++
          while (i - written > workers * 8) await new Promise((r) => setTimeout(r, 4))
          await seekTo(page, frames[i])
          ready.set(i, await page.screenshot({ type: 'jpeg', quality: 96, clip }))
          await flush()
        }
      }),
    )
    while (ready.size) await flush()
    ff.stdin.end()
    await ffDone
    const what = arg.sheet ? `${frames.length} frames from ${from.toFixed(2)}s, ${(1 / fps).toFixed(2)}s apart, ${cols} per row` : `${frames.length} frames, ${(to - from).toFixed(2)}s${audio ? ', with sound' : ''}`
    console.log(`\n${out}  (${what}; ${((Date.now() - started) / 1000).toFixed(1)}s)`)
  }
} finally {
  await film.close()
}
