import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSceneStore } from './store/sceneStore'
import { OpticalTable } from './canvas/OpticalTable'
import type { ToolMode } from './canvas/OpticalTable'
import { wsClient } from './ws/WebSocketClient'
import { SignalChart } from './components/SignalChart'
import { Sidebar } from './components/Sidebar'
import { PropsPanel } from './components/PropsPanel'
import { ValidationPanel } from './components/ValidationPanel'
import { Toolbar } from './components/Toolbar'
import { FloatingToolbar } from './components/FloatingToolbar'
import { computeLocalPhysics } from './utils/physics'

const TABLE_CONFIG = {
  widthMm: 600,
  heightMm: 450,
  gridSpacingMm: 25,
  pxPerMm: 4,
}

const RIGHT_PANEL_MIN = 240
const RIGHT_PANEL_MAX = 560
const RIGHT_PANEL_DEFAULT = 360

const LEFT_PANEL_MIN = 120
const LEFT_PANEL_MAX = 320
const LEFT_PANEL_DEFAULT = 160

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tableRef = useRef<OpticalTable | null>(null)
  const animRef = useRef<number>(0)
  const wsRegistered = useRef(false)
  const [rightWidth, setRightWidth] = useState(RIGHT_PANEL_DEFAULT)
  const [leftWidth, setLeftWidth] = useState(LEFT_PANEL_DEFAULT)
  const [activeTool, setActiveTool] = useState<ToolMode>('select')
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [showRays, setShowRays] = useState(true)
  const [showDistances, setShowDistances] = useState(false)
  const dragging = useRef<'left' | 'right' | null>(null)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)
  const [lightTheme, setLightTheme] = useState(false)

  // Use refs so the RAF loop never needs to restart on scene changes
  const sceneRef = useRef(useSceneStore.getState().scene)
  const selectedIdRef = useRef(useSceneStore.getState().selectedId)

  const {
    scene, physics, selectedId, dTargetNm, sourceType,
    updateComponent, selectComponent, setPhysics,
  } = useSceneStore()

  // Keep refs in sync
  useEffect(() => { sceneRef.current = scene }, [scene])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // Init canvas — runs once
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = TABLE_CONFIG.widthMm * TABLE_CONFIG.pxPerMm + 40
    canvas.height = TABLE_CONFIG.heightMm * TABLE_CONFIG.pxPerMm + 40

    const table = new OpticalTable(canvas, TABLE_CONFIG)
    table.setCallbacks(
      (id, xMm, yMm) => updateComponent(id, { position: { xMm, yMm } }),
      (id) => selectComponent(id)
    )
    tableRef.current = table
    return () => { table.destroy() }
  }, [])

  // Sync toolbar state to OpticalTable
  useEffect(() => { tableRef.current?.setTool(activeTool) }, [activeTool])
  useEffect(() => { tableRef.current?.setSnapEnabled(snapEnabled) }, [snapEnabled])
  useEffect(() => { tableRef.current?.setShowRays(showRays) }, [showRays])
  useEffect(() => { tableRef.current?.setShowDistances(showDistances) }, [showDistances])
  useEffect(() => { tableRef.current?.setLightTheme(lightTheme) }, [lightTheme])

  // Animation loop — deps-free, reads from refs
  useEffect(() => {
    const loop = () => {
      if (tableRef.current) {
        tableRef.current._lastComponents = sceneRef.current.components
        tableRef.current.setSelectedId(selectedIdRef.current)
        tableRef.current.render(sceneRef.current.components)
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // WebSocket — register callback only once
  useEffect(() => {
    wsClient.connect()
    if (!wsRegistered.current) {
      wsClient.onUpdate(setPhysics)
      wsRegistered.current = true
    }
  }, [])

  // Request physics update whenever scene or params change
  useEffect(() => {
    const sources = scene.components.filter(c => c.type === 'source_led' || c.type === 'source_laser')
    if (sources.length === 0) return

    const source = sources[0]
    const wavelengths = source.wavelengthsNm ?? [405, 470, 528]
    const fwhm = source.fwhmNm ?? [6, 9, 15]

    // Immediate local computation — no backend needed
    setPhysics(computeLocalPhysics(wavelengths, dTargetNm))

    // Async backend computation for coherence, validation, spectral integration
    wsClient.requestUpdate(scene, {
      wavelengthsNm: wavelengths,
      fwhmNm: fwhm,
      dTargetNm,
      sourceType,
    })
  }, [scene, dTargetNm, sourceType])

  // Resize handle drag
  const onMouseDownRight = useCallback((e: React.MouseEvent) => {
    dragging.current = 'right'
    dragStartX.current = e.clientX
    dragStartW.current = rightWidth
    e.preventDefault()
  }, [rightWidth])

  const onMouseDownLeft = useCallback((e: React.MouseEvent) => {
    dragging.current = 'left'
    dragStartX.current = e.clientX
    dragStartW.current = leftWidth
    e.preventDefault()
  }, [leftWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - dragStartX.current
      if (dragging.current === 'right') {
        const next = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, dragStartW.current - delta))
        setRightWidth(next)
      } else {
        const next = Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, dragStartW.current + delta))
        setLeftWidth(next)
      }
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleFitView = useCallback(() => {
    tableRef.current?.fitView(sceneRef.current.components)
  }, [])

  const handleDelete = useCallback(() => {
    const id = selectedIdRef.current
    if (id) useSceneStore.getState().removeComponent(id)
  }, [])

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>CRISP</span>
        <span style={styles.subtitle}>Cryo Interferometry Simulator and Planner</span>
        <Toolbar />
      </div>

      <div style={styles.body}>
        {/* Sidebar — component library */}
        <Sidebar width={leftWidth} />

        {/* Left drag handle */}
        <div
          style={styles.dragHandle}
          onMouseDown={onMouseDownLeft}
          title="Arraste para redimensionar"
        />

        {/* Main canvas */}
        <div style={{ ...styles.canvasArea, background: lightTheme ? '#ffffff' : '#0d0d1a' }}>
          <canvas
            ref={canvasRef}
            style={styles.canvas}
          />
        </div>

        {/* Right drag handle */}
        <div
          style={styles.dragHandle}
          onMouseDown={onMouseDownRight}
          title="Arraste para redimensionar"
        />

        {/* Right panels */}
        <div style={{ ...styles.rightPanel, width: rightWidth }}>
          <PropsPanel />
          <SignalChart physics={physics} wavelengths={[405, 470, 528]} />
          <ValidationPanel physics={physics} wavelengths={[405, 470, 528]} />
        </div>
      </div>

      <FloatingToolbar
        activeTool={activeTool}
        onTool={setActiveTool}
        onFitView={handleFitView}
        onDelete={handleDelete}
        snapEnabled={snapEnabled}
        onSnapToggle={() => setSnapEnabled(v => !v)}
        showRays={showRays}
        onRaysToggle={() => setShowRays(v => !v)}
        showDistances={showDistances}
        onDistancesToggle={() => setShowDistances(v => !v)}
        lightTheme={lightTheme}
        onThemeToggle={() => setLightTheme(v => !v)}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#12121f', color: '#e0e0e0',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '8px 16px', background: '#1a1a2e',
    borderBottom: '1px solid #333', flexShrink: 0,
  },
  logo: {
    fontSize: 20, fontWeight: 700, color: '#4a90d9', letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12, color: '#888', flexGrow: 1,
  },
  body: {
    display: 'flex', flexGrow: 1, overflow: 'hidden',
  },
  canvasArea: {
    flexGrow: 1, overflow: 'auto', background: '#0d0d1a',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
    padding: 8,
  },
  canvas: {
    cursor: 'crosshair', display: 'block',
    border: '1px solid #2a2a4a',
  },
  dragHandle: {
    width: 5, cursor: 'col-resize', flexShrink: 0,
    background: '#2a2a4a',
    transition: 'background 0.15s',
  },
  rightPanel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 8, background: '#1a1a2e', overflowY: 'auto',
    flexShrink: 0,
  },
}
