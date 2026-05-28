import { create } from 'zustand'
import type { Scene, Component, Annotation } from '../types/scene'
import type { PhysicsResponse } from '../types/physics'

interface SceneStore {
  scene: Scene
  physics: PhysicsResponse | null
  selectedId: string | null
  dTargetNm: number
  sourceType: 'led' | 'laser'
  nIceTempK: number
  annotations: Annotation[]

  setScene: (scene: Scene) => void
  addComponent: (c: Component) => void
  updateComponent: (id: string, patch: Partial<Component>) => void
  removeComponent: (id: string) => void
  selectComponent: (id: string | null) => void
  setPhysics: (p: PhysicsResponse) => void
  setDTarget: (d: number) => void
  setSourceType: (t: 'led' | 'laser') => void
  setNIceTempK: (t: number) => void
  addAnnotation: (a: Annotation) => void
  removeLastAnnotation: () => void
  clearAnnotations: () => void
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
  nIceTempK: 77,
  annotations: [],

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
  setNIceTempK: (nIceTempK) => set({ nIceTempK }),
  addAnnotation: (a) => set((s) => ({ annotations: [...s.annotations, a] })),
  removeLastAnnotation: () => set((s) => ({ annotations: s.annotations.slice(0, -1) })),
  clearAnnotations: () => set({ annotations: [] }),
}))
