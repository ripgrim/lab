import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

export type Curve = (p: number) => number
export const curves: Record<string, Curve> = {}

export function registerMotion(motion: Record<string, string>) {
  for (const [name, points] of Object.entries(motion)) {
    CustomEase.create(name, points)
    const fn = gsap.parseEase(name)
    curves[name] = (p) => fn(Math.min(1, Math.max(0, p)))
  }
}
