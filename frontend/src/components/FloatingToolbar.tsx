import React, { useEffect, useRef, useState } from 'react'
import type { ToolMode } from '../canvas/OpticalTable'

interface Props {
  activeTool: ToolMode
  onTool: (t: ToolMode) => void
  onFitView: () => void
  onDelete: () => void
  snapEnabled: boolean
  onSnapToggle: () => void
  showRays: boolean
  onRaysToggle: () => void
  showDistances: boolean
  onDistancesToggle: () => void
  lightTheme: boolean
  onThemeToggle: () => void
  onClearAnnotations: () => void
  onUndoAnnotation: () => void
}

const TOOLS: { id: ToolMode; label: string; icon: string; shortcut: string; title: string }[] = [
  { id: 'select',         icon: '↖',  label: 'Selecionar', shortcut: 'S', title: 'Selecionar / mover componentes (S)' },
  { id: 'pan',            icon: '✥',  label: 'Mover mapa', shortcut: 'P', title: 'Arrastar o mapa (P)' },
  { id: 'measure',        icon: '⟺',  label: 'Medir',      shortcut: 'M', title: '1º clique = ponto A · 2º clique = ponto B · 3º = nova medição · Esc cancela (M)' },
  { id: 'annotate-text',  icon: 'T+', label: 'Texto',      shortcut: 'A', title: 'Clique para adicionar anotação de texto (A)' },
  { id: 'annotate-arrow', icon: '↗',  label: 'Seta',       shortcut: '',  title: 'Arraste para desenhar uma seta' },
]

