# CRISP — Cryo Interferometry Simulator and Planner

> Simulador interativo de bancada óptica para planejar setups de interferometria de película fina em amostras cryo-EM.
> Desenvolvido no contexto do projeto PIBIC **SIBIPIRUNA** — CNPEM / LNLS.

---

## Sumário

- [O que é o CRISP](#o-que-é-o-crisp)
- [Funcionalidades](#funcionalidades)
- [Como iniciar](#como-iniciar)
- [Interface](#interface)
- [Componentes disponíveis](#componentes-disponíveis)
- [Física implementada](#física-implementada)
- [Parâmetros da objetiva](#parâmetros-da-objetiva)
- [Sistema de validação](#sistema-de-validação)
- [Traçado de raios](#traçado-de-raios)
- [Presets de literatura](#presets-de-literatura)
- [Arquitetura do sistema](#arquitetura-do-sistema)
- [Referências](#referências)

---

## O que é o CRISP

O CRISP é uma ferramenta de simulação e planejamento de bancada óptica para interferometria de reflexão de película fina em amostras de cryo-EM. O objetivo é medir a espessura do gelo vítreo depositado sobre grids de cryo-EM **antes da coleta de dados no microscópio eletrônico**, permitindo selecionar regiões com espessura ideal (20–80 nm) para alta resolução.

O simulador permite ao pesquisador:

- Montar virtualmente um setup óptico arrastando componentes num canvas 2D em escala (mm)
- Ver o traçado de raios em tempo real com reflexão, transmissão e divisão espectral
- Calcular a curva de refletividade teórica `r(d, λ)` para o setup configurado
- Visualizar overlays de WD, FOV, resolução e DoF diretamente no canvas
- Receber avisos automáticos de inconsistências físicas (foco, NA, correção cromática)
- Carregar presets de setups publicados na literatura (Hohle 2022, Last 2023, LNLS)

---

## Funcionalidades

### Canvas interativo

- **Arrasto de componentes** — posicionamento livre ou com snap à grade (25 mm)
- **Zoom** via scroll do mouse (centrado no cursor)
- **Pan** via botão do meio ou Alt + arrastar
- **Seleção** com clique — exibe painel de propriedades editáveis
- **Grade milimétrica** com pontos de fixação a cada 25 mm (padrão de bancada óptica)

### Ferramentas (toolbar flutuante arrastável)

| Tecla | Ferramenta | Descrição |
|---|---|---|
| `S` | Selecionar | Seleciona e arrasta componentes |
| `P` | Mover mapa | Pan livre pelo canvas |
| `M` | Medir | Clique em A, clique em B → distância em mm; 3º clique reinicia; `Esc` cancela |
| `D` | Distâncias | Toggle do overlay de distâncias entre todos os componentes |
| `R` | Raios | Toggle da visualização do traçado de raios |
| `#` | Snap | Toggle do alinhamento à grade |
| `F` | Enquadrar | Ajusta zoom/pan para ver todos os componentes |
| `Del` | Deletar | Remove o componente selecionado |

### Painel de propriedades

- Posição X/Y em mm, ângulo em graus
- Parâmetros específicos por tipo (NA, WD, magnificação, reflectância, cutoff, sensor)
- Seção **DERIVADO** para objetivas: resolução de Rayleigh, DoF, FOV, fator de coleta (NA²)
- Espessura alvo `d` (nm) para cálculo do sinal esperado

### Gráfico de sinal `r(d, λ)`

- Curvas de refletividade para cada comprimento de onda da fonte
- Linha tracejada vertical na espessura alvo
- Valores pontuais `r(d_alvo, λ)` exibidos abaixo do gráfico
- Atualização em tempo real (computado localmente no browser, sem latência de rede)

### Overlays da objetiva no canvas

Quando há uma objetiva na cena, o canvas desenha automaticamente:

- **Linha WD** — tracejada verde do centro da objetiva até o plano focal
- **Cruz do plano focal** — marcador no ponto de foco esperado
- **Retângulo FOV** — no plano da amostra (cryo_stage), proporcional ao sensor e à magnificação
- **Pills de specs** — ao lado do componente: `Mag× / NA`, `WD mm`
- **Pills de resolução** — ao lado do FOV: `Res: X.XX µm` e `DoF: X.X µm`
- **Label FOV** — dimensões físicas do campo de visão em mm

### Sistema de validação automática

O backend analisa a cena completa e retorna avisos em 4 níveis: `error`, `warning`, `info`, `ok`.

Verificações realizadas:
1. Presença de fonte de luz
2. Presença de divisor de feixe
3. Distância objetiva–amostra vs WD declarado (tolerância ±2 mm)
4. Aviso de eficiência reduzida para canal λ > cutoff em dicroico
5. Correção cromática inadequada (objetiva `basic` com múltiplos λ)
6. NA insuficiente para resolver furos do grid (resolução > 2 µm)
7. Câmera ausente na cena

### Presets de literatura

Três setups publicados disponíveis com um clique na sidebar:

- **Hohle et al. 2022** — Gene Center Munich: LWD 10×/NA 0.3, BS 50/50, LED 3λ, cuba Al
- **Last et al. 2023** — LUMC Leiden: Plan Apo 100×/NA 0.9, dicroico, LED 3λ, Linkam CSM196
- **LNLS/CNPEM** — Setup SIBIPIRUNA: LED4D120, BS013 50/50, LWD 10×/NA 0.3

---

## Como iniciar

O CRISP usa **dois processos**: backend Python (cálculos de física) e frontend React (interface).

### Pré-requisitos

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Desenvolvimento (dois terminais)

```bash
# Terminal 1 — Backend FastAPI
python3 -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend Vite
cd frontend && npm run dev
```

Abrir: `http://localhost:5173`

### Produção (processo único)

```bash
cd frontend && npm run build
python3 -m uvicorn backend.main:app --port 8000
```

Abrir: `http://localhost:8000`

### Testes

```bash
python3 -m pytest backend/tests/ -v
```

---

## Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar superior                                               │
├──────────┬──────────────────────────────────────┬──────────────┤
│          │                                      │              │
│ Sidebar  │         Canvas 2D                    │  Painel de   │
│          │    (mesa óptica em mm)               │  Propriedades│
│ • Compo- │    - grade 25mm                      │              │
│   nentes │    - raios coloridos                 │  + Gráfico   │
│ • Presets│    - overlays objetiva               │    r(d,λ)    │
│          │    - distâncias                      │              │
│          │                                      │  + Validação │
│          │                                      │              │
├──────────┴──────────────────────────────────────┴──────────────┤
│            [ Toolbar flutuante arrastável ]                     │
│   ↖ Sel   ✥ Pan   ⟺ Medir   ⊞ Dist   〜 Raios   # Snap   ⊡ Fit  │
└─────────────────────────────────────────────────────────────────┘
```

Os painéis lateral esquerdo e direito são **redimensionáveis** arrastando as bordas.

---

## Componentes disponíveis

| Tipo | Símbolo | Parâmetros editáveis | Comportamento no traçado |
|---|---|---|---|
| `source_led` | 💡 | λ (nm), FWHM (nm) | Emite leque de 5 raios ±6° |
| `source_laser` | 🔴 | λ (nm) | Emite 1 raio colimado |
| `beamsplitter` | BS | Reflectância R | Divide: R refletido + (1−R) transmitido |
| `dichroic` | DC | Cutoff λ (nm) | λ < cutoff: 90% reflete; λ > cutoff: 10% reflete |
| `objective` | OBJ | NA, WD, magnificação, correção | Transmite com 95% de eficiência |
| `lens` | L | — | Transmite com 95% de eficiência |
| `mirror` | M | — | Reflete com 95% de eficiência |
| `camera` | 📷 | Largura e altura do sensor (mm) | Absorve o raio (fim do caminho) |
| `cryo_stage` | CRYO | — | Absorve o raio; define o plano focal |
| `filter_bandpass` | BP | — | Absorve o raio |
| `filter_nd` | ND | — | Absorbe o raio |
| `iris` | Ø | — | Absorve o raio |
| `post` | \| | — | Absorve o raio |

---

## Física implementada

### 1. Refletividade de película fina

Modelo de Last et al. 2023 (*J. Struct. Biol.* 215, 107965):

$$r(d, \lambda) = \frac{1}{2} + \frac{1}{2} \cdot e^{-d/L} \cdot \cos\!\left(\frac{4\pi n_2 d}{\lambda} + \pi\right)$$

| Parâmetro | Valor padrão | Significado |
|---|---|---|
| `d` | 0 – 300 nm | Espessura do gelo vítreo |
| `λ` | 405 / 470 / 528 nm | Comprimento de onda da fonte |
| `n₂` | 1.31 | Índice de refração do gelo vítreo a 77 K (Kofman 2019) |
| `L` | 1000 nm | Comprimento de coerência efetivo da fonte |

**Zonas de espessura** (para λ = 470 nm, n₂ = 1.31):

| Zona | Faixa | Característica |
|---|---|---|
| Monotônica | d < 90 nm | r cresce monotonicamente — inversão direta, sem ambiguidade |
| Ambígua | 90 – 180 nm | Dois valores de d podem produzir o mesmo r |
| Franjas | d > 180 nm | Franjas completas — máxima informação espectral |

**Por que 3 comprimentos de onda resolvem a ambiguidade:**

Com um único λ, a função cosseno é periódica — `d` e `d + λ/(2n₂)` produzem o mesmo `r`. Com 3 LEDs (405/470/528 nm), as curvas têm períodos diferentes, criando um sistema sobredeterminado:

```
r₁ = f(d, 405 nm)
r₂ = f(d, 470 nm)    →  d único em [0, 300 nm]
r₃ = f(d, 528 nm)
```

**Integração espectral (banda do LED):**

Para modelar LEDs com largura espectral real (FWHM ≠ 0), o backend integra sobre o perfil gaussiano:

$$r_{\text{eff}}(d, \lambda_0, \Delta\lambda) = \int r(d, \lambda) \cdot G(\lambda; \lambda_0, \sigma) \, d\lambda$$

onde $\sigma = \Delta\lambda / (2\sqrt{2\ln 2})$.

---

### 2. Coerência temporal

$$L_c = \frac{\lambda^2}{\Delta\lambda}$$

Para a interferência funcionar, o caminho óptico diferencial deve ser menor que o comprimento de coerência:

$$\text{OPD} = 2 n_2 d \ll L_c$$

| Fonte | λ (nm) | FWHM Δλ (nm) | Lc (µm) | OPD máx (d=300 nm) | Margem |
|---|---|---|---|---|---|
| LED 405 nm + filtro | 405 | 6 | 27 338 nm | 786 nm | 35× |
| LED 470 nm + filtro | 470 | 9 | 24 544 nm | 786 nm | 31× |
| LED 528 nm + filtro | 528 | 15 | 18 613 nm | 786 nm | 24× |
| Laser 532 nm | 532 | 0.1 | ~2.8 mm | 786 nm | >>1 |

LEDs com filtros de banda estreita (FWHM ≤ 15 nm) oferecem coerência suficiente com margem ampla. O laser tem coerência ordens de magnitude maior — mas introduz **speckle** (padrão granular fixo causado pela coerência espacial alta) que degrada a imagem.

---

### 3. Eficiência de coleta

O sinal total que chega à câmera é produto de vários fatores:

$$I_{\text{câmera}} = I_{\text{fonte}} \times \text{NA}^2 \times \eta_{\text{BS}} \times r(d, \lambda)$$

onde $\eta_{\text{BS}} = R_{\text{ida}} \times T_{\text{volta}}$:

| Divisor | Ida (iluminação) | Volta (detecção) | η_BS |
|---|---|---|---|
| BS 50/50 | R = 0.50 | T = 0.50 | **25%** |
| Dicroico (λ < cutoff) | R = 0.90 | T = 0.10 | **9%** |
| Dicroico (λ > cutoff) | R = 0.10 | T = 0.90 | **9%** |

Eficiência total com NA:

| NA | NA² | Com BS 50/50 | Com dicroico |
|---|---|---|---|
| 0.3 | 9% | **2.3%** | **0.8%** |
| 0.9 | 81% | **20.3%** | **7.3%** |

O sinal com NA = 0.9 é ~9× mais forte que com NA = 0.3, reduzindo o tempo de exposição e melhorando o SNR.

---

## Parâmetros da objetiva

### Abertura Numérica (NA)

$$\text{NA} = n \cdot \sin(\theta_{\max})$$

Para objetiva seca (n = 1, ar): NA = sin(ângulo máximo de coleta).

| Grandeza | Fórmula | NA = 0.3 | NA = 0.9 |
|---|---|---|---|
| Resolução lateral (Rayleigh) | $d = 0.61\lambda/\text{NA}$ | ~955 nm | ~318 nm |
| Profundidade de foco (DoF) | $z = \lambda/\text{NA}^2$ | ~5.2 µm | ~580 nm |
| Fração de luz coletada | $\propto \text{NA}^2$ | 9% | 81% |

Os furos do grid de cryo-EM têm diâmetro de 1–2 µm. Com NA = 0.3, a resolução (~1 µm) está no limite. Com NA = 0.9 (Last et al.), resolve com folga e o sinal é ~9× mais intenso.

### Working Distance (WD)

Distância mecânica entre a lente frontal da objetiva e o plano focal. Característica fixa de cada objetiva.

```
WD > altura do recipiente criogênico acima da amostra
```

| Referência | Setup | WD usado |
|---|---|---|
| Hohle et al. | Cuba Al aberta em LN₂ | ~16 mm (LWD 10×/NA 0.3) |
| Last et al. | Linkam CSM196 compacto | ~1 mm (Plan Apo 100×/NA 0.9) |
| CNPEM | A determinar — medir WD real | — |

O CRISP valida automaticamente: se `|dist(OBJ, CRYO) − WD| > 2 mm` → erro de validação.

### Campo de Visão (FOV)

$$\text{FOV} = \frac{\text{tamanho do sensor}}{\text{magnificação}}$$

Exemplo com sensor sCMOS 1/2" (6.4 × 4.8 mm):

| Magnificação | FOV (µm) | Grid squares visíveis | Referência |
|---|---|---|---|
| 10× | 640 × 480 | 4 – 6 | Hohle et al. |
| 40× | 160 × 120 | ~1 | — |
| 100× | 64 × 48 | < 1 | Last et al. |

### Correção Cromática

Com iluminação em 3 λ distintos, aberração cromática axial separa os planos focais de cada canal:

| Tipo | Correção | Para 3 LEDs (405/470/528 nm) |
|---|---|---|
| Basic | Nenhuma | Não recomendado — cada λ foca num z diferente |
| Plan | Visível (400–700 nm) | Adequado para 405–528 nm |
| Plan Apo | UV + visível, sem aberração esférica | Ideal — Last et al. usa Nikon CFI TU Plan Apo |

### Profundidade de Foco (DoF)

$$\text{DoF} = \frac{\lambda}{\text{NA}^2}$$

| NA | DoF (λ = 470 nm) | Implicação para o grid |
|---|---|---|
| 0.3 | 5.2 µm | Grade inclinada até ~2° ainda fica toda em foco |
| 0.9 | 580 nm | Inclinação > 0.1° pode desfocar bordas do grid |

A DoF é sempre muito maior que a espessura do gelo (0–300 nm) — não limita a interferência. Limita quanto de inclinação mecânica do grid é tolerável.

---

## Sistema de validação

O backend (`backend/scene/validator.py`) analisa a cena completa via WebSocket e retorna lista de avisos classificados:

| Nível | Cor | Significado |
|---|---|---|
| `error` | Vermelho | Impede a medição (foco errado, sem fonte de luz) |
| `warning` | Amarelo | Compromete qualidade (NA baixo, correção cromática) |
| `info` | Azul | Informação relevante (câmera ausente, dicroico assimétrico) |
| `ok` | Verde | Setup fisicamente consistente |

**Verificações implementadas:**

1. **Fonte de luz** — erro se nenhum LED ou laser na cena
2. **Divisor de feixe** — aviso se sem BS ou dicroico (caminho de retorno indefinido)
3. **WD vs distância real** — erro se `|d_real − WD| > 2 mm`
4. **Eficiência dicroico** — aviso informando assimetria (9% vs 25% do BS 50/50)
5. **Correção cromática** — aviso se objetiva `basic` com N_λ > 1
6. **Resolução vs furos** — aviso se `0.61λ/NA > 2 µm`
7. **Câmera** — info se câmera ausente

---

## Traçado de raios

O ray tracer 2D (`frontend/src/canvas/RayTracer.ts`) usa interseção segmento-a-segmento e propagação recursiva:

```
trace(components)
  └─ para cada fonte × cada λ
       └─ gera raios de origem (leque ±6° para LED, 1 raio para laser)
            └─ _propagate(ray, components, depth)
                 ├─ _findHit → componente mais próximo no caminho
                 ├─ trimmed_ray (da origem até o ponto de acerto)
                 └─ _applyComponent → filhos (refletido, transmitido)
                      └─ recursão até depth=8 ou intensity<0.01
```

**Comportamento por componente:**

| Componente | Raio refletido | Raio transmitido |
|---|---|---|
| `mirror` | 95% intensidade | — |
| `beamsplitter` | R × intensidade | (1−R) × intensidade |
| `dichroic` | 90%/10% conforme λ vs cutoff | restante |
| `objective`, `lens` | — | 95% intensidade |
| `camera`, `cryo_stage`, filtros, íris | — | — (absorvem) |

**Detalhes de implementação:**

- Cada componente é modelado como um segmento de 20 mm girado pelo `angleDeg`
- Detecção de auto-colisão: `d > 0.5 mm` da origem do raio filho
- Direção refletida normalizada antes de escalar: `d_refletida = (dx/|d| − 2·dot·n̂) × 500`
- Raios renderizados com cor proporcional ao λ (via função `wavelengthToRgba`) e opacidade proporcional à intensidade

---

## Presets de literatura

### Hohle et al. 2022 — Gene Center Munich

> *Scientific Reports* 12, 13909. DOI: [10.1038/s41598-022-16978-7](https://doi.org/10.1038/s41598-022-16978-7)

Setup de campo amplo com estágio criogênico de alumínio aberto em LN₂:

| Componente | Especificação |
|---|---|
| Fonte | LED 405 / 470 / 528 nm |
| Divisor | BS 50/50 |
| Objetiva | LWD 10×/NA 0.3, WD ≈ 34 mm |
| Câmera | Color (Bayer) |
| Classificação | Rede Darknet19 — 4 grids em < 15 min |

**Característica:** prioriza FOV grande (640 × 480 µm) para classificação rápida de muitos grid squares simultaneamente.

---

### Last et al. 2023 — LUMC Leiden

> *J. Struct. Biol.* 215, 107965. DOI: [10.1016/j.jsb.2023.107965](https://doi.org/10.1016/j.jsb.2023.107965)

Referência técnica principal. Modelo r(d,λ) usado no CRISP vem deste trabalho:

| Componente | Especificação |
|---|---|
| Fonte | LedHUB Omicron — 405 / 470 / 528 nm |
| Divisor | Dicroico Chroma, cutoff 505 nm |
| Objetiva | Nikon CFI TU Plan Apo 100×/NA 0.9, WD ≈ 1 mm |
| Câmera | pco.edge 4.2 sCMOS |
| Estágio | Linkam CSM196v3 |
| ML | Rede pix2pix (GAN image-to-image) |
| Erro | ±7.4 nm em 0–300 nm |

**Característica:** prioriza precisão de medição — FOV pequeno (64 × 48 µm) mas SNR ~9× maior que NA 0.3.

---

### LNLS/CNPEM — SIBIPIRUNA

> Setup em desenvolvimento. PIBIC 2024.

| Componente | Especificação |
|---|---|
| Fonte | Thorlabs LED4D120 — 405 / 470 / 530 nm |
| Divisor | Thorlabs BS013 50/50 |
| Objetiva | LWD 10×/NA 0.3, WD = 34 mm |
| Estágio | Cuba Al + LN₂ (aberta) |

---

## Arquitetura do sistema

```
CRISP/
├── backend/                          # Python 3 / FastAPI
│   ├── main.py                       # App, WebSocket /ws, REST /api
│   ├── physics/
│   │   ├── thin_film.py              # r(d,λ), sweep, integração espectral
│   │   ├── coherence.py              # Lc = λ²/Δλ, validação OPD
│   │   ├── refractive_index.py       # n(λ) gelo vítreo 77K (Kofman 2019)
│   │   └── efficiency.py             # η_coleta, NA efetiva, FOV
│   ├── scene/
│   │   ├── models.py                 # Pydantic: Scene, ComponentSpec, Position
│   │   └── validator.py              # Validação geométrica e óptica
│   ├── api/
│   │   ├── ws_handler.py             # Pipeline WebSocket: cena → física
│   │   └── routes.py                 # GET /api/presets, GET /api/presets/{name}
│   └── utils/presets.py              # Presets hohle2022, last2023, lnls_cnpem
│
└── frontend/src/                     # React 18 / TypeScript / Vite
    ├── App.tsx                       # Layout, RAF loop, resize de painéis
    ├── canvas/
    │   ├── OpticalTable.ts           # Zoom, pan, drag, ferramentas, AbortController
    │   ├── RayTracer.ts              # Traçado recursivo, reflexão, transmissão
    │   └── Renderer.ts               # Canvas 2D: grade, componentes, raios, overlays
    ├── components/
    │   ├── Sidebar.tsx               # Biblioteca de componentes + presets
    │   ├── PropsPanel.tsx            # Propriedades editáveis + métricas derivadas
    │   ├── SignalChart.tsx           # Gráfico r(d,λ) com Recharts
    │   ├── ValidationPanel.tsx       # Avisos e erros do setup
    │   └── FloatingToolbar.tsx       # Toolbar arrastável com atalhos de teclado
    ├── store/sceneStore.ts           # Estado global (Zustand)
    ├── types/
    │   ├── scene.ts                  # Tipos: Component, Scene, CorrectionType
    │   └── physics.ts                # Tipos: PhysicsResponse, ThinFilmResult
    └── utils/
        └── physics.ts                # r(d,λ) local no browser (sem latência)
```

### Comunicação frontend ↔ backend

```
Frontend                          Backend
   │                                 │
   │──── GET /api/presets ──────────►│  Lista de presets disponíveis
   │◄─── ["hohle2022", ...]  ────────│
   │                                 │
   │──── GET /api/presets/{id} ─────►│  Cena completa em JSON
   │◄─── { scene, wavelengths... } ──│
   │                                 │
   │════ WebSocket /ws ══════════════│
   │──── { scene, d_target } ───────►│  Envia cena atual
   │◄─── { thin_film, efficiency,    │  Recebe física calculada
   │       coherence, validation } ──│
```

**Cálculo local (browser):** a curva `r(d,λ)` também é calculada diretamente no browser (`utils/physics.ts`) usando a mesma fórmula do backend, garantindo atualização imediata sem latência de rede. O backend enriquece com eficiência de coleta, validação e integração espectral.

---

## Referências

1. **Last et al.** (LUMC Leiden, 2023) — *Referência principal do modelo físico e hardware*
   LED 405/470/528 nm, Plan Apo 100×/NA 0.9, sCMOS, modelo r(d,λ), rede pix2pix, erro ±7.4 nm
   *J. Struct. Biol.* 215, 107965. DOI: [10.1016/j.jsb.2023.107965](https://doi.org/10.1016/j.jsb.2023.107965)

2. **Hohle et al.** (Gene Center Munich, 2022) — *Setup mais próximo do protótipo CNPEM*
   Microscópio campo amplo, cuba cryo de Al, LWD 10×/NA 0.3, classificação por Darknet19
   *Sci. Rep.* 12, 13909. DOI: [10.1038/s41598-022-16978-7](https://doi.org/10.1038/s41598-022-16978-7)

3. **EasyGrid** (EMBL, 2024) — *Plataforma automatizada com Digital Holographic Microscopy (DHM)*
   Mapa topográfico de espessura via fase óptica direta, sem ambiguidade
   DOI: [10.1101/2024.01.18.576170](https://doi.org/10.1101/2024.01.18.576170)

4. **MeasureIce** (U. Melbourne, 2022) — *Padrão-ouro de validação por EELS/TEM*
   Medição de espessura por espalhamento inelástico de elétrons, usado para calibrar métodos ópticos
   *Commun. Biol.* 5, 826. DOI: [10.1038/s42003-022-03698-x](https://doi.org/10.1038/s42003-022-03698-x)

5. **VitroJet** (CryoSol-World, 2024) — *Interferometria antes da vitrificação (4°C, amostra líquida)*
   DOI: [10.1016/j.jsb.2024.108139](https://doi.org/10.1016/j.jsb.2024.108139)

6. **Kofman et al.** (2019) — *Índice de refração do gelo vítreo a 77 K*
   Fonte do valor n₂ = 1.31 usado em todos os cálculos do modelo

---

*Desenvolvido por Guilherme Medeiros — PIBIC CNPEM/LNLS 2024*
*Orientação: CNPEM — Centro Nacional de Pesquisa em Energia e Materiais*
