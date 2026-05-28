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
  // null = usar CSS center; após drag do usuário vira posição absoluta
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({
        x: dragStart.current.px + e.clientX - dragStart.current.mx,
        y: dragStart.current.py + e.clientY - dragStart.current.my,
      })
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
    // captura posição atual do elemento para drag relativo
    const rect = ref.current!.getBoundingClientRect()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top }
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      style={{
        ...styles.bar,
        // sem drag: CSS center-bottom absoluto; após drag: posição fixa pelo usuário
        ...(pos
          ? { left: pos.x, top: pos.y, bottom: undefined, transform: 'none' }
          : { left: '50%', bottom: 16, top: undefined, transform: 'translateX(-50%)' }),
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
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '8px 14px',
    background: 'rgba(18, 18, 35, 0.96)',
    border: '1px solid #3a3a5a',
    borderRadius: 14,
    boxShadow: '0 6px 32px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(10px)',
    userSelect: 'none',
    zIndex: 1000,
  },
  handle: {
    cursor: 'grab', color: '#555', fontSize: 18,
    padding: '0 6px', lineHeight: 1,
  },
  separator: {
    width: 1, height: 44, background: '#3a3a5a', margin: '0 6px', flexShrink: 0,
  },
  btn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 8, cursor: 'pointer', padding: '6px 12px',
    color: '#bbb', transition: 'background 0.12s, color 0.12s',
    minWidth: 58, gap: 2,
  },
  btnActive: {
    background: '#1a2a4a', border: '1px solid #4a90d9', color: '#7ec8f0',
  },
  btnToggleOn: {
    background: '#1a2a1a', border: '1px solid #33cc66', color: '#33cc66',
  },
  btnDanger: {
    color: '#e05555',
  },
  icon: { fontSize: 18, lineHeight: 1.1 },
  label: { fontSize: 11, lineHeight: 1.2, whiteSpace: 'nowrap', fontWeight: 500 },
  shortcut: { fontSize: 9, color: '#555', lineHeight: 1 },
}
