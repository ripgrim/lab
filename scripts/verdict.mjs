import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TOSS_HEADING = '## Toss notes, not yet rules'

const today = () => new Date().toLocaleDateString('en-CA')

const field = (source, name) => source.match(new RegExp(`${name}:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`))?.[2]

export function readEntry(dir) {
  const path = resolve(dir, 'index.ts')
  if (!existsSync(path)) return undefined
  const source = readFileSync(path, 'utf8')
  const list = (name) => [...(source.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1])
  return {
    slug: field(source, 'slug'),
    kind: field(source, 'kind'),
    name: field(source, 'name'),
    hint: field(source, 'hint'),
    idea: field(source, 'idea'),
    films: list('films'),
    ingredients: list('ingredients'),
    date: field(source, 'date'),
  }
}

function ledger(root, line) {
  const path = resolve(root, 'LEDGER.md')
  if (!existsSync(path)) writeFileSync(path, '# Ledger\n\nEvery keep and toss, newest last. Agents read this before proposing ideas.\n\n')
  appendFileSync(path, `${line}\n`)
}

function draftOf(root, slug) {
  if (!SLUG.test(slug ?? '')) throw Object.assign(new Error(`Bad slug "${slug}". Use lowercase words joined by dashes.`), { status: 400 })
  const from = resolve(root, 'src/drafts', slug)
  if (!existsSync(from)) throw Object.assign(new Error(`No draft "${slug}" in src/drafts`), { status: 404 })
  const entry = readEntry(from) ?? {}
  return { from, entry, mix: entry.ingredients?.length ? ` (${entry.ingredients.join(' + ')})` : '' }
}

export function keep(root, slug) {
  const { from, entry, mix } = draftOf(root, slug)
  const to = resolve(root, 'src/specimens', slug)
  if (existsSync(to)) throw Object.assign(new Error(`A specimen named "${slug}" already exists`), { status: 409 })
  renameSync(from, to)
  ledger(root, `- ${today()} kept \`${slug}\`${mix}: ${entry.idea ?? ''}`.trimEnd())
  return { slug, kept: `src/specimens/${slug}` }
}

export function toss(root, slug, reason) {
  const why = reason?.trim()
  if (!why) throw Object.assign(new Error('Say why in one line. The reason becomes a taste rule.'), { status: 400 })
  const { from, mix } = draftOf(root, slug)
  const bin = resolve(root, 'out/tossed')
  mkdirSync(bin, { recursive: true })
  const to = resolve(bin, `${today()}-${slug}`)
  renameSync(from, to)
  ledger(root, `- ${today()} tossed \`${slug}\`${mix}: ${why}`)
  const tastePath = resolve(root, 'TASTE.md')
  const taste = existsSync(tastePath) ? readFileSync(tastePath, 'utf8') : '# Taste\n'
  writeFileSync(tastePath, `${taste.includes(TOSS_HEADING) ? taste.trimEnd() : `${taste.trimEnd()}\n\n${TOSS_HEADING}\n`}\n- \`${slug}\`${mix}: ${why}\n`)
  return { slug, tossed: `out/tossed/${today()}-${slug}`, reason: why }
}
