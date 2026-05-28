import React from 'react'
import { useSceneStore } from '../store/sceneStore'
import { nFromTemp, phaseLabel } from '../utils/physics'
import type { CorrectionType } from '../types/scene'

export function PropsPanel() {
  const { scene, selectedId, updateComponent, removeComponent, dTargetNm, setDTarget, nIceTempK, setNIceTempK } = useSceneStore()
  const comp = scene.components.find(c => c.id === selectedId)
  const n2 = nFromTemp(nIceTempK)

  // Métricas derivadas da objetiva (exibidas como info, não editável)
  const objMetrics = comp?.type === 'objective' ? (() => {
    const na  = comp.na ?? 0.3
    const mag = comp.magnification ?? 10
    const cam = scene.components.find(c => c.type === 'camera')
    const sW  = cam?.sensorWidthMm  ?? 6.4
    const sH  = cam?.sensorHeightMm ?? 4.8
    return {
      resUm:  (0.61 * 0.470 / na).toFixed(3),
      dofUm:  (0.470 / (na * na)).toFixed(2),
      fovW:   (sW / mag).toFixed(3),
      fovH:   (sH / mag).toFixed(3),
      naFactor: (na * na * 100).toFixed(1),
    }
  })() : null

  const tempColor = nIceTempK <= 130 ? '#7ec8f0'
    : nIceTempK <= 150 ? '#f5a623'
    : nIceTempK <= 273 ? '#aaa'
    : '#4a90d9'

  return (
    <div style={styles.panel}>
      {/* ── Físico global ── */}
      <div style={styles.title}>FÍSICO</div>

      <div style={styles.row}>
        <label style={styles.label}>Temperatura (K)</label>
        <span style={{ fontSize: 10, color: tempColor, fontWeight: 700 }}>{nIceTempK} K</span>
      </div>
      <input
        type="range" min={77} max={300} step={1}
        value={nIceTempK}
        onChange={e => setNIceTempK(Number(e.target.value))}
        style={{ width: '100%', marginBottom: 2, accentColor: tempColor }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 8, color: '#555' }}>77 K</span>
        <span style={{ fontSize: 9, color: tempColor }}>{phaseLabel(nIceTempK)}</span>
        <span style={{ fontSize: 8, color: '#555' }}>300 K</span>
      </div>
      <div style={styles.row}>
        <span style={{ fontSize: 9, color: '#777' }}>n₂ (Kofman 2019)</span>
        <span style={{ fontSize: 10, color: '#ffe066', fontWeight: 700 }}>{n2.toFixed(4)}</span>
      </div>
      {nIceTempK > 150 && nIceTempK <= 273 && (
        <div style={{ fontSize: 8, color: '#f5a623', marginBottom: 4 }}>
          Atenção: acima de 150 K o gelo devitrifica
        </div>
      )}
      {nIceTempK > 273 && (
        <div style={{ fontSize: 8, color: '#4a90d9', marginBottom: 4 }}>
          Água líquida: n₂ = 1.333, curva r(d,λ) desloca
        </div>
      )}

      <div style={{ ...styles.title, marginTop: 8 }}>PROPRIEDADES</div>

      <div style={styles.row}>
        <label style={styles.label}>Espessura alvo (nm)</label>
        <input
          type="number" min={0} max={300} step={5}
          value={dTargetNm}
          onChange={e => setDTarget(Number(e.target.value))}
          style={styles.input}
        />
      </div>

      {comp ? (
        <>
          <div style={styles.compId}>{comp.type} · {comp.id}</div>

          <div style={styles.row}>
            <label style={styles.label}>X (mm)</label>
            <input type="number" step={25} value={comp.position.xMm}
              onChange={e => updateComponent(comp.id, { position: { ...comp.position, xMm: +e.target.value } })}
              style={styles.input} />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Y (mm)</label>
            <input type="number" step={25} value={comp.position.yMm}
              onChange={e => updateComponent(comp.id, { position: { ...comp.position, yMm: +e.target.value } })}
              style={styles.input} />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Ângulo (°)</label>
            <input type="number" step={5} value={comp.angleDeg}
              onChange={e => updateComponent(comp.id, { angleDeg: +e.target.value })}
              style={styles.input} />
          </div>

          {/* ── OBJETIVA ── */}
          {comp.na !== undefined && (
            <div style={styles.row}>
              <label style={styles.label}>NA</label>
              <input type="number" step={0.05} min={0.01} max={1.4} value={comp.na}
                onChange={e => updateComponent(comp.id, { na: +e.target.value })}
                style={styles.input} />
            </div>
          )}
          {comp.workingDistanceMm !== undefined && (
            <div style={styles.row}>
              <label style={styles.label}>WD (mm)</label>
              <input type="number" step={1} value={comp.workingDistanceMm}
                onChange={e => updateComponent(comp.id, { workingDistanceMm: +e.target.value })}
                style={styles.input} />
            </div>
          )}
          {comp.type === 'objective' && (
            <>
              <div style={styles.row}>
                <label style={styles.label}>Magnificação</label>
                <input type="number" step={1} min={1} value={comp.magnification ?? 10}
                  onChange={e => updateComponent(comp.id, { magnification: +e.target.value })}
                  style={styles.input} />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>Correção</label>
                <select value={comp.correctionType ?? 'plan'}
                  onChange={e => updateComponent(comp.id, { correctionType: e.target.value as CorrectionType })}
                  style={{ ...styles.input, width: 80 }}>
                  <option value="basic">Basic</option>
                  <option value="plan">Plan</option>
                  <option value="plan_apo">Plan Apo</option>
                </select>
              </div>
              {objMetrics && (
                <div style={styles.derived}>
                  <div style={styles.derivedTitle}>DERIVADO</div>
                  <div style={styles.derivedRow}><span>Resolução (Rayleigh)</span><span>{objMetrics.resUm} µm</span></div>
                  <div style={styles.derivedRow}><span>Prof. de foco (DoF)</span><span>{objMetrics.dofUm} µm</span></div>
                  <div style={styles.derivedRow}><span>FOV (sensor ÷ mag)</span><span>{objMetrics.fovW}×{objMetrics.fovH} mm</span></div>
                  <div style={styles.derivedRow}><span>Fator coleta (NA²)</span><span>{objMetrics.naFactor}%</span></div>
                </div>
              )}
            </>
          )}

          {/* ── CÂMERA ── */}
          {comp.type === 'camera' && (
            <>
              <div style={styles.row}>
                <label style={styles.label}>Sensor W (mm)</label>
                <input type="number" step={0.1} value={comp.sensorWidthMm ?? 6.4}
                  onChange={e => updateComponent(comp.id, { sensorWidthMm: +e.target.value })}
                  style={styles.input} />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>Sensor H (mm)</label>
                <input type="number" step={0.1} value={comp.sensorHeightMm ?? 4.8}
                  onChange={e => updateComponent(comp.id, { sensorHeightMm: +e.target.value })}
                  style={styles.input} />
              </div>
            </>
          )}

          {/* ── BS / DICROICO ── */}
          {comp.reflectance !== undefined && (
            <div style={styles.row}>
              <label style={styles.label}>Reflectância</label>
              <input type="number" step={0.05} min={0} max={1} value={comp.reflectance}
                onChange={e => updateComponent(comp.id, { reflectance: +e.target.value })}
                style={styles.input} />
            </div>
          )}

          <button style={styles.deleteBtn} onClick={() => removeComponent(comp.id)}>
            Remover componente
          </button>
        </>
      ) : (
        <div style={styles.hint}>Clique num componente para editar</div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: { background: '#1e1e35', borderRadius: 6, padding: 10 },
  title: { fontSize: 9, color: '#666', letterSpacing: 1, marginBottom: 8 },
  compId: { fontSize: 10, color: '#4a90d9', marginBottom: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 10, color: '#aaa' },
  input: {
    width: 70, background: '#12121f', border: '1px solid #333',
    color: '#eee', padding: '2px 4px', borderRadius: 3, fontSize: 11,
  },
  derived: {
    background: '#12121f', borderRadius: 4, padding: '5px 7px',
    marginTop: 4, marginBottom: 4,
  },
  derivedTitle: { fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 3 },
  derivedRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 9, color: '#aaa', marginBottom: 2,
  },
  hint: { fontSize: 10, color: '#555', textAlign: 'center', padding: 8 },
  deleteBtn: {
    marginTop: 8, width: '100%', background: '#3a1a1a', border: '1px solid #a33',
    color: '#f88', padding: '4px 0', borderRadius: 4, cursor: 'pointer', fontSize: 10,
  },
}
