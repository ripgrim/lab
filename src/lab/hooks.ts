import { useCallback, useSyncExternalStore } from 'react'

const subscribeHash = (notify: () => void) => {
  addEventListener('hashchange', notify)
  return () => removeEventListener('hashchange', notify)
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash)
  const [, page, slug] = hash.replace(/^#\/?/, '/').split('/')
  if (page === 's' && slug) return { page: 'specimen' as const, slug }
  return { page: 'gallery' as const }
}

const themeListeners = new Set<() => void>()

export function useTheme() {
  const dark = useSyncExternalStore(
    (notify) => {
      themeListeners.add(notify)
      return () => themeListeners.delete(notify)
    },
    () => document.documentElement.classList.contains('dark'),
  )
  const toggle = useCallback(() => {
    const html = document.documentElement
    const next = !html.classList.contains('dark')
    html.classList.add('theme-swap')
    html.classList.toggle('dark', next)
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('theme-swap')))
    localStorage.setItem('theme', next ? 'dark' : 'light')
    themeListeners.forEach((notify) => notify())
  }, [])
  return { dark, toggle }
}

export function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, [role="listbox"], [role="menu"], [role="slider"], [role="textbox"], [role="toolbar"]'))
}
