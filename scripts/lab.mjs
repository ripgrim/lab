import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { root } from './lib.mjs'
import { KINDS, scaffold } from './templates.mjs'
import { keep, readEntry, SLUG, toss } from './verdict.mjs'

const HELP = `byolab: build UI components with an agent, judge them, and film them.

Usage: pnpm lab <command> [args] [--json]

Make
  new <slug> [--kind component|explainer|breakdown] [--name "..."] [--idea "..."] [--size 480x320]
                              Scaffold a draft in src/drafts/<slug> with a film
  list                        Every specimen and draft, with its films

Judge
  keep <slug>                 Move a draft into src/specimens and log it in LEDGER.md
  toss <slug> --reason "..."  Bin a draft and add the reason to TASTE.md

Check
  grid <slug>                 Check spacing, radius, and type limits from GRID.md
  check <film> [--theme light|dark]
                              Check the film is frame-exact when scrubbed

Film
  still <film> <seconds> [--theme light|dark]
                              Render one frame to out/<film>/still-<seconds>.png
  render <film> [--theme light|dark] [--height 2160] [--no-sound] [--sheet <frames per second>]
                              Render out/<film>/video.mp4 (or a contact sheet)
  export <film> [--theme light|dark|both] [--height 2160] [--no-sound]
                              Render and copy the finished videos to exports/<film>/

Add --json to new, list, keep, toss, and export for machine-readable output.
The lab runs at http://localhost:5420 (pnpm dev). Films play at /film.html?film=<film>.`

const { values: arg, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    kind: { type: 'string', default: 'component' },
    name: { type: 'string' },
    idea: { type: 'string' },
    size: { type: 'string' },
    reason: { type: 'string' },
    theme: { type: 'string' },
    height: { type: 'string' },
    sheet: { type: 'string' },
    'no-sound': { type: 'boolean' },
  },
})

const [command, ...rest] = positionals

const fail = (message, code = 1) => {
  if (arg.json) console.log(JSON.stringify({ ok: false, error: message }))
  else console.error(`error: ${message}`)
  process.exit(code)
}

const done = (data, text) => {
  if (arg.json) console.log(JSON.stringify({ ok: true, ...data }, null, 2))
  else console.log(text)
}

const run = (script, args) => {
  const result = spawnSync(process.execPath, [resolve(root, 'scripts', script), ...args], { stdio: arg.json ? ['ignore', 'pipe', 'inherit'] : 'inherit', cwd: root })
  if (result.status !== 0) fail(`${script} ${args.join(' ')} exited with ${result.status}`, result.status ?? 1)
  return result.stdout?.toString() ?? ''
}

const filmFlags = () => [...(arg.theme ? ['--theme', arg.theme] : []), ...(arg.height ? ['--height', arg.height] : []), ...(arg['no-sound'] ? ['--no-sound'] : [])]

const entries = (dir, status) => {
  const base = resolve(root, dir)
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const entry = readEntry(resolve(base, d.name))
      if (!entry) return undefined
      return { ...entry, status, path: `${dir}/${d.name}`, url: `http://localhost:5420/#/s/${entry.slug}`, hasFilm: existsSync(resolve(base, d.name, 'film.ts')) }
    })
    .filter(Boolean)
}

const allFilms = () => {
  const found = []
  for (const dir of ['src/films', 'src/specimens', 'src/drafts']) {
    const base = resolve(root, dir)
    if (!existsSync(base)) continue
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (d.isDirectory() && existsSync(resolve(base, d.name, dir === 'src/films' ? 'storyboard.ts' : 'film.ts'))) found.push(d.name)
    }
  }
  return found
}

const needFilm = (film) => {
  if (!film) fail(`Name a film. Films: ${allFilms().join(', ') || 'none yet'}`, 2)
  if (!allFilms().includes(film)) fail(`No film "${film}". Films: ${allFilms().join(', ')}`, 2)
  return film
}

if (!command || arg.help || command === 'help') {
  console.log(HELP)
  process.exit(command || arg.help ? 0 : 2)
}

