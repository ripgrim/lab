import { createElement, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { FilmFrameContext, type FilmFrame } from '../frame'

export function mountReact(parent: HTMLElement, Component: ComponentType, frame: FilmFrame) {
  const root = createRoot(parent)
  const render = (next: FilmFrame) => flushSync(() => root.render(createElement(FilmFrameContext.Provider, { value: next }, createElement(Component))))
  render(frame)
  const node = parent.firstElementChild
  if (!(node instanceof HTMLElement)) throw new Error('Component rendered no root element')
  return { node, render }
}
