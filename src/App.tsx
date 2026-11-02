import { TooltipProvider } from '@/components/ui/tooltip'
import { findSpecimen } from '@/specimens'
import { Gallery } from '@/lab/gallery'
import { useEffect } from 'react'
import { isTypingTarget, useRoute, useTheme } from '@/lab/hooks'
import { SpecimenPage } from '@/lab/specimen-page'

export default function App() {
  const route = useRoute()
  const { toggle } = useTheme()
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key.toLowerCase() !== 't' || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      event.preventDefault()
      toggle()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [toggle])
  const specimen = route.page === 'specimen' ? findSpecimen(route.slug) : undefined
  return <TooltipProvider delayDuration={400}>{specimen ? <SpecimenPage specimen={specimen} /> : <Gallery />}</TooltipProvider>
}
