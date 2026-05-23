import type { Component } from '../types/scene'
import { wavelengthToRgba } from '../utils/colors'

export interface Ray {
  x1: number; y1: number
  x2: number; y2: number
  wavelengthNm: number
  intensity: number
  isReflected: boolean
}

interface HitPoint {
  x: number
  y: number
  component: Component
  normalAngle: number
}

export class RayTracer {
  trace(components: Component[]): Ray[] {
    const rays: Ray[] = []
    const sources = components.filter(
      c => c.type === 'source_led' || c.type === 'source_laser'
    )

    for (const source of sources) {
      for (const lam of (source.wavelengthsNm ?? [470])) {
        const sourceRays = this._genSourceRays(source, lam)
        for (const ray of sourceRays) {
          rays.push(...this._propagate(ray, components))
        }
      }
    }
    return rays
  }

  static wavelengthToColor(nm: number, alpha: number): string {
    return wavelengthToRgba(nm, alpha)
  }

  private _genSourceRays(source: Component, lam: number): Ray[] {
    const isFan = source.type === 'source_led'
    const angles = isFan ? [-6, -3, 0, 3, 6] : [0]
    const base = (source.angleDeg ?? 0) * Math.PI / 180

    return angles.map(da => {
      const a = base + da * Math.PI / 180
      return {
        x1: source.position.xMm,
        y1: source.position.yMm,
        x2: source.position.xMm + 1000 * Math.cos(a),
        y2: source.position.yMm + 1000 * Math.sin(a),
        wavelengthNm: lam,
        intensity: 1.0 / angles.length,
        isReflected: false,
      }
    })
  }

  private _propagate(ray: Ray, components: Component[], depth = 0): Ray[] {
    if (depth > 8) return []
    const hit = this._findHit(ray, components)
    if (!hit) return [ray]

    const trimmed: Ray = { ...ray, x2: hit.x, y2: hit.y }
    const children = this._applyComponent(ray, hit, depth)
    const result = [trimmed]
    for (const child of children) {
      result.push(...this._propagate(child, components, depth + 1))
    }
    return result
  }

  private _findHit(ray: Ray, components: Component[]): HitPoint | null {
    let closest: HitPoint | null = null
    let minDist = Infinity

    for (const comp of components) {
      // Skip sources — rays don't hit their own source
      if (comp.type === 'source_led' || comp.type === 'source_laser') continue

      const hit = this._intersect(ray, comp)
      if (hit) {
        const d = Math.hypot(hit.x - ray.x1, hit.y - ray.y1)
        if (d > 0.5 && d < minDist) {
          minDist = d
          closest = hit
        }
      }
    }
    return closest
  }

  private _intersect(ray: Ray, comp: Component): HitPoint | null {
    // Model each component as a line segment of width 20mm, rotated by angleDeg
    const cx = comp.position.xMm
    const cy = comp.position.yMm
    const half = 10  // half-width mm
    const a = (comp.angleDeg ?? 0) * Math.PI / 180
    const cos = Math.cos(a), sin = Math.sin(a)

    // Segment endpoints
    const sx1 = cx - half * cos; const sy1 = cy - half * sin
    const sx2 = cx + half * cos; const sy2 = cy + half * sin

    const hit = this._segmentIntersect(
      ray.x1, ray.y1, ray.x2, ray.y2,
      sx1, sy1, sx2, sy2
    )
    if (!hit) return null

    // Normal is perpendicular to the component segment
    const normalAngle = a + Math.PI / 2
    return { x: hit.x, y: hit.y, component: comp, normalAngle }
  }

  private _segmentIntersect(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number
  ): { x: number, y: number } | null {
    const r = { x: bx - ax, y: by - ay }
    const s = { x: dx - cx, y: dy - cy }
    const denom = r.x * s.y - r.y * s.x
    if (Math.abs(denom) < 1e-10) return null

    const t = ((cx - ax) * s.y - (cy - ay) * s.x) / denom
    const u = ((cx - ax) * r.y - (cy - ay) * r.x) / denom

    if (t > 0.001 && t < 1 && u >= 0 && u <= 1) {
      return { x: ax + t * r.x, y: ay + t * r.y }
    }
    return null
  }

  private _applyComponent(ray: Ray, hit: HitPoint, _depth: number): Ray[] {
    const { component, normalAngle } = hit
    const rays: Ray[] = []

    switch (component.type) {
      case 'mirror':
        rays.push(this._reflect(ray, hit, normalAngle, 0.95))
        break

      case 'beamsplitter': {
        const R = component.reflectance ?? 0.5
        rays.push(this._reflect(ray, hit, normalAngle, R))
        rays.push(this._transmit(ray, hit, 1 - R))
        break
      }

      case 'dichroic': {
        const cutoff = component.cutoffNm ?? 505
        const R = ray.wavelengthNm < cutoff ? 0.90 : 0.10
        rays.push(this._reflect(ray, hit, normalAngle, R))
        rays.push(this._transmit(ray, hit, 1 - R))
        break
      }

      case 'objective':
      case 'lens':
        // Refocus — approximate as transmit with slight convergence
        rays.push(this._transmit(ray, hit, 0.95))
        break

      default:
        // Camera, cryo_stage, filters absorb the ray
        break
    }
    return rays
  }

  private _reflect(ray: Ray, hit: HitPoint, normalAngle: number, intensity: number): Ray {
    const dx = ray.x2 - ray.x1
    const dy = ray.y2 - ray.y1
    const nx = Math.cos(normalAngle), ny = Math.sin(normalAngle)
    const dot = dx * nx + dy * ny
    return {
      x1: hit.x, y1: hit.y,
      x2: hit.x + (dx - 2 * dot * nx) * 200,
      y2: hit.y + (dy - 2 * dot * ny) * 200,
      wavelengthNm: ray.wavelengthNm,
      intensity: ray.intensity * intensity,
      isReflected: true,
    }
  }

  private _transmit(ray: Ray, hit: HitPoint, intensity: number): Ray {
    const dx = ray.x2 - ray.x1
    const dy = ray.y2 - ray.y1
    const len = Math.hypot(dx, dy)
    return {
      x1: hit.x, y1: hit.y,
      x2: hit.x + (dx / len) * 500,
      y2: hit.y + (dy / len) * 500,
      wavelengthNm: ray.wavelengthNm,
      intensity: ray.intensity * intensity,
      isReflected: false,
    }
  }
}
