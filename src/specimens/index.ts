import type { ComponentType } from 'react'
import type { Kind } from './kinds'

export type Specimen = {
  slug: string
  kind: Kind
  name: string
  hint: string
  idea: string
  width: number
  height: number
  films: string[]
  bleed?: boolean
  Component: ComponentType
  draft?: { date: string; ingredients: string[] }
}

export const specimens = Object.values(import.meta.glob<Specimen>('./*/index.ts', { eager: true, import: 'specimen' }))

export const drafts = Object.values(import.meta.glob<Specimen>('../drafts/*/index.ts', { eager: true, import: 'specimen' })).sort((a, b) =>
  (b.draft?.date ?? '').localeCompare(a.draft?.date ?? ''),
)

export const everything = [...specimens, ...drafts]

export const isDraft = (specimen: Specimen) => drafts.includes(specimen)

export const findSpecimen = (slug: string) => everything.find((specimen) => specimen.slug === slug)
