import type { Scene } from '@/film/scenes'

export type Film = {
  video: { width: number; height: number; fps: number }
  theme: { dark?: boolean; vars: Record<string, string>; motion: Record<string, string>; sound: { volume: number } }
  storyboard: Scene[]
}

const modules = {
  ...import.meta.glob<Film>('./*/storyboard.ts'),
  ...import.meta.glob<Film>('../specimens/*/film.ts'),
  ...import.meta.glob<Film>('../drafts/*/film.ts'),
}

const slugOf = (path: string) => path.split('/').at(-2)!

export const filmSlugs = Object.keys(modules).map(slugOf)

export async function loadFilm(slug: string): Promise<Film> {
  const key = Object.keys(modules).find((path) => slugOf(path) === slug)
  if (!key) throw new Error(`No film "${slug}". Films: ${filmSlugs.join(', ')}`)
  return modules[key]()
}
