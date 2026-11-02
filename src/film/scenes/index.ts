import { specimen, type SpecimenScene } from './specimen'

interface SceneBase {
  id?: string
  duration?: number
  overlap?: number
  under?: boolean
}

export type Scene = SceneBase & SpecimenScene
export type SceneType = Scene['type']
export const builders = { specimen }
