import React from 'react'
import { useSceneStore } from '../store/sceneStore'

export function Toolbar() {
  const { scene, setScene } = useSceneStore()

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
      file.text().then(text => setScene(JSON.parse(text)))
    }
    input.click()
  }

  return (
    <div style={styles.toolbar}>
      <button style={styles.btn} onClick={save}>💾 Salvar</button>
      <button style={styles.btn} onClick={load}>📂 Abrir</button>
      <span style={styles.sceneName}>{scene.name}</span>
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
}
