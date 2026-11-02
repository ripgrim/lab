import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

export const root = resolve(import.meta.dirname, '..')

export async function openFilm(film, port, theme) {
  const server = await createServer({ root, logLevel: 'error', server: { port } })
  await server.listen()
  const query = new URLSearchParams({ render: '' })
  if (film) query.set('film', film)
  if (theme) query.set('theme', theme)
  const url = `${server.resolvedUrls.local[0]}film.html?${query}`
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
  const open = async (context) => {
    const page = await context.newPage()
    page.on('pageerror', (e) => console.error('\n[page error]', e.message))
    await page.goto(url)
    await page.waitForFunction(() => window.__video, null, { timeout: 60_000 })
    return page
  }
  const close = async () => {
    await browser.close()
    await server.close()
  }
  return { browser, open, close }
}

export const describe = (info) =>
  `Film ${info.film} (${info.theme}): ${info.duration.toFixed(2)}s · ${Math.round(info.duration * info.fps)} frames @ ${info.fps}fps · ${info.width}×${info.height}\n` +
  info.scenes.map((s) => `  ${s.id.padEnd(20)} ${s.type.padEnd(14)} ${s.start.toFixed(2).padStart(7)} – ${s.end.toFixed(2).padStart(7)}s`).join('\n')

export const probe = (page) =>
  page.evaluate(() => {
    const { film, theme, duration, fps, width, height, scenes } = window.__video
    return { film, theme, duration, fps, width, height, scenes }
  })

export function frameTimes(from, to, fps) {
  const out = []
  for (let f = Math.round(from * fps); f < Math.round(to * fps); f++) out.push(f / fps)
  return out
}

export function shuffle(list, seed = 7) {
  const a = [...list]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
