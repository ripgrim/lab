import { createContext, useContext } from 'react'

export type FilmFrame = { t: number; values: Record<string, number> }

export const FilmFrameContext = createContext<FilmFrame | null>(null)

export const useFilmFrame = () => useContext(FilmFrameContext)
