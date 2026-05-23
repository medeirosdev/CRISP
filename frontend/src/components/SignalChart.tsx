import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PhysicsResponse } from '../types/physics'
import { useSceneStore } from '../store/sceneStore'

const COLORS = ['#9933ff', '#3399ff', '#33cc66']
const LABELS = ['405 nm', '470 nm', '528 nm']

interface Props {
  physics: PhysicsResponse | null
  wavelengths: number[]
}

export function SignalChart({ physics, wavelengths }: Props) {
  const { dTargetNm } = useSceneStore()

  if (!physics) {
    return (
      <div style={styles.empty}>
        <div style={styles.title}>SINAL r(d, λ)</div>
        <div style={styles.hint}>Adicione uma fonte de luz para ver o sinal</div>
      </div>
    )
  }

  const data = physics.thickness_nm.map((d, i) => {
    const point: Record<string, number> = { d }
    wavelengths.forEach((_, j) => {
      point[`r${j}`] = physics.reflectivity[i]?.[j] ?? 0
    })
    return point
  })

  return (
    <div style={styles.panel}>
      <div style={styles.title}>SINAL r(d, λ)</div>
      <div style={styles.zone}>
        Zona: <span style={{ color: zoneColor(physics.zone) }}>{physics.zone}</span>
        {' · '}OPD: {physics.opd_nm.toFixed(0)} nm
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          <XAxis dataKey="d" tick={{ fontSize: 8 }} label={{ value: 'd (nm)', position: 'insideBottom', offset: -2, fontSize: 8 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 8 }} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }}
            formatter={(v: number) => v.toFixed(3)}
            labelFormatter={(l: number) => `d = ${l} nm`}
          />
          <Legend wrapperStyle={{ fontSize: 9 }} />
          <ReferenceLine x={dTargetNm} stroke="#ffe066" strokeDasharray="3 3" label={{ value: `${dTargetNm}nm`, fontSize: 8, fill: '#ffe066' }} />
          {wavelengths.map((_, j) => (
            <Line
              key={j}
              dataKey={`r${j}`}
              name={LABELS[j] ?? `${wavelengths[j]} nm`}
              stroke={COLORS[j]}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div style={styles.rValues}>
        {physics.r_at_target.map((r, j) => (
          <span key={j} style={{ color: COLORS[j], marginRight: 8, fontSize: 10 }}>
            r({dTargetNm}nm, {wavelengths[j]}nm) = {r.toFixed(3)}
          </span>
        ))}
      </div>
    </div>
  )
}

function zoneColor(zone: string): string {
  if (zone === 'monotonic') return '#33cc66'
  if (zone === 'ambiguous') return '#f5a623'
  return '#3399ff'
}

const styles: Record<string, React.CSSProperties> = {
  panel: { background: '#1e1e35', borderRadius: 6, padding: 10 },
  empty: { background: '#1e1e35', borderRadius: 6, padding: 10 },
  title: { fontSize: 9, color: '#666', letterSpacing: 1, marginBottom: 6 },
  hint: { fontSize: 10, color: '#555', textAlign: 'center' },
  zone: { fontSize: 10, color: '#aaa', marginBottom: 4 },
  rValues: { marginTop: 4, display: 'flex', flexWrap: 'wrap' },
}