switch (command) {
  case 'new': {
    const slug = rest[0]
    if (!slug || !SLUG.test(slug)) fail('Give a slug: lowercase words joined by dashes, like "usage-meter"', 2)
    if (!KINDS.includes(arg.kind)) fail(`--kind must be one of ${KINDS.join(', ')}`, 2)
    for (const dir of ['src/drafts', 'src/specimens', 'src/films']) if (existsSync(resolve(root, dir, slug))) fail(`"${slug}" already exists in ${dir}`)
    const size = arg.size?.match(/^(\d+)x(\d+)$/)
    if (arg.size && !size) fail('--size must look like 480x320', 2)
    const name = arg.name ?? slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
    const idea = arg.idea ?? 'One sentence a viewer would say about it.'
    const files = scaffold({ slug, kind: arg.kind, name, idea, size: size ? [Number(size[1]), Number(size[2])] : undefined, date: new Date().toLocaleDateString('en-CA') })
    const dir = resolve(root, 'src/drafts', slug)
    mkdirSync(dir, { recursive: true })
    for (const [file, body] of Object.entries(files)) writeFileSync(resolve(dir, file), body)
    const paths = Object.keys(files).map((file) => `src/drafts/${slug}/${file}`)
    done(
      { slug, kind: arg.kind, files: paths, url: `http://localhost:5420/#/s/${slug}`, film: slug },
      `Created ${arg.kind} draft "${slug}"\n${paths.map((p) => `  ${p}`).join('\n')}\n\nOpen  http://localhost:5420/#/s/${slug}\nFilm  pnpm lab still ${slug} 2`,
    )
    break
  }

  case 'list': {
    const items = [...entries('src/drafts', 'draft'), ...entries('src/specimens', 'kept')]
    const films = allFilms()
    done(
      { specimens: items, films },
      items.length
        ? `${items.map((i) => `${i.status.padEnd(6)} ${i.kind?.padEnd(10)} ${i.slug.padEnd(24)} ${i.idea ?? ''}`).join('\n')}\n\nFilms: ${films.join(', ')}`
        : 'Nothing yet. Start with: pnpm lab new <slug>',
    )
    break
  }

  case 'keep': {
    try {
      const result = keep(root, rest[0])
      done(result, `Kept ${result.slug}: now in ${result.kept}`)
    } catch (error) {
      fail(error.message)
    }
    break
  }

  case 'toss': {
    try {
      const result = toss(root, rest[0], arg.reason ?? rest.slice(1).join(' '))
      done(result, `Tossed ${result.slug} to ${result.tossed}. Reason added to TASTE.md.`)
    } catch (error) {
      fail(error.message)
    }
    break
  }

  case 'grid': {
    if (!rest[0]) fail('Name a specimen: pnpm lab grid <slug>', 2)
    run('grid.mjs', [rest[0]])
    break
  }

  case 'check': {
    run('check.mjs', ['--film', needFilm(rest[0]), ...(arg.theme ? ['--theme', arg.theme] : [])])
    break
  }

  case 'still': {
    const film = needFilm(rest[0])
    if (!rest[1] || Number.isNaN(Number(rest[1]))) fail('Give a time in seconds: pnpm lab still <film> 2.5', 2)
    run('render.mjs', ['--still', rest[1], '--film', film, ...(arg.theme ? ['--theme', arg.theme] : [])])
    break
  }

  case 'render': {
    const film = needFilm(rest[0])
    run('render.mjs', ['--film', film, ...filmFlags(), ...(arg.sheet ? ['--sheet', arg.sheet] : [])])
    break
  }

  case 'export': {
    const film = needFilm(rest[0])
    const themes = !arg.theme || arg.theme === 'both' ? ['light', 'dark'] : [arg.theme]
    const out = resolve(root, 'exports', film)
    mkdirSync(out, { recursive: true })
    const files = []
    for (const theme of themes) {
      run('render.mjs', ['--film', film, '--theme', theme, ...(arg.height ? ['--height', arg.height] : []), ...(arg['no-sound'] ? ['--no-sound'] : [])])
      const to = resolve(out, `${film}-${theme}.mp4`)
      copyFileSync(resolve(root, 'out', `${film}-${theme}`, 'video.mp4'), to)
      files.push(relative(root, to))
    }
    done({ film, files }, `Exported\n${files.map((f) => `  ${f}`).join('\n')}`)
    break
  }

  default:
    fail(`Unknown command "${command}". Run pnpm lab help.`, 2)
}
