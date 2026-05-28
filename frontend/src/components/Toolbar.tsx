import React, { useEffect, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { wsClient } from '../ws/WebSocketClient'
import type { WsStatus } from '../ws/WebSocketClient'

export function Toolbar() {
  const { scene, setScene } = useSceneStore()
  const [wsStatus, setWsStatus] = useState<WsStatus>(wsClient.status)

  useEffect(() => {
    wsClient.onStatus(setWsStatus)
  }, [])

  const save = () => {
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${scene.name.replace(/\s/g, '_')}.json`
    a.click()
  }

  const load = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      file.text().then(text => {
        try {
          setScene(JSON.parse(text))
        } catch {
          alert('Arquivo inválido: o JSON não pôde ser lido.')
        }
      })
    }
    input.click()
  }

  const statusColor = wsStatus === 'connected' ? '#33cc66' : wsStatus === 'connecting' ? '#f5a623' : '#e05555'
  const statusLabel = wsStatus === 'connected' ? 'Backend OK' : wsStatus === 'connecting' ? 'Conectando…' : 'Sem backend'

  return (
    <div style={styles.toolbar}>
      <button style={styles.btn} onClick={save}>Salvar</button>
      <button style={styles.btn} onClick={load}>Abrir</button>
      <span style={styles.sceneName}>{scene.name}</span>
      <span style={{ ...styles.wsBadge, background: statusColor + '22', border: `1px solid ${statusColor}66`, color: statusColor }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block', marginRight: 4 }} />
        {statusLabel}
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', gap: 6, alignItems: 'center' },
  btn: {
    background: '#232340', border: '1px solid #444', color: '#ddd',
    padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
  },
  sceneName: { fontSize: 11, color: '#666' },
  wsBadge: {
    fontSize: 10, padding: '2px 8px', borderRadius: 10,
    display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' as const,
  },
}
