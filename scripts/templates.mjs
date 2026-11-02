const pascal = (slug) => slug.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())

const film = (slug, scene, video, vars = '{}') => `import type { Scene } from '@/film/scenes'

export const video = ${JSON.stringify(video).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')}

export const theme = {
  dark: false,
  vars: ${vars} as Record<string, string>,
  motion: { glide: '0.645, 0.045, 0.355, 1', settle: '0.23, 1, 0.32, 1', drawer: '0.32, 0.72, 0, 1', press: '0.4, 0, 1, 1', linear: '0, 0, 1, 1' } as Record<string, string>,
  sound: { volume: 0.5 },
}

export const storyboard: Scene[] = [
${scene}
]
`

const entry = ({ slug, kind, name, hint, idea, width, height, bleed, date }) => `import type { Specimen } from '@/specimens'
import { ${pascal(slug)} } from './${slug}'

export const specimen: Specimen = {
  slug: '${slug}',
  kind: '${kind}',
  name: '${name.replace(/'/g, "\\'")}',
  hint: '${hint.replace(/'/g, "\\'")}',
  idea: '${idea.replace(/'/g, "\\'")}',
  width: ${width},
  height: ${height},
  films: ['${slug}'],${bleed ? '\n  bleed: true,' : ''}
  Component: ${pascal(slug)},
  draft: { date: '${date}', ingredients: [] },
}
`

const component = ({ slug, name, width, height }) => `import { useDialKit } from 'dialkit'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useFilmFrame } from '@/film/frame'

export function ${pascal(slug)}() {
  const film = useFilmFrame()
  const [full, setFull] = useState(false)
  const dial = useDialKit('${name}', {
    radius: [24, 8, 32, 8],
    fill: { type: 'spring', visualDuration: 0.4, bounce: 0.2 },
  })
  const progress = film ? (film.values.progress ?? 0) : full ? 1 : 0
  const fill = dial.fill.type === 'easing' ? { type: 'tween' as const, duration: dial.fill.duration, ease: dial.fill.ease } : dial.fill

  return (
    <div className="grid place-items-center" style={{ width: ${width}, height: ${height} }}>
      <div className="flex w-[320px] flex-col gap-4 bg-card p-6 shadow-floating" style={{ borderRadius: dial.radius }}>
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium">${name}</span>
          <span className="text-[12px] text-muted-foreground">Replace this with the component.</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          {film ? (
            <div className="h-full origin-left rounded-full bg-signal" style={{ transform: \`scaleX(\${progress})\` }} />
          ) : (
            <motion.div className="h-full origin-left rounded-full bg-signal" initial={false} animate={{ scaleX: progress }} transition={fill} />
          )}
        </div>
        <button
          type="button"
          data-slot="trigger"
          onClick={() => setFull((value) => !value)}
          className="h-8 rounded-[8px] bg-foreground px-4 text-[14px] font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {progress > 0.5 ? 'Reset' : 'Fill'}
        </button>
      </div>
    </div>
  )
}
`

const explainer = ({ slug, width, height }) => `import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { useFilmFrame } from '@/film/frame'

export function ${pascal(slug)}() {
  const film = useFilmFrame()
  const [live, setLive] = useState(false)
  const on = film ? (film.values.on ?? 0) > 0.5 : live

  return (
    <div className="flex flex-col items-center justify-center gap-8 bg-background" style={{ width: ${width}, height: ${height} }}>
      <label className="flex items-center gap-2 text-[14px] font-medium">
        <Switch data-slot="detail-switch" checked={on} onCheckedChange={setLive} />
        The detail
      </label>
      <div className="grid h-[320px] w-[432px] place-items-center rounded-[24px] bg-card shadow-raised">
        <span className="text-[14px] text-muted-foreground">{on ? 'With the detail' : 'Without the detail'}</span>
      </div>
    </div>
  )
}
`

const breakdown = ({ slug, name, width, height }) => `const rows = ['Overview', 'Activity', 'Members', 'Settings']

export function ${pascal(slug)}() {
  return (
    <div className="grid place-items-center" style={{ width: ${width}, height: ${height} }}>
      <div data-guide-root className="flex w-[320px] flex-col gap-2 rounded-[24px] bg-card p-6 shadow-floating" data-measure="padding gap">
        <span className="px-2 pb-2 text-[14px] font-medium" data-guide="x">
          ${name}
        </span>
        {rows.map((row) => (
          <div key={row} className="flex h-10 items-center rounded-[8px] px-2 text-[14px] text-muted-foreground hover:bg-muted" data-guide="x" data-measure={row === 'Activity' ? 'height' : undefined}>
            {row}
          </div>
        ))}
      </div>
    </div>
  )
}
`

const scenes = {
  component: (slug) => `  {
    id: 'main',
    type: 'specimen',
    specimen: '${slug}',
    duration: 6,
    values: { progress: 0 },
    beats: [
      { at: 1.4, click: '[data-slot="trigger"]', values: { progress: 1 }, over: 0.2, ease: 'settle' },
      { at: 3.6, click: '[data-slot="trigger"]', values: { progress: 0 }, over: 0.2, ease: 'settle' },
    ],
  },`,
  explainer: (slug) => `  {
    id: 'main',
    type: 'specimen',
    specimen: '${slug}',
    duration: 6,
    fit: 1,
    values: { on: 0 },
    beats: [{ at: 2.4, click: '[data-slot="detail-switch"]', values: { on: 1 }, over: 0.01 }],
  },`,
  breakdown: (slug) => `  {
    id: 'main',
    type: 'specimen',
    specimen: '${slug}',
    duration: 8,
    pill: { options: ['Grid', 'No grid'], active: 'No grid' },
    beats: [
      { at: 1.6, click: 'pill:Grid', look: { ui: 0, skeleton: 1 }, over: 0.45 },
      { at: 2.3, look: { guides: 1 }, over: 1.4, ease: 'linear' },
      { at: 5.6, click: 'pill:No grid', look: { ui: 1, skeleton: 0, guides: 0 }, over: 0.45 },
    ],
  },`,
}

const SIZES = { component: [480, 320], explainer: [540, 675], breakdown: [640, 480] }
const VIDEOS = { component: { width: 1440, height: 960, fps: 60 }, explainer: { width: 1080, height: 1350, fps: 60 }, breakdown: { width: 1440, height: 1080, fps: 60 } }
const HINTS = { component: 'click fill', explainer: 'flip the switch', breakdown: 'press G for anatomy' }

export function scaffold({ slug, kind, name, idea, size, date }) {
  const [width, height] = size ?? SIZES[kind]
  const opts = { slug, kind, name, idea, width, height, date, hint: HINTS[kind], bleed: kind === 'explainer' }
  const body = { component, explainer, breakdown }[kind](opts)
  return {
    'index.ts': entry(opts),
    [`${slug}.tsx`]: body,
    'film.ts': film(slug, scenes[kind](slug), VIDEOS[kind], kind === 'explainer' ? "{ '--canvas': 'var(--background)' }" : '{}'),
  }
}

export const KINDS = Object.keys(SIZES)
