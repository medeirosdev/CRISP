import React from 'react'
import type { PhysicsResponse } from '../types/physics'

interface Props { physics: PhysicsResponse | null; wavelengths?: number[] }

const LEVEL_COLORS: Record<string, string> = {
  ok:      '#33cc66',
  info:    '#3399ff',
  warning: '#f5a623',
  error:   '#e74c3c',
}

export function ValidationPanel({ physics, wavelengths = [405, 470, 528] }: Props) {
  return (
    <div style={styles.panel}>
      <div style={styles.title}>VALIDAÇÃO</div>

      {physics ? (
        <>
          {physics.validation.map((item, i) => (
            <div key={i} style={{ ...styles.item, borderLeft: `3px solid ${LEVEL_COLORS[item.level]}` }}>
              <span style={{ color: LEVEL_COLORS[item.level], fontSize: 9, fontWeight: 600 }}>
                {item.level.toUpperCase()}
              </span>
              <span style={styles.msg}>{item.message}</span>
            </div>
          ))}

          <div style={styles.subTitle}>COERÊNCIA</div>
          {physics.coherence.map((c, i) => (
            <div key={i} style={{ ...styles.item, borderLeft: `3px solid ${c.ok ? '#33cc66' : '#e74c3c'}` }}>
              <span style={styles.msg}>{c.message}</span>
            </div>
          ))}

          <div style={styles.subTitle}>EFICIÊNCIA DE COLETA</div>
          {Object.keys(physics.efficiency).length === 0 ? (
            <div style={styles.hint}>Sem divisor de feixe na cena</div>
          ) : (
            Object.entries(physics.efficiency).map(([k, v]) => (
              <div key={k} style={styles.effRow}>
                <span style={styles.label}>{k}</span>
                <span style={styles.val}>{typeof v === 'number' ? v.toFixed(1) : v}%</span>
              </div>
            ))
          )}

          <div style={styles.subTitle}>ÍNDICE DE REFRAÇÃO</div>
          {physics.n_values.map((n, i) => (
            <div key={i} style={styles.effRow}>
              <span style={styles.label}>n({wavelengths[i] ?? `λ${i + 1}`} nm)</span>
              <span style={styles.val}>{n.toFixed(4)}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={styles.hint}>Aguardando dados do backend...</div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: { background: '#1e1e35', borderRadius: 6, padding: 10 },
  title: { fontSize: 9, color: '#666', letterSpacing: 1, marginBottom: 6 },
  subTitle: { fontSize: 8, color: '#555', letterSpacing: 1, marginTop: 8, marginBottom: 3 },
  item: { padding: '4px 6px', marginBottom: 3, background: '#12121f', borderRadius: 3 },
  msg: { display: 'block', fontSize: 9, color: '#ccc', marginTop: 1 },
  effRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 },
  label: { fontSize: 9, color: '#888' },
  val:   { fontSize: 9, color: '#eee', fontWeight: 600 },
  hint:  { fontSize: 10, color: '#555' },
}
