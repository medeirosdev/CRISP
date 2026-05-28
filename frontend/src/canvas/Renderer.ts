import type { Component } from '../types/scene'
import type { Ray } from './RayTracer'
import { wavelengthToRgba, COMPONENT_COLORS } from '../utils/colors'


const ICONS: Record<string, string> = {
  source_led:    '💡',
  source_laser:  '🔴',
  beamsplitter:  'BS',
  dichroic:      'DC',
  objective:     'OBJ',
  camera:        '📷',
  cryo_stage:    '❄️',
  mirror:        'M',
  filter_bandpass: 'BP',
  filter_nd:     'ND',
  iris:          'Ø',
  lens:          'L',
  post:          '|',
}

export class Renderer {
  lightTheme: boolean = false
  constructor(private ctx: CanvasRenderingContext2D) {}

  drawRays(rays: Ray[]): void {
    const { ctx } = this
    for (const ray of rays) {
      if (ray.intensity < 0.01) continue
      ctx.beginPath()
      ctx.moveTo(ray.x1, ray.y1)
      ctx.lineTo(ray.x2, ray.y2)
      ctx.strokeStyle = wavelengthToRgba(ray.wavelengthNm, Math.min(ray.intensity * 0.8, 0.7))
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  drawComponents(components: Component[], selectedId?: string | null): void {
    for (const comp of components) {
      this._drawComponent(comp, comp.id === selectedId)
    }
  }

  private _drawComponent(comp: Component, selected: boolean): void {
    const { ctx } = this
    const { xMm, yMm } = comp.position
    const angle = (comp.angleDeg ?? 0) * Math.PI / 180
    const color = COMPONENT_COLORS[comp.type] ?? '#999'
    const isCryo = comp.type === 'cryo_stage'

    ctx.save()
    ctx.translate(xMm, yMm)
    ctx.rotate(angle)

    if (isCryo) {
      // Estágio cryo: recipiente mais largo e alto com borda dupla
      const w = 30, h = 8
      // Camada externa (parede do recipiente)
      ctx.fillStyle = selected ? '#fff' : 'rgba(30, 80, 140, 0.85)'
      ctx.strokeStyle = selected ? color : '#4a90d9'
      ctx.lineWidth = selected ? 0.6 : 0.5
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.strokeRect(-w / 2, -h / 2, w, h)
      // Camada interna (amostra em LN₂)
      ctx.strokeStyle = 'rgba(74,144,217,0.45)'
      ctx.lineWidth = 0.25
      ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3)

      // Texto CRYO
      ctx.rotate(-angle)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 3.5px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText('CRYO', 0, -1.2)
      ctx.font = '2.8px sans-serif'
      ctx.fillStyle = '#7ec8f0'
      ctx.fillText('77 K  /  −196 °C', 0, 2.2)
      // Label abaixo
      if (comp.label) {
        ctx.font = '3px sans-serif'
        ctx.fillStyle = '#aad4f5'
        ctx.fillText(comp.label, 0, 7.5)
      }
    } else if (comp.type === 'objective') {
      const mag = (comp as import('../types/scene').Component).magnification ?? 10
      const na  = (comp as import('../types/scene').Component).na ?? 0.3
      // corpo compacto — detalhes ficam nos overlays (WD, FOV, Res, DoF)
      const w = 12, h = 6
      ctx.fillStyle = selected ? '#fff' : 'rgba(15, 60, 35, 0.92)'
      ctx.strokeStyle = selected ? color : '#2ecc71'
      ctx.lineWidth = selected ? 0.7 : 0.55
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.strokeRect(-w / 2, -h / 2, w, h)

      ctx.rotate(-angle)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.font = 'bold 3.5px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText('OBJ', 0, -1.2)

      ctx.font = '2.4px sans-serif'
      ctx.fillStyle = '#7dffc3'
      ctx.fillText(`${mag}×  NA${na.toFixed(2)}`, 0, 2.0)

      if (comp.label) {
        ctx.font = '2.8px sans-serif'
        ctx.fillStyle = '#2ecc71'
        ctx.fillText(comp.label, 0, 6.5)
      }
    } else {
      // Componentes normais
      const w = 20, h = 4
      ctx.fillStyle = selected ? '#fff' : color
      ctx.strokeStyle = selected ? color : '#333'
      ctx.lineWidth = selected ? 0.5 : 0.3
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.strokeRect(-w / 2, -h / 2, w, h)

      ctx.rotate(-angle)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 3.5px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ICONS[comp.type] ?? '?', 0, 0)

      if (comp.label) {
        ctx.font = '3px sans-serif'
        ctx.fillStyle = '#e0e0e0'
        ctx.fillText(comp.label, 0, 5.5)
      }
    }

    ctx.restore()
  }

