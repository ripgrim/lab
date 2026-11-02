import { MoonIcon, SunIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from './hooks'

export function Label({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground uppercase">[ {children} ]</span>
}

export function Hint({ label, keys, children }: { label: string; keys: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <Hint label={dark ? 'Light theme' : 'Dark theme'} keys="T">
      <Button variant="outline" size="icon" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
        {dark ? <SunIcon /> : <MoonIcon />}
      </Button>
    </Hint>
  )
}
