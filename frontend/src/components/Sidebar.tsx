import React from 'react'
import { useSceneStore } from '../store/sceneStore'
import { COMPONENT_COLORS } from '../utils/colors'
import type { Component, ComponentType } from '../types/scene'

const LIBRARY: { type: ComponentType; label: string; defaults: Partial<Component> }[] = [
  { type: 'source_led',    label: 'LED 3λ',        defaults: { wavelengthsNm: [405, 470, 528], fwhmNm: [6, 9, 15], angleDeg: 0 } },
  { type: 'source_laser',  label: 'Laser',          defaults: { wavelengthsNm: [532], fwhmNm: [0.1], angleDeg: 0 } },
  { type: 'beamsplitter',  label: 'BS 50/50',       defaults: { reflectance: 0.5, angleDeg: 45 } },
  { type: 'dichroic',      label: 'Dicroico',       defaults: { cutoffNm: 505, angleDeg: 45 } },
  { type: 'objective', label: 'Objetiva LWD', defaults: { na: 0.3, workingDistanceMm: 34, focalLengthMm: 20, magnification: 10, correctionType: 'plan' as const, angleDeg: 90 } },
  { type: 'camera',    label: 'Câmera sCMOS', defaults: { sensorWidthMm: 6.4, sensorHeightMm: 4.8, angleDeg: 0 } },
  { type: 'cryo_stage',    label: 'Estágio Cryo',   defaults: { angleDeg: 0 } },
  { type: 'mirror',        label: 'Espelho',        defaults: { reflectance: 0.95, angleDeg: 45 } },
  { type: 'filter_bandpass', label: 'Filtro BP',    defaults: { angleDeg: 0 } },
  { type: 'iris',          label: 'Íris',           defaults: { diameterMm: 25, angleDeg: 0 } },
]

const PRESETS = ['hohle2022', 'last2023', 'lnls_cnpem']

let idCounter = 1

interface SidebarProps { width?: number }

export function Sidebar({ width }: SidebarProps) {
  const { addComponent, setScene } = useSceneStore()

  const addComp = (item: typeof LIBRARY[number]) => {
    const comp: Component = {
      id: `${item.type}-${idCounter++}`,
      type: item.type,
      position: { xMm: 100 + (idCounter % 5) * 25, yMm: 100 },
      angleDeg: item.defaults.angleDeg ?? 0,
      label: item.label,
      ...item.defaults,
    }
    addComponent(comp)
  }

  const loadPreset = async (name: string) => {
    try {
      const res = await fetch(`/api/presets/${name}`)
      const data = await res.json()
      const components = (data.scene.components as Record<string, unknown>[]).map(c => {
        const pos = c.position as Record<string, number>
        return {
          id: c.id as string,
          type: c.type as ComponentType,
          position: { xMm: pos.x_mm, yMm: pos.y_mm },
          angleDeg: (c.angle_deg as number) ?? 0,
          label: c.label as string | undefined,
          wavelengthsNm: c.wavelengths_nm as number[] | undefined,
          fwhmNm: c.fwhm_nm as number[] | undefined,
          na: c.na as number | undefined,
          workingDistanceMm: c.working_distance_mm as number | undefined,
          focalLengthMm: c.focal_length_mm as number | undefined,
          reflectance: c.reflectance as number | undefined,
          cutoffNm: c.cutoff_nm as number | undefined,
          thorlabsPn: c.thorlabs_pn as string | undefined,
        } as Component
      })
      setScene({
        id: data.scene.id,
        name: data.scene.name,
        description: '',
        tableWidthMm: 600,
        tableHeightMm: 450,
        gridSpacingMm: 25,
        components,
      })
    } catch {
      console.error('Erro ao carregar preset')
    }
  }

  return (
    <div style={{ ...styles.sidebar, width: width ?? 160 }}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>COMPONENTES</div>
        {LIBRARY.map(item => (
          <button
            key={item.type}
            style={{ ...styles.btn, borderLeft: `3px solid ${COMPONENT_COLORS[item.type] ?? '#888'}` }}
            onClick={() => addComp(item)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>PRESETS</div>
        {PRESETS.map(p => (
          <button key={p} style={styles.presetBtn} onClick={() => loadPreset(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    background: '#1a1a2e', borderRight: '1px solid #333',
    display: 'flex', flexDirection: 'column', gap: 4, padding: 8, overflowY: 'auto',
    flexShrink: 0,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 3 },
  sectionTitle: {
    fontSize: 9, color: '#666', letterSpacing: 1, marginBottom: 2, marginTop: 6,
  },
  btn: {
    background: '#232340', border: '1px solid #333', color: '#ddd',
    padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
    textAlign: 'left',
  },
  presetBtn: {
    background: '#1e3a5f', border: '1px solid #4a90d9', color: '#7ec8f0',
    padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10,
    textAlign: 'left',
  },
}
