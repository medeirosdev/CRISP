import React, { useEffect, useRef, useState } from 'react'

interface Props {
  isOpen: boolean
  onConfirm: (text: string) => void
  onCancel: () => void
}

export function AnnotationModal({ isOpen, onConfirm, onCancel }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setText('')
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
      if (e.key === 'Enter')  { e.stopPropagation(); handleConfirm() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isOpen, text])

  const handleConfirm = () => {
    if (text.trim()) onConfirm(text.trim())
    else onCancel()
  }

  if (!isOpen) return null

  return (
    <div style={styles.backdrop} onClick={onCancel}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>Nova anotação</div>

        <input
          ref={inputRef}
          style={styles.input}
          type="text"
          placeholder="Digite o texto..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={80}
        />

        <div style={styles.hint}>Enter para confirmar · Esc para cancelar</div>

        <div style={styles.buttons}>
          <button style={styles.btnCancel} onClick={onCancel}>Cancelar</button>
          <button
            style={{ ...styles.btnConfirm, ...(text.trim() ? {} : styles.btnDisabled) }}
            onClick={handleConfirm}
            disabled={!text.trim()}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(2px)',
  },
  card: {
    background: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: 10,
    padding: '20px 24px',
    width: 340,
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 13, fontWeight: 700, color: '#ffe066',
    letterSpacing: 0.5, marginBottom: 14,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: '#0d0d1a', border: '1px solid #4a4a6a',
    borderRadius: 6, color: '#eee', fontSize: 13,
    padding: '8px 10px', outline: 'none',
    transition: 'border-color 0.15s',
  },
  hint: {
    fontSize: 10, color: '#555', marginTop: 6, marginBottom: 14,
  },
  buttons: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
  },
  btnCancel: {
    background: 'transparent', border: '1px solid #444',
    color: '#888', borderRadius: 6, padding: '6px 14px',
    fontSize: 12, cursor: 'pointer',
  },
  btnConfirm: {
    background: '#ffe066', border: 'none',
    color: '#1a1a00', borderRadius: 6, padding: '6px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.35, cursor: 'not-allowed',
  },
}
