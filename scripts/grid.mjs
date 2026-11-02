import { chromium } from 'playwright'
import { createServer } from 'vite'
import { root } from './lib.mjs'

const [slug, ...flags] = process.argv.slice(2)
if (!slug) {
  console.error('usage: pnpm grid <slug> [--select <css>]')
  process.exit(2)
}
const selectAt = flags.indexOf('--select')
const select = selectAt >= 0 ? flags[selectAt + 1] : undefined

const server = await createServer({ root, logLevel: 'error', server: { port: 5192 } })
await server.listen()
const browser = await chromium.launch()
let failed = false
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${server.resolvedUrls.local[0]}?grid#/s/${slug}`)
  await page.waitForTimeout(1500)
  const report = await page.evaluate((selector) => {
    const host = selector ? document.querySelector(selector) : document.querySelector('[data-specimen] > *')
    if (!host) return { error: 'no component found' }
    const off = []
    const half = []
    const sizes = new Map()
    const weights = new Map()
    const families = new Set()
    const px = (v) => parseFloat(v) || 0
    const onGrid = (v, step) => Math.abs(v / step - Math.round(v / step)) < 0.02
    const label = (el) => `${el.tagName.toLowerCase()}${el.dataset.target ? `[${el.dataset.target}]` : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}`
    const check = (el, prop, value) => {
      if (!value || value < 1) return
      if (onGrid(value, 8)) return
      if (onGrid(value, 4)) half.push(`${label(el)} ${prop} ${value}`)
      else off.push(`${label(el)} ${prop} ${value}`)
    }
    for (const el of [host, ...host.querySelectorAll('*')]) {
      if (!(el instanceof HTMLElement)) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      if (el.closest('.ss-cursor, [aria-hidden="true"] svg, svg')) continue
      for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'columnGap', 'rowGap']) check(el, p, px(cs[p]))
      const radius = px(cs.borderTopLeftRadius)
      const pill = radius * 2 >= Math.min(el.offsetWidth, el.offsetHeight) - 1
      if (radius && !pill) check(el, 'radius', radius)
      const isControl = el.matches('button, input, [role=button], [data-target], .ss-field, [data-chip]')
      if (isControl) check(el, 'height', el.offsetHeight)
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (hasText && el.getBoundingClientRect().width > 0) {
        const key = `${px(cs.fontSize)}px`
        sizes.set(key, (sizes.get(key) ?? 0) + 1)
        weights.set(cs.fontWeight, (weights.get(cs.fontWeight) ?? 0) + 1)
        families.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim())
      }
    }
    const surface = [host, ...host.querySelectorAll('*')].find((el) => {
      const r = px(getComputedStyle(el).borderTopLeftRadius)
      return r > 0 && r * 2 < Math.min(el.offsetWidth, el.offsetHeight) && getComputedStyle(el).boxShadow !== 'none'
    })
    return {
      outerRadius: surface ? px(getComputedStyle(surface).borderTopLeftRadius) : 0,
      bleed: !surface || surface !== host && host.offsetWidth > surface.offsetWidth + 64,
      off,
      half,
      sizes: Object.fromEntries(sizes),
      weights: Object.fromEntries(weights),
      families: [...families],
    }
  }, select)

  if (report.error) {
    console.log(report.error)
    failed = true
  } else {
    const line = (ok, text) => {
      if (!ok) failed = true
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`)
    }
    if (report.bleed) console.log(`note full-bleed specimen; outermost surface radius ${report.outerRadius}px`)
    line(report.bleed ? report.outerRadius === 0 || report.outerRadius === 24 || report.outerRadius <= 16 : report.outerRadius === 24, `outer radius ${report.outerRadius}px (want 24)`)
    line(Object.keys(report.sizes).length <= 3, `${Object.keys(report.sizes).length} font sizes: ${Object.entries(report.sizes).map(([k, v]) => `${k}×${v}`).join(', ')}`)
    line(Object.keys(report.weights).length <= 3, `${Object.keys(report.weights).length} font weights: ${Object.entries(report.weights).map(([k, v]) => `${k}×${v}`).join(', ')}`)
    line(report.families.length <= 2, `${report.families.length} font families: ${report.families.join(', ')}`)
    line(report.off.length === 0, `${report.off.length} values off the 8px grid${report.off.length ? ':\n       ' + [...new Set(report.off)].slice(0, 20).join('\n       ') : ''}`)
    console.log(`note ${report.half.length} half-step (4px) values; fine inside controls${report.half.length ? ':\n       ' + [...new Set(report.half)].slice(0, 12).join('\n       ') : ''}`)
  }
} finally {
  await browser.close()
  await server.close()
}
process.exitCode = failed ? 1 : 0
