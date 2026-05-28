import type { Scene } from '../types/scene'
import type { PhysicsResponse } from '../types/physics'
import { sceneToBackend } from '../types/scene'

type PhysicsCallback = (response: PhysicsResponse) => void
type ErrorCallback = (error: string) => void
export type WsStatus = 'connected' | 'disconnected' | 'connecting'
type StatusCallback = (s: WsStatus) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private callbacks: PhysicsCallback[] = []
  private errorCallbacks: ErrorCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  status: WsStatus = 'disconnected'
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingRequest: object | null = null
  private url: string = 'ws://localhost:8000/ws'

  connect(url = 'ws://localhost:8000/ws'): void {
    this.url = url
    this._setStatus('connecting')
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this._setStatus('connected')
      if (this.pendingRequest) {
        this._send(this.pendingRequest)
        this.pendingRequest = null
      }
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.error) {
        this.errorCallbacks.forEach(cb => cb(data.error))
      } else {
        this.callbacks.forEach(cb => cb(data as PhysicsResponse))
      }
    }

    this.ws.onclose = () => {
      this._setStatus('disconnected')
      setTimeout(() => this.connect(this.url), 2000)
    }

    this.ws.onerror = () => {
      this._setStatus('disconnected')
    }
  }

  private _setStatus(s: WsStatus): void {
    this.status = s
    this.statusCallbacks.forEach(cb => cb(s))
  }

  requestUpdate(scene: Scene, params: {
    wavelengthsNm: number[]
    fwhmNm: number[]
    dTargetNm: number
    dMaxNm?: number
    sourceType: 'led' | 'laser'
    useKofmanN?: boolean
  }): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      const payload = {
        scene: sceneToBackend(scene),
        wavelengths_nm: params.wavelengthsNm,
        fwhm_nm: params.fwhmNm,
        d_target_nm: params.dTargetNm,
        d_max_nm: params.dMaxNm ?? 300,
        source_type: params.sourceType,
        use_kofman_n: params.useKofmanN ?? true,
      }
      if (this.ws?.readyState === WebSocket.OPEN) {
        this._send(payload)
      } else {
        this.pendingRequest = payload
      }
    }, 200)
  }

  onUpdate(cb: PhysicsCallback): void { this.callbacks.push(cb) }
  onError(cb: ErrorCallback): void { this.errorCallbacks.push(cb) }
  onStatus(cb: StatusCallback): void { this.statusCallbacks.push(cb) }

  private _send(data: object): void {
    this.ws?.send(JSON.stringify(data))
  }
}

export const wsClient = new WebSocketClient()
