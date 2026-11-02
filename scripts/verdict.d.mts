export const SLUG: RegExp
export function keep(root: string, slug: string): { slug: string; kept: string }
export function toss(root: string, slug: string, reason: string | undefined): { slug: string; tossed: string; reason: string }
