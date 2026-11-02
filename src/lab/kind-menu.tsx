import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { kindOrder, kinds, type Kind } from '@/specimens/kinds'

export type KindFilter = Kind | 'all'

export function KindMenu({ value, counts, onChange }: { value: KindFilter; counts: Record<Kind, number>; onChange: (value: KindFilter) => void }) {
  const total = kindOrder.reduce((sum, kind) => sum + counts[kind], 0)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 pr-2">
          {value === 'all' ? 'All work' : kinds[value].label}
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-[340px] p-1.5">
        <MenuRow active={value === 'all'} label="All work" count={total} onSelect={() => onChange('all')} />
        <DropdownMenuSeparator className="mx-1" />
        {kindOrder.map((kind) => (
          <MenuRow key={kind} active={value === kind} label={kinds[kind].label} count={counts[kind]} does={kinds[kind].does} make={kinds[kind].make} onSelect={() => onChange(kind)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MenuRow({ active, label, count, does, make, onSelect }: { active: boolean; label: string; count: number; does?: string; make?: string; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="items-start gap-2.5 rounded-[8px] px-2 py-2">
      <span className="grid size-4 shrink-0 place-items-center pt-0.5">{active && <CheckIcon className="size-3.5" />}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium">{label}</span>
          <span className="ml-auto font-mono text-[11px] text-faint tabular">{count}</span>
        </span>
        {does && <span className="text-pretty text-[12px] leading-[17px] text-muted-foreground">{does}</span>}
        {make && <span className="w-fit rounded-[5px] bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground shadow-hairline">{make}</span>}
      </span>
    </DropdownMenuItem>
  )
}
