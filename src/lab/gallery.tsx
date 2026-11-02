import { ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'
import { everything, isDraft, type Specimen } from '@/specimens'
import { kindOrder, kinds, type Kind } from '@/specimens/kinds'
import { cn } from '@/lib/utils'
import { FitFrame } from './fit-frame'
import { ThemeToggle } from './chrome'
import { DraftVerdict } from './draft-verdict'
import { KindMenu, type KindFilter } from './kind-menu'

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

function Tile({ specimen }: { specimen: Specimen }) {
  const { Component } = specimen
  const draft = isDraft(specimen)
  return (
    <article className="group/tile relative">
      <a
        href={`#/s/${specimen.slug}`}
        aria-label={`Open ${specimen.name}`}
        className="absolute inset-0 z-10 rounded-[24px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div
        className={cn(
          'relative flex flex-col rounded-[24px] bg-card p-2 shadow-[var(--rim),var(--elevation-raised)] transition-[scale] duration-150 ease-out group-has-[a:active]/tile:scale-[0.99] motion-reduce:transition-none',
          '[--rim:inset_0_0_0_1px_var(--border),inset_0_1px_0_oklch(1_0_0/0.8)] dark:[--rim:inset_0_0_0_1px_oklch(1_0_0/0.09),inset_0_1px_0_oklch(1_0_0/0.12)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] rounded-[24px] opacity-0 shadow-floating transition-opacity duration-200 group-hover/tile:opacity-100 group-has-[a:focus-visible]/tile:opacity-100 motion-reduce:transition-none',
            '[box-shadow:var(--elevation-floating),inset_0_0_0_1px_oklch(0.2_0_0/0.18)] dark:[box-shadow:var(--elevation-floating),inset_0_0_0_1px_oklch(1_0_0/0.22),inset_0_1px_0_oklch(1_0_0/0.18)]',
            EASE,
          )}
        />
        <div className="relative overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_var(--border),inset_0_1px_2px_oklch(0_0_0/0.06)]">
          <FitFrame
            width={specimen.width}
            height={specimen.height}
            padding={specimen.bleed ? 0 : 24}
            className={cn('pointer-events-none aspect-[4/3]', specimen.bleed ? 'bg-background' : 'bg-canvas dot-field')}
          >
            <Component />
          </FitFrame>
        </div>
        <div className="flex min-h-12 items-center justify-between gap-2 px-2 pt-2 has-[form]:[&>div:first-child]:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-medium">{specimen.name}</span>
            <span className="truncate text-[12px] text-muted-foreground">{kinds[specimen.kind].label.replace(/s$/, '')}</span>
          </div>
          {draft ? (
            <span className="relative z-20 has-[form]:flex-1">
              <DraftVerdict specimen={specimen} />
            </span>
          ) : (
            <span className="grid h-8 shrink-0 place-items-center">
              <span
                aria-hidden
                className={cn(
                  'col-start-1 row-start-1 flex items-center gap-1 justify-self-end text-[14px] font-medium opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-hover/tile:delay-75 group-has-[a:focus-visible]/tile:opacity-100 motion-reduce:transition-none',
                  EASE,
                )}
              >
                Open
                <ArrowRightIcon className="size-4" />
              </span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function Group({ title, note, items }: { title: string; note: string; items: Specimen[] }) {
  if (!items.length) return null
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2 px-2">
        <h2 className="text-[14px] font-medium">{title}</h2>
        <span className="text-[12px] text-muted-foreground tabular">
          {items.length} · {note}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))] gap-4">
        {items.map((specimen) => (
          <Tile key={specimen.slug} specimen={specimen} />
        ))}
      </div>
    </section>
  )
}

function Empty() {
  return (
    <section className="grid min-h-[480px] place-items-center rounded-[24px] bg-canvas shadow-inset dot-field">
      <div className="flex w-[400px] flex-col gap-4 rounded-[24px] bg-card p-6 shadow-floating">
        <div className="flex flex-col gap-2">
          <h2 className="text-[14px] font-medium">Nothing in the lab yet</h2>
          <p className="text-[14px] text-muted-foreground">Ask your agent for a component. It scaffolds a draft, builds it, and it shows up here to keep or toss.</p>
        </div>
        <pre className="rounded-[8px] bg-background px-4 py-2 font-mono text-[12px] leading-6 text-muted-foreground shadow-inset">
          <span className="text-foreground">pnpm lab new</span> copy-button
        </pre>
      </div>
    </section>
  )
}

export function Gallery() {
  const [filter, setFilter] = useState<KindFilter>(() => (sessionStorage.getItem('kind') as KindFilter | null) ?? 'all')
  const counts = Object.fromEntries(kindOrder.map((kind) => [kind, everything.filter((specimen) => specimen.kind === kind).length])) as Record<Kind, number>
  const shown = everything.filter((specimen) => filter === 'all' || specimen.kind === filter)
  const pending = shown.filter(isDraft)
  const kept = shown.filter((specimen) => !isDraft(specimen))
  const choose = (next: KindFilter) => {
    sessionStorage.setItem('kind', next)
    setFilter(next)
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1280px] items-center gap-4 px-8 pt-8 pb-8">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Lab</h1>
        <KindMenu value={filter} counts={counts} onChange={choose} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-12 px-8 pb-16">
        {everything.length ? (
          <>
            <Group title="To judge" note="keep or toss" items={pending} />
            <Group title="Kept" note="in the lab" items={kept} />
          </>
        ) : (
          <Empty />
        )}
      </main>
    </div>
  )
}
