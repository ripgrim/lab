import { CheckIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Specimen } from '@/specimens'

type Phase = { kind: 'idle' } | { kind: 'tossing' } | { kind: 'busy' } | { kind: 'error'; message: string }

async function post(action: 'keep' | 'toss', specimen: Specimen, reason?: string) {
  const response = await fetch(`/__lab/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: specimen.slug, idea: specimen.idea, ingredients: specimen.draft?.ingredients ?? [], reason }),
  })
  if (!response.ok) throw new Error(((await response.json()) as { error: string }).error)
}

export function DraftVerdict({ specimen }: { specimen: Specimen }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [reason, setReason] = useState('')

  const run = async (action: 'keep' | 'toss') => {
    setPhase({ kind: 'busy' })
    try {
      await post(action, specimen, reason)
    } catch (error) {
      setPhase({ kind: 'error', message: (error as Error).message })
    }
  }

  if (phase.kind === 'tossing' || (phase.kind === 'error' && reason)) {
    return (
      <form
        className="flex w-full items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void run('toss')
        }}
      >
        <Input
          autoFocus
          aria-label={`Why toss ${specimen.name}`}
          placeholder="Why? Name the part and what's wrong"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setPhase({ kind: 'idle' })}
          className="h-8 flex-1 text-[13px] md:text-[13px]"
        />
        <Button type="submit" size="sm" variant="destructive" disabled={!reason.trim()}>
          Toss
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {phase.kind === 'error' && <span className="text-[12px] text-destructive">{phase.message}</span>}
      <Button size="sm" variant="ghost" disabled={phase.kind === 'busy'} onClick={() => setPhase({ kind: 'tossing' })}>
        <XIcon data-icon="inline-start" />
        Toss
      </Button>
      <Button size="sm" disabled={phase.kind === 'busy'} onClick={() => void run('keep')}>
        <CheckIcon data-icon="inline-start" />
        Keep
      </Button>
    </div>
  )
}