  drawGrid(widthMm: number, heightMm: number, spacingMm: number): void {
    const { ctx } = this

    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)'
    ctx.lineWidth = 0.05

    for (let x = 0; x <= widthMm; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, heightMm); ctx.stroke()
    }
    for (let y = 0; y <= heightMm; y += 5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(widthMm, y); ctx.stroke()
    }

    // Grid holes at 25mm
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)'
    ctx.lineWidth = 0.2
    for (let x = 0; x <= widthMm; x += spacingMm) {
      for (let y = 0; y <= heightMm; y += spacingMm) {
        ctx.beginPath()
        ctx.arc(x, y, 0.8, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  drawAllDistances(components: import('../types/scene').Component[]): void {
    const { ctx } = this
    ctx.save()
    ctx.setLineDash([1.5, 2])
    ctx.lineWidth = 0.15
    ctx.font = '2.2px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i].position
        const b = components[j].position
        const d = Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm)
        if (d > 250) continue
        const alpha = Math.max(0.08, 0.4 * (1 - d / 250))
        ctx.strokeStyle = this.lightTheme ? `rgba(200, 30, 80, ${alpha * 1.5})` : `rgba(120, 190, 255, ${alpha})`
        ctx.fillStyle   = this.lightTheme ? `rgba(200, 30, 80, ${Math.min(alpha * 2, 0.8)})` : `rgba(160, 210, 255, ${Math.min(alpha * 1.6, 0.55)})`
        ctx.beginPath()
        ctx.moveTo(a.xMm, a.yMm)
        ctx.lineTo(b.xMm, b.yMm)
        ctx.stroke()
        ctx.fillText(`${d.toFixed(0)} mm`, (a.xMm + b.xMm) / 2, (a.yMm + b.yMm) / 2 - 1)
      }
    }
    ctx.restore()
  }

  drawMeasure(a: { x: number; y: number }, b: { x: number; y: number } | null): void {
    const { ctx } = this
    ctx.save()

    const color = this.lightTheme ? '#d93654' : '#ffe066'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(a.x, a.y, 1.8, 0, Math.PI * 2)
    ctx.fill()

    if (b) {
      ctx.beginPath()
      ctx.setLineDash([1.2, 1.2])
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = color
      ctx.lineWidth = 0.45
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2)
      ctx.fill()

      const d = Math.hypot(b.x - a.x, b.y - a.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2

      // background pill
      ctx.font = 'bold 4.5px sans-serif'
      const label = `${d.toFixed(1)} mm`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = this.lightTheme ? 'rgba(255, 255, 255, 0.85)' : 'rgba(20,20,40,0.75)'
      ctx.beginPath()
      ctx.roundRect(mx - tw / 2 - 1.5, my - 7, tw + 3, 5.5, 1)
      ctx.fill()

      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(label, mx, my - 2)
    }

    ctx.restore()
  }

  // Helper: texto com fundo em pill visível contra canvas escuro
  private _pill(x: number, y: number, text: string, color: string, size = 2.8): void {
    const { ctx } = this
    ctx.save()
    ctx.font = `${size}px sans-serif`
    const tw = ctx.measureText(text).width
    const pad = 1.4, ph = size + 1.4
    const rx = x - tw / 2 - pad, ry = y - ph / 2, rw = tw + pad * 2, rh = ph
    // fundo com leve tint azul para destacar do canvas preto ou branco no lightTheme
    ctx.fillStyle = this.lightTheme ? 'rgba(250, 250, 250, 0.93)' : 'rgba(18, 26, 58, 0.93)'
    ctx.beginPath()
    if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === 'function') {
      ctx.roundRect(rx, ry, rw, rh, 1.2)
    } else {
      ctx.rect(rx, ry, rw, rh)
    }
    ctx.fill()
    // borda sutil para delinear a pill
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 0.15
    ctx.stroke()
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  drawObjectiveOverlays(components: Component[]): void {
    const obj    = components.find(c => c.type === 'objective')
    const sample = components.find(c => c.type === 'cryo_stage')
    const cam    = components.find(c => c.type === 'camera')
    if (!obj) return

    const { ctx } = this
    const ox  = obj.position.xMm, oy  = obj.position.yMm
    const a   = (obj.angleDeg ?? 90) * Math.PI / 180
    const wd  = obj.workingDistanceMm ?? 34
    const na  = obj.na ?? 0.3
    const mag = obj.magnification ?? 10

    // Vetores de referência
    const ax = Math.cos(a),  ay = Math.sin(a)   // ao longo do eixo óptico
    const px = -ay,          py = ax             // perpendicular (esquerda)

    // Plano focal
    const fx = ox + wd * ax,  fy = oy + wd * ay

    ctx.save()

    // ── 0. Badge de specs junto ao componente ─────────────────────
    // Posicionado perpendicular ao eixo óptico, do lado oposto ao WD label
    const badgeX = ox - px * 10
    const badgeY = oy - py * 10
    this._pill(badgeX, badgeY - 2.0, `${mag}×  /  NA ${na.toFixed(2)}`, 'rgba(100,255,160,0.92)', 2.5)
    this._pill(badgeX, badgeY + 2.0, `WD ${wd} mm`, 'rgba(46,204,113,0.80)', 2.2)

    // ── 1. Linha WD ───────────────────────────────────────────────
    ctx.beginPath()
    ctx.setLineDash([2, 1.5])
    ctx.moveTo(ox, oy)
    ctx.lineTo(fx, fy)
    ctx.strokeStyle = 'rgba(46,204,113,0.50)'
    ctx.lineWidth = 0.4
    ctx.stroke()
    ctx.setLineDash([])

    // Marcador do plano focal (cruz)
    ctx.beginPath()
    ctx.moveTo(fx + px * 7, fy + py * 7)
    ctx.lineTo(fx - px * 7, fy - py * 7)
    ctx.strokeStyle = 'rgba(46,204,113,0.85)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Label WD: à ESQUERDA da linha, no meio
    const wdLx = (ox + fx) / 2 + px * 6
    const wdLy = (oy + fy) / 2 + py * 6
    this._pill(wdLx, wdLy, `WD = ${wd} mm`, 'rgba(46,204,113,0.95)')

    // ── 2. Retângulo FOV no plano da amostra ──────────────────────
    const sPos = sample?.position ?? { xMm: fx, yMm: fy }
    const sx = sPos.xMm, sy = sPos.yMm

    const sensW = cam?.sensorWidthMm  ?? 6.4
    const sensH = cam?.sensorHeightMm ?? 4.8
    const fovW = sensW / mag   // largura no plano da amostra (mm)
    const fovH = sensH / mag   // altura no plano da amostra (mm)

    // Rect rotacionado: largura ao longo de px, altura ao longo de ax
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(a - Math.PI / 2)
    ctx.fillStyle = 'rgba(74,144,217,0.07)'
    ctx.strokeStyle = 'rgba(74,144,217,0.65)'
    ctx.lineWidth = 0.35
    ctx.setLineDash([1.5, 1.5])
    ctx.fillRect(-fovW / 2, -fovH / 2, fovW, fovH)
    ctx.strokeRect(-fovW / 2, -fovH / 2, fovW, fovH)
    ctx.setLineDash([])
    ctx.restore()

    // Label largura: ACIMA do rect (lado oposto ao eixo óptico, afastado da amostra)
    const fovTopX = sx - ax * (fovH / 2 + 5)
    const fovTopY = sy - ay * (fovH / 2 + 5)
    this._pill(fovTopX, fovTopY, `${fovW.toFixed(2)} × ${fovH.toFixed(2)} mm  FOV`, 'rgba(74,144,217,0.95)', 2.7)

    // ── 3. Info de resolução e DoF: à DIREITA do rect ────────────
    const resUm = 0.61 * 0.470 / na
    const dofUm = 0.470 / (na * na)

    const gap = fovW / 2 + 7
    const infoX = sx - px * gap   // lado oposto a px (direita)
    const infoY = sy - py * gap

    this._pill(infoX, infoY - 3.5, `Res: ${resUm.toFixed(2)} µm`, this.lightTheme ? '#b82e46' : 'rgba(255,224,102,0.90)', 2.6)
    this._pill(infoX, infoY + 0.5, `DoF: ${dofUm.toFixed(1)} µm`, this.lightTheme ? '#cc5500' : 'rgba(255,200,80,0.75)', 2.6)

    ctx.restore()
  }

  drawDistanceLabel(ax: number, ay: number, bx: number, by: number): void {
    const { ctx } = this
    const d = Math.hypot(bx - ax, by - ay)
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2

    ctx.beginPath()
    ctx.setLineDash([1, 1])
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.strokeStyle = this.lightTheme ? 'rgba(217, 54, 84, 0.8)' : 'rgba(255,200,0,0.8)'
    ctx.lineWidth = 0.3
    ctx.stroke()
    ctx.setLineDash([])

    ctx.font = '3px sans-serif'
    ctx.fillStyle = this.lightTheme ? '#d93654' : '#ffe066'
    ctx.textAlign = 'center'
    ctx.fillText(`${d.toFixed(1)} mm`, mx, my - 2)
  }

  // ── Speckle overlay (laser coerente) ──────────────────────────────
  drawSpeckleOverlay(widthMm: number, heightMm: number): void {
    const { ctx } = this
    ctx.save()
    // Gera padrão de grãos com semente fixa (speckle é estático com laser)
    let seed = 0x9e3779b9
    const rand = () => {
      seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5
      return ((seed >>> 0) / 0xffffffff)
    }
    const grain = 0.7   // tamanho do grão em mm (≈ Airy disk na escala do canvas)
    const count = Math.floor(widthMm * heightMm * 0.18 / (grain * grain))
    ctx.fillStyle = this.lightTheme
      ? 'rgba(80, 40, 0, 0.07)'
      : 'rgba(210, 190, 160, 0.10)'
    for (let i = 0; i < count; i++) {
      const x = rand() * widthMm
      const y = rand() * heightMm
      ctx.beginPath()
      ctx.arc(x, y, grain * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
    // Label de aviso no canto
    this._pill(widthMm - 18, 5, 'SPECKLE (laser)', 'rgba(255,140,60,0.90)', 2.4)
    ctx.restore()
  }

  // ── Anotações livres ──────────────────────────────────────────────
  drawAnnotations(annotations: import('../types/scene').Annotation[]): void {
    const { ctx } = this
    for (const ann of annotations) {
      if (ann.type === 'text' && ann.text) {
        this._pill(ann.x, ann.y, ann.text, ann.color, 3.2)
      } else if (ann.type === 'arrow' && ann.toX !== undefined && ann.toY !== undefined) {
        ctx.save()
        ctx.strokeStyle = ann.color
        ctx.fillStyle = ann.color
        ctx.lineWidth = 0.5

        // Linha
        ctx.beginPath()
        ctx.moveTo(ann.x, ann.y)
        ctx.lineTo(ann.toX, ann.toY)
        ctx.stroke()

        // Ponta da seta
        const dx = ann.toX - ann.x, dy = ann.toY - ann.y
        const len = Math.hypot(dx, dy)
        if (len > 0.5) {
          const ux = dx / len, uy = dy / len
          const hw = 2.5, hl = 4
          ctx.beginPath()
          ctx.moveTo(ann.toX, ann.toY)
          ctx.lineTo(ann.toX - ux * hl - uy * hw, ann.toY - uy * hl + ux * hw)
          ctx.lineTo(ann.toX - ux * hl + uy * hw, ann.toY - uy * hl - ux * hw)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
    }
  }

  // Preview de seta durante drag de anotação
  drawAnnotationArrowPreview(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const { ctx } = this
    ctx.save()
    ctx.setLineDash([1.5, 1.5])
    ctx.strokeStyle = 'rgba(255,220,80,0.8)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
}
