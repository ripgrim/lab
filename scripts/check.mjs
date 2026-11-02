import { parseArgs } from 'node:util'
import { describe, openFilm, probe, shuffle } from './lib.mjs'

const NOISE = 12
const NOISY_SHARE = 0.0005

async function rasterNoise(browser, a, b) {
  const page = await browser.newPage()
  try {
    return await page.evaluate(
      async ({ a, b, limit, share }) => {
        const load = async (src) => createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob())
        const [ia, ib] = await Promise.all([load(a), load(b)])
        if (ia.width !== ib.width || ia.height !== ib.height) return false
        const read = (img) => {
          const canvas = new OffscreenCanvas(img.width, img.height)
          const g = canvas.getContext('2d')
          g.drawImage(img, 0, 0)
          return g.getImageData(0, 0, img.width, img.height).data
        }
        const da = read(ia)
        const db = read(ib)
        let off = 0
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.abs(0.2126 * (da[i] - db[i]) + 0.7152 * (da[i + 1] - db[i + 1]) + 0.0722 * (da[i + 2] - db[i + 2]))
          if (d > limit * 4) return false
          if (d > limit) off++
        }
        return off <= (da.length / 4) * share
      },
      { a: a.toString('base64'), b: b.toString('base64'), limit: NOISE, share: NOISY_SHARE },
    )
  } finally {
    await page.close()
  }
}

const { values: arg } = parseArgs({ options: { film: { type: 'string' }, theme: { type: 'string' } } })

const film = await openFilm(arg.film, 5198, arg.theme)
let failed = false
try {
  const page = await film.open(await film.browser.newContext({ deviceScaleFactor: 0.5 }))
  const info = await probe(page)
  console.log(describe(info))
  await page.setViewportSize({ width: info.width, height: info.height })

  const clashes = await page.evaluate(() => window.__video.overlaps())
  if (clashes.length) {
    failed = true
    console.log(`\n${clashes.length} overlapping tweens:\n` + clashes.map((c) => '  ' + c).join('\n'))
  } else console.log('\nNo overlapping tweens.')

  const last = Math.round(info.duration * info.fps) - 1
  const set = new Set(Array.from({ length: 40 }, (_, i) => Math.round((i / 39) * last)))
  for (const s of info.scenes) for (const f of [Math.round(s.start * info.fps), Math.round(s.end * info.fps) - 1]) set.add(Math.min(last, Math.max(0, f)))
  const frames = [...set].sort((a, b) => a - b)
  const shot = async (f) => {
    await page.evaluate((t) => window.__video.show(t), f / info.fps)
    return page.screenshot({ type: 'png' })
  }
  const inOrder = new Map()
  for (const f of frames) inOrder.set(f, await shot(f))
  const differ = []
  let noisy = 0
  for (const f of shuffle(frames)) {
    const again = await shot(f)
    if (again.equals(inOrder.get(f))) continue
    if (await rasterNoise(film.browser, inOrder.get(f), again)) noisy++
    else differ.push(f)
  }
  if (differ.length) {
    failed = true
    console.log(`${differ.length} of ${frames.length} frames differ when seeked out of order: ` + differ.map((f) => `${(f / info.fps).toFixed(2)}s`).join(', '))
  } else console.log(`Scrub exact: ${frames.length} frames identical in and out of order${noisy ? ` (${noisy} with antialiasing noise only: no pixel's brightness off by more than ${NOISE * 4}, under ${NOISY_SHARE * 100}% off by more than ${NOISE})` : ''}.`)
} finally {
  await film.close()
}
process.exitCode = failed ? 1 : 0
