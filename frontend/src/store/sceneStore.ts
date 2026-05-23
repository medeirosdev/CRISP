import { create } from 'zustand'
import type { Scene, Component } from '../types/scene'
import type { PhysicsResponse } from '../types/physics'

interface SceneStore {
  scene: Scene
  physics: PhysicsResponse | null
  selectedId: string | null
  dTargetNm: number
  sourceType: 'led' | 'laser'

  setScene: (scene: Scene) => void
  addComponent: (c: Component) => void
  updateComponent: (id: string, patch: Partial<Component>) => void
  removeComponent: (id: string) => void
  selectComponent: (id: string | null) => void
  setPhysics: (p: PhysicsResponse) => void
  setDTarget: (d: number) => void
  setSourceType: (t: 'led' | 'laser') => void
}

export const useSceneStore = create<SceneStore>((set) => ({
  scene: {
    id: 'default',
    name: 'Novo setup',
    description: '',
    tableWidthMm: 600,
    tableHeightMm: 450,
    gridSpacingMm: 25,
    components: [],
  },
  physics: null,
  selectedId: null,
  dTargetNm: 80,
  sourceType: 'led',

  setScene: (scene) => set({ scene }),

  addComponent: (c) =>
    set((s) => ({ scene: { ...s.scene, components: [...s.scene.components, c] } })),

  updateComponent: (id, patch) =>
    set((s) => ({
      scene: {
        ...s.scene,
        components: s.scene.components.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    })),

  removeComponent: (id) =>
    set((s) => ({
      scene: {
        ...s.scene,
        components: s.scene.components.filter((c) => c.id !== id),
      },
    })),

  selectComponent: (id) => set({ selectedId: id }),
  setPhysics: (physics) => set({ physics }),
  setDTarget: (dTargetNm) => set({ dTargetNm }),
  setSourceType: (sourceType) => set({ sourceType }),
}))
