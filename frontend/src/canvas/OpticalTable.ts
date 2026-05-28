import type { Component } from '../types/scene'
import { RayTracer } from './RayTracer'
import { Renderer } from './Renderer'
import { snapToGrid } from '../utils/units'

export type ToolMode = 'select' | 'pan' | 'measure'

export interface TableConfig {
  widthMm: number
  heightMm: number
  gridSpacingMm: number
  pxPerMm: number
}

export class OpticalTable {
  private ctx: CanvasRenderingContext2D
  private rayTracer = new RayTracer()
  private renderer: Renderer
  private abortController = new AbortController()

  private scale = 1.0
  private offsetX = 20
  private offsetY = 20
  private isPanning = false
  private lastPan = { x: 0, y: 0 }

  private dragId: string | null = null
  private onMove?: (id: string, xMm: number, yMm: number) => void
  private onClick?: (id: string | null) => void
  private selectedId: string | null = null

  private activeTool: ToolMode = 'select'
  private snapEnabled = true
  private showRays = true
  private showDistances = false
  private measureA: { x: number; y: number } | null = null
  private measureB: { x: number; y: number } | null = null
  private measureCursor: { x: number; y: number } | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    private config: TableConfig
  ) {
    this.ctx = canvas.getContext('2d')!
    this.renderer = new Renderer(this.ctx)
    this._setupEvents()
  }

  destroy(): void {
    this.abortController.abort()
  }

  setCallbacks(
    onMove: (id: string, xMm: number, yMm: number) => void,
    onClick: (id: string | null) => void
  ): void {
    this.onMove = onMove
    this.onClick = onClick
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id
  }

  setTool(tool: ToolMode): void {
    this.activeTool = tool
    const cursors: Record<ToolMode, string> = {
      select: 'default', pan: 'grab', measure: 'crosshair',
    }
    this.canvas.style.cursor = cursors[tool]
    if (tool !== 'measure') {
      this.measureA = null
      this.measureB = null
      this.measureCursor = null
    }
  }

  setSnapEnabled(v: boolean): void { this.snapEnabled = v }
  setShowRays(v: boolean): void { this.showRays = v }
  setShowDistances(v: boolean): void { this.showDistances = v }
  setLightTheme(v: boolean): void { this.renderer.lightTheme = v }

  fitView(components: Component[]): void {
    if (components.length === 0) return
    const xs = components.map(c => c.position.xMm)
    const ys = components.map(c => c.position.yMm)
    const pad = 40
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad

    const usableW = this.canvas.width - 40
    const usableH = this.canvas.height - 40
    const scaleX = usableW / ((maxX - minX) * this.config.pxPerMm)
    const scaleY = usableH / ((maxY - minY) * this.config.pxPerMm)
    this.scale = Math.min(scaleX, scaleY, 2.5)

    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    this.offsetX = this.canvas.width / 2 - cx * this.scale * this.config.pxPerMm
    this.offsetY = this.canvas.height / 2 - cy * this.scale * this.config.pxPerMm
  }

  render(components: Component[]): void {
    const { ctx, canvas, config, scale, offsetX, offsetY } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale * config.pxPerMm, scale * config.pxPerMm)

    this.renderer.drawGrid(config.widthMm, config.heightMm, config.gridSpacingMm)

    if (this.showRays) {
      const rays = this.rayTracer.trace(components)
      this.renderer.drawRays(rays)
    }

    if (this.showDistances) {
      this.renderer.drawAllDistances(components)
    }

    this.renderer.drawObjectiveOverlays(components)
    this.renderer.drawComponents(components, this.selectedId)

    if (this.measureA) {
      this.renderer.drawMeasure(this.measureA, this.measureB ?? this.measureCursor)
    }

    ctx.restore()
  }

  screenToMm(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const x = (sx - rect.left - this.offsetX) / (this.config.pxPerMm * this.scale)
    const y = (sy - rect.top - this.offsetY) / (this.config.pxPerMm * this.scale)
    return { x, y }
  }

  private _findAt(mm: { x: number; y: number }, components: Component[]): string | null {
    for (const c of [...components].reverse()) {
      const dx = Math.abs(c.position.xMm - mm.x)
      const dy = Math.abs(c.position.yMm - mm.y)
      const hw = c.type === 'cryo_stage' ? 16 : 12
      const hh = c.type === 'cryo_stage' ? 6  : 5
      if (dx < hw && dy < hh) return c.id
    }
    return null
  }

  private _setupEvents(): void {
    const canvas = this.canvas
    const { signal } = this.abortController

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.altKey || this.activeTool === 'pan') {
        this.isPanning = true
        this.lastPan = { x: e.clientX, y: e.clientY }
        canvas.style.cursor = 'grabbing'
        return
      }

      const mm = this.screenToMm(e.clientX, e.clientY)

      if (this.activeTool === 'measure') {
        if (!this.measureA) {
          // 1º clique — define ponto A, limpa preview
          this.measureA = mm
          this.measureB = null
          this.measureCursor = null
        } else if (!this.measureB) {
          // 2º clique — confirma ponto B, congela a medição
          this.measureB = mm
          this.measureCursor = null
        } else {
          // 3º clique — inicia nova medição
          this.measureA = mm
          this.measureB = null
          this.measureCursor = null
        }
        return
      }

      // select mode
      this._lastComponents = this._lastComponents ?? []
      const id = this._findAt(mm, this._lastComponents)
      if (id) {
        this.dragId = id
        this.onClick?.(id)
      } else {
        this.onClick?.(null)
      }
    }, { signal })

    canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.offsetX += e.clientX - this.lastPan.x
        this.offsetY += e.clientY - this.lastPan.y
        this.lastPan = { x: e.clientX, y: e.clientY }
        return
      }
      if (this.activeTool === 'measure' && this.measureA && !this.measureB) {
        this.measureCursor = this.screenToMm(e.clientX, e.clientY)
        return
      }
      if (this.dragId) {
        const mm = this.screenToMm(e.clientX, e.clientY)
        const pos = this.snapEnabled
          ? { x: snapToGrid(mm.x, this.config.gridSpacingMm), y: snapToGrid(mm.y, this.config.gridSpacingMm) }
          : mm
        this.onMove?.(this.dragId, pos.x, pos.y)
      }
    }, { signal })

    canvas.addEventListener('mouseup', () => {
      if (this.activeTool === 'measure' && this.measureA && this.measureB) {
        // freeze the measurement — next click will start a new one
      }
      this.dragId = null
      this.isPanning = false
      if (this.activeTool === 'pan') canvas.style.cursor = 'grab'
    }, { signal })

    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.measureA = null
        this.measureB = null
        this.measureCursor = null
      }
    }, { signal })

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      this.offsetX = cx - (cx - this.offsetX) * factor
      this.offsetY = cy - (cy - this.offsetY) * factor
      this.scale *= factor
    }, { passive: false, signal })
  }

  // Injected by App.tsx on each render
  _lastComponents: Component[] = []
}