export function FloatingToolbar({
  activeTool, onTool, onFitView, onDelete,
  snapEnabled, onSnapToggle, showRays, onRaysToggle, showDistances, onDistancesToggle,
  lightTheme, onThemeToggle, onClearAnnotations, onUndoAnnotation,
}: Props) {
  const annotating = activeTool === 'annotate-text' || activeTool === 'annotate-arrow'
  const [pos, setPos] = useState({ x: 0, y: 0, initialized: false })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const ref = useRef<HTMLDivElement>(null)

  // Center at bottom on first render
  useEffect(() => {
    if (pos.initialized || !ref.current) return
    const w = ref.current.offsetWidth || 420
    setPos({
      x: window.innerWidth / 2 - w / 2,
      y: window.innerHeight - 76,
      initialized: true,
    })
  })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos(p => ({
        ...p,
        x: dragStart.current.px + e.clientX - dragStart.current.mx,
        y: dragStart.current.py + e.clientY - dragStart.current.my,
      }))
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      switch (e.key.toLowerCase()) {
        case 's': onTool('select'); break
        case 'p': onTool('pan'); break
        case 'm': onTool('measure'); break
        case 'a': onTool('annotate-text'); break
        case 'd': onDistancesToggle(); break
        case 't': onThemeToggle(); break
        case 'f': onFitView(); break
        case 'z': onUndoAnnotation(); break
        case 'delete': case 'backspace': onDelete(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onTool, onFitView, onDelete])

  const startDrag = (e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      style={{
        ...styles.bar,
        left: pos.initialized ? pos.x : '50%',
        top: pos.initialized ? pos.y : undefined,
        bottom: pos.initialized ? undefined : 16,
        transform: pos.initialized ? 'none' : 'translateX(-50%)',
      }}
    >
      {/* Drag handle */}
      <div style={styles.handle} onMouseDown={startDrag} title="Arrastar toolbar">
        ⠿
      </div>

      <div style={styles.separator} />

      {/* Tool buttons */}
      {TOOLS.map(t => (
        <button
          key={t.id}
          style={{ ...styles.btn, ...(activeTool === t.id ? styles.btnActive : {}) }}
          onClick={() => onTool(t.id)}
          title={t.title}
        >
          <span style={styles.icon}>{t.icon}</span>
          <span style={styles.label}>{t.label}</span>
          <span style={styles.shortcut}>{t.shortcut}</span>
        </button>
      ))}

      <div style={styles.separator} />

      {/* Actions */}
      <button style={styles.btn} onClick={onFitView} title="Enquadrar todos os componentes (F)">
        <span style={styles.icon}>⊡</span>
        <span style={styles.label}>Enquadrar</span>
        <span style={styles.shortcut}>F</span>
      </button>
      <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={onDelete} title="Deletar selecionado (Del)">
        <span style={styles.icon}>✕</span>
        <span style={styles.label}>Deletar</span>
        <span style={styles.shortcut}>Del</span>
      </button>

      {/* Annotation actions — só visíveis quando ferramenta de anotação ativa */}
      {annotating && (<>
        <div style={styles.separator} />
        <button style={styles.btn} onClick={onUndoAnnotation} title="Desfazer última anotação (Z)">
          <span style={styles.icon}>↩</span>
          <span style={styles.label}>Desfazer</span>
          <span style={styles.shortcut}>Z</span>
        </button>
        <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={onClearAnnotations} title="Limpar todas as anotações">
          <span style={styles.icon}>⌫</span>
          <span style={styles.label}>Limpar</span>
        </button>
      </>)}

      <div style={styles.separator} />

      {/* Toggles */}
      <button
        style={{ ...styles.btn, ...(showDistances ? styles.btnToggleOn : {}) }}
        onClick={onDistancesToggle}
        title="Mostrar distâncias entre componentes — independente da ferramenta ativa (D)"
      >
        <span style={styles.icon}>⊞</span>
        <span style={styles.label}>Distâncias</span>
        <span style={styles.shortcut}>D</span>
      </button>
      <button
        style={{ ...styles.btn, ...(showRays ? styles.btnToggleOn : {}) }}
        onClick={onRaysToggle}
        title="Mostrar/ocultar traçado de raios"
      >
        <span style={styles.icon}>〜</span>
        <span style={styles.label}>Raios</span>
      </button>
      <button
        style={{ ...styles.btn, ...(snapEnabled ? styles.btnToggleOn : {}) }}
        onClick={onSnapToggle}
        title="Snap para grade de 25mm"
      >
        <span style={styles.icon}>#</span>
        <span style={styles.label}>Snap</span>
      </button>
      <button
        style={{ ...styles.btn, ...(lightTheme ? styles.btnToggleOn : {}) }}
        onClick={onThemeToggle}
        title="Alternar cor de fundo da grade (T)"
      >
        <span style={styles.icon}>◐</span>
        <span style={styles.label}>Fundo</span>
        <span style={styles.shortcut}>T</span>
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    display: 'flex', alignItems: 'center', gap: 2,
    padding: '5px 8px',
    background: 'rgba(18, 18, 35, 0.92)',
    border: '1px solid #2a2a4a',
    borderRadius: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    userSelect: 'none',
    zIndex: 1000,
  },
  handle: {
    cursor: 'grab', color: '#444', fontSize: 14,
    padding: '0 4px', lineHeight: 1,
  },
  separator: {
    width: 1, height: 28, background: '#2a2a4a', margin: '0 4px', flexShrink: 0,
  },
  btn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 6, cursor: 'pointer', padding: '3px 7px',
    color: '#999', transition: 'background 0.1s, color 0.1s',
    minWidth: 44,
  },
  btnActive: {
    background: '#1a2a4a', border: '1px solid #4a90d9', color: '#7ec8f0',
  },
  btnToggleOn: {
    background: '#1a2a1a', border: '1px solid #33cc66', color: '#33cc66',
  },
  btnDanger: {
    color: '#c0392b',
  },
  icon: { fontSize: 13, lineHeight: 1.2 },
  label: { fontSize: 8, lineHeight: 1.3, whiteSpace: 'nowrap' },
  shortcut: { fontSize: 7, color: '#555', lineHeight: 1 },
}
