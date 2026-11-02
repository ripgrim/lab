import { parseArgs } from 'node:util'
import { frameTimes, openFilm, shuffle } from './lib.mjs'

const { values: arg, positionals } = parseArgs({ allowPositionals: true, options: { film: { type: 'string' }, theme: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, all: { type: 'boolean' } } })
const [selector, prop] = positionals
if (!selector || !prop) {
  console.error('usage: pnpm trace <selector> <prop> [--film slug] [--from s] [--to s] [--all]')
  process.exit(2)
}
const film = await openFilm(arg.film, 5197, arg.theme)
try {
  const page = await film.open(await film.browser.newContext())
  const { duration, fps } = await page.evaluate(() => ({ duration: window.__video.duration, fps: window.__video.fps }))
  const times = frameTimes(Number(arg.from ?? 0), Number(arg.to ?? duration), fps)
  const sample = (ts) => page.evaluate(({ ts, selector, prop }) => ts.map((t) => (window.__video.seek(t), window.__video.get(selector, prop))), { ts, selector, prop })
  const values = await sample(times)
  if (values.every(Number.isNaN)) throw new Error(`No element matches "${selector}"`)
  const order = shuffle(times.map((_, i) => i))
  const again = await sample(order.map((i) => times[i]))
  const mismatches = order.filter((i, k) => Math.abs(again[k] - values[i]) > 1e-6)

  const fmt = (v) => (Number.isNaN(v) ? 'NaN' : v.toFixed(3))
  const at = (i) => `${times[i].toFixed(3)}s`
  const steps = values.slice(1).map((v, i) => ({ i: i + 1, d: v - values[i] }))
  const jerks = values.slice(2).map((v, i) => ({ i: i + 1, d: v - 2 * values[i + 1] + values[i] }))
  const top = (list) => [...list].sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5)
  const finite = values.filter((v) => !Number.isNaN(v))

  console.log(`${selector} ${prop}: ${times.length} frames ${at(0)}–${at(times.length - 1)}`)
  console.log(`  first ${fmt(values[0])} · last ${fmt(values.at(-1))} · min ${fmt(Math.min(...finite))} · max ${fmt(Math.max(...finite))}`)
  console.log('  largest steps (value change in one frame):')
  for (const s of top(steps)) console.log(`    ${at(s.i)}  ${fmt(values[s.i - 1])} → ${fmt(values[s.i])}  (${fmt(s.d)})`)
  console.log('  largest jerks (change of speed in one frame; a spike well above its neighbours is a jump or a kink):')
  for (const j of top(jerks)) console.log(`    ${at(j.i)}  ${fmt(j.d)}`)
  console.log(mismatches.length ? `  ${mismatches.length} frames depend on seek order, e.g. ${mismatches.slice(0, 5).map(at).join(', ')}` : '  Same value in and out of order on every frame.')
  if (arg.all) for (let i = 0; i < times.length; i++) console.log(`${at(i)}\t${fmt(values[i])}`)
} finally {
  await film.close()
}
