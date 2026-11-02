export const kinds = {
  component: {
    label: 'Components',
    does: 'One component with one interaction worth trying by hand and watching on film.',
    make: 'pnpm lab new <slug>',
  },
  explainer: {
    label: 'Explainers',
    does: 'One instance plays the same input with a detail off, then on, and the hidden mechanism is drawn in.',
    make: 'pnpm lab new <slug> --kind explainer',
  },
  breakdown: {
    label: 'Breakdowns',
    does: 'How the parts of a layout relate, shown with a skeleton, guides, and live measurements.',
    make: 'pnpm lab new <slug> --kind breakdown',
  },
} as const

export type Kind = keyof typeof kinds

export const kindOrder = Object.keys(kinds) as Kind[]
