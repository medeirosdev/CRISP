# CRISP — Cryo Interferometry Simulator and Planner

Simulador interativo de bancada para planejar setups de interferometria óptica de película fina,
desenvolvido para o projeto PIBIC de medição de espessura de gelo vítreo em grids de cryo-EM (CNPEM/LNLS).

---

## O que o CRISP faz

- **Canvas 2D** de mesa óptica: arraste e posicione componentes (fonte LED/laser, beamsplitter, objetiva, câmera, estágio criogênico, espelhos, filtros etc.)
- **Traçado de raios** em tempo real com reflexão, transmissão e divisão por dicroico
- **Gráfico r(d,λ)** instantâneo — curva de refletividade de película fina para cada comprimento de onda da fonte
- **Overlay da objetiva**: zona de WD (linha verde), FOV no plano da amostra (retângulo azul), barra de resolução (amarelo)
- **Validação do setup**: WD, correção cromática, resolução vs furos do grid, eficiência de coleta
- **Presets** dos setups publicados: Hohle et al. 2022, Last et al. 2023, LNLS/CNPEM

---

## Como iniciar

O CRISP precisa de **dois terminais rodando ao mesmo tempo**.

### Terminal 1 — Backend (FastAPI)
```bash
cd /home/medeiros/Projetos/CNPEMIC/CRISP
python3 -m uvicorn backend.main:app --reload --port 8000
```

### Terminal 2 — Frontend (Vite)
```bash
cd /home/medeiros/Projetos/CNPEMIC/CRISP/frontend
npm run dev
```

Abrir no navegador: `http://localhost:5173`

### Primeira vez (instalar dependências)
```bash
pip install -r requirements.txt
cd frontend && npm install
```

### Modo produção (opcional)
```bash
cd frontend && npm run build
cd .. && python3 -m uvicorn backend.main:app --port 8000
# Acesse: http://localhost:8000
```

### Testes do backend
```bash
python3 -m pytest backend/tests/ -v
```

---

## Toolbar flutuante — atalhos de teclado

| Tecla | Ação |
|---|---|
| `S` | Ferramenta Selecionar (padrão) |
| `P` | Ferramenta Mover mapa (pan) |
| `M` | Ferramenta Medir (1º clique = A, 2º = B, 3º = nova medição, Esc = cancelar) |
| `D` | Toggle overlay de distâncias entre componentes |
| `F` | Enquadrar todos os componentes |
| `Del` | Remover componente selecionado |

---

## Estrutura do projeto

```
CRISP/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket /ws, REST /api
│   ├── physics/
│   │   ├── thin_film.py     # r(d,λ) — modelo de refletividade
│   │   ├── coherence.py     # comprimento de coerência Lc = λ²/Δλ
│   │   ├── refractive_index.py  # n(λ) do gelo vítreo a 77K (Kofman 2019)
│   │   └── efficiency.py    # eficiência de coleta, NA efetiva
│   ├── scene/
│   │   ├── models.py        # modelos Pydantic (Scene, ComponentSpec, ...)
│   │   └── validator.py     # validação geométrica e óptica do setup
│   ├── api/
│   │   ├── ws_handler.py    # pipeline de física via WebSocket
│   │   └── routes.py        # endpoints REST
│   └── utils/presets.py     # presets: hohle2022, last2023, lnls_cnpem
│
└── frontend/src/
    ├── App.tsx               # layout principal, loop de animação
    ├── canvas/
    │   ├── OpticalTable.ts   # zoom, pan, drag, ferramentas (select/pan/measure)
    │   ├── RayTracer.ts      # traçado de raios 2D
    │   └── Renderer.ts       # canvas: grade, componentes, raios, overlays de objetiva
    ├── components/
    │   ├── Sidebar.tsx           # biblioteca de componentes e presets
    │   ├── PropsPanel.tsx        # painel de propriedades + métricas derivadas
    │   ├── SignalChart.tsx        # gráfico r(d,λ) com Recharts
    │   ├── ValidationPanel.tsx   # avisos e validação do setup
    │   ├── FloatingToolbar.tsx   # toolbar flutuante arrastável
    │   └── Toolbar.tsx           # barra superior
    ├── store/sceneStore.ts       # estado global (Zustand)
    ├── types/scene.ts            # tipos de componentes
    ├── types/physics.ts          # tipos da resposta de física
    └── utils/physics.ts          # cálculo local de r(d,λ) (sem backend)
```

---

## Física implementada

### Refletividade de película fina

Modelo de Last et al. 2023 (J. Struct. Biol. 215, 107965):

```
r(d, λ) = ½ + ½ · exp(−d/L) · cos(4π·n₂·d/λ + π)
```

| Parâmetro | Valor | Significado |
|---|---|---|
| `d` | 0–300 nm | espessura do gelo vítreo |
| `λ` | 405 / 470 / 528 nm | comprimento de onda da fonte |
| `n₂` | 1.31 | índice de refração do gelo vítreo a 77 K (Kofman 2019) |
| `L` | 1000 nm | comprimento de coerência efetivo da fonte |

**Como ler o gráfico r(d,λ):**
- Eixo X = espessura `d` em nm
- Eixo Y = refletividade r (0 a 1)
- Linha tracejada vertical = espessura alvo configurada
- Os valores `r(d_alvo, λ)` embaixo do gráfico são o que a câmera vai medir

**Zonas de espessura** (para λ = 470 nm, n₂ = 1.31):

| Zona | Faixa | Significado |
|---|---|---|
| Monotônica | d < 90 nm | r aumenta monotonicamente — sem ambiguidade |
| Ambígua | 90–180 nm | dois valores de d podem dar o mesmo r |
| Franjas | d > 180 nm | franjas completas visíveis — máxima informação |

**Por que usar 3 comprimentos de onda:**
Com um só λ, a função cosseno é ambígua — dois valores de `d` diferentes podem gerar o mesmo `r`.
Com 3 LEDs (405/470/528 nm), as curvas estão defasadas entre si, criando um sistema de 3 equações
com 1 incógnita `d`. Isso resolve a ambiguidade na faixa 0–300 nm.

---

### Coerência temporal

```
Lc = λ² / Δλ
```

Para a interferência de película fina funcionar, o caminho óptico percorrido (OPD) deve ser menor
que o comprimento de coerência:

```
OPD = 2 · n₂ · d
```

| Fonte | λ (nm) | FWHM Δλ (nm) | Lc (nm) | OPD_max (d=300nm) | Margem |
|---|---|---|---|---|---|
| LED 528 nm | 528 | 15 | 18 613 | 786 nm | 23× |
| LED 470 nm | 470 | 9  | 24 544 | 786 nm | 31× |
| Laser 532 nm | 532 | 0.1 | ~2.8 M | 786 nm | >>1 |

LEDs com filtros de banda estreita (FWHM ≤ 15 nm) têm coerência suficiente com ampla margem.

---

## Parâmetros da objetiva — conceitos

### Abertura Numérica (NA)

```
NA = n · sin(θ_max)
```

Para objetiva seca (n=1, ar): NA = sin(ângulo máximo de coleta).

**O que o NA controla:**

| Grandeza | Fórmula | NA = 0.3 | NA = 0.9 |
|---|---|---|---|
| Resolução lateral (Rayleigh) | d = 0.61·λ/NA | 955 nm | 318 nm |
| Profundidade de foco (DoF) | z = λ/NA² | 5.2 µm | 580 nm |
| Fração de luz coletada | ∝ NA² | 9% | 81% |

**Para o projeto CNPEM:** os furos do grid de cryo-EM têm 1–2 µm de diâmetro.
Com NA = 0.3, a resolução é ~1 µm — beira o limite. Com NA = 0.9 (Last et al.), resolve com folga.
Hohle et al. usa NA = 0.3 porque prioriza FOV grande (ver todo o grid square de uma vez).

O CRISP exibe a resolução calculada no painel de propriedades quando a objetiva está selecionada,
e desenha uma barra de escala amarela no canvas ao lado do FOV.

---

### Working Distance (WD)

Distância física entre a lente frontal da objetiva e o plano focal (onde a amostra deve estar).
É uma característica mecânica fixa gravada na objetiva.

**Por que importa em cryo:**
A amostra está dentro de um recipiente criogênico com LN₂. A objetiva precisa enxergar através
da abertura desse recipiente sem tocar nele:

```
WD  >  altura_da_cuba_acima_da_amostra
```

- **Hohle et al.**: cuba de alumínio imersa em LN₂ aberta → WD mínimo ~10 mm → usa LWD 10×/NA 0.3 (WD ≈ 16 mm)
- **Last et al.**: estágio Linkam CSM196 mais compacto → WD pode ser ~1 mm → usa 100×/NA 0.9
- **CNPEM**: medir WD real do recipiente antes de escolher a objetiva

O CRISP valida isso automaticamente: se a distância objetiva–cryo_stage no canvas diferir do WD
por mais de 2 mm, aparece um erro de validação. O canvas também desenha a linha verde de WD
saindo da objetiva até o plano focal.

---

### Magnificação vs Campo de Visão (FOV)

```
FOV = tamanho_do_sensor / magnificação
```

Exemplo com sensor sCMOS 1/2" (6.4 × 4.8 mm):

| Magnificação | FOV (mm) | Grid squares visíveis | Referência |
|---|---|---|---|
| 10× | 0.64 × 0.48 | 4–6 (grid square ~100–200 µm) | Hohle et al. |
| 40× | 0.16 × 0.12 | ~1 | — |
| 100× | 0.064 × 0.048 | < 1 | Last et al. |

Hohle usa 10× para ver muitos furos ao mesmo tempo e classificar o grid inteiro rapidamente
(rede Darknet19 classifica 4 grids em < 15 min). Last usa 100× para medir espessura com precisão.

O CRISP desenha o retângulo azul do FOV no plano da amostra (cryo_stage) quando há
uma objetiva na cena. O tamanho é calculado com o sensor da câmera presente.

---

### Correção Cromática

Com iluminação em 3 comprimentos de onda (405/470/528 nm), objetivas de diferentes qualidades
focam os três λ em planos levemente diferentes (aberração cromática axial):

| Tipo | Correção | Para o projeto |
|---|---|---|
| Basic | Nenhuma — cada λ foca num z diferente | Não recomendado com 3 LEDs |
| Plan | Corrigida para λ visível (400–700 nm) | Adequada para 405–528 nm |
| Plan Apo | Corrigida para UV + visível, sem aberração esférica | Ideal (Last et al. usa CFI TU Plan Apo) |

**Last et al.** usa **Nikon CFI TU Plan Apo 100×/NA 0.9** especificamente por isso —
ela é corrigida para 405, 470 e 528 nm simultaneamente.

O CRISP avisa no painel de validação se a objetiva é "basic" com múltiplos comprimentos de onda.

---

### Profundidade de Foco (DoF)

```
DoF = λ / NA²
```

A DoF define a espessura da camada em foco ao mesmo tempo. Para comparação:

| NA | DoF (λ=470nm) | Implicação |
|---|---|---|
| 0.3 | 5.2 µm | Grade cryo inclinada até ~2° ainda fica toda em foco |
| 0.9 | 580 nm | Grade inclinada > 0.1° pode ter bordas desfocadas |

Para as camadas de gelo (0–300 nm), a DoF é sempre muito maior que a espessura —
a interferência não é afetada pela DoF. O que a DoF afeta é o quanto de inclinação
mecânica do grid é tolerável.

---

### Eficiência de coleta total

O sinal que chega à câmera depende de vários fatores em cascata:

```
I_câmera = I_fonte × NA² × BS_ida × BS_volta × r(d, λ)
```

| Fator | BS 50/50 | Dicroico (λ < cutoff) |
|---|---|---|
| BS_ida (iluminação) | 0.50 | 0.90 |
| BS_volta (detecção) | 0.50 | 0.10 |
| Produto BS | 25% | 9% |

Multiplique pelo NA²:
- NA = 0.3 → NA² = 0.09 → eficiência total ≈ 2.3%
- NA = 0.9 → NA² = 0.81 → eficiência total ≈ 20%

Isso explica por que Last et al. usa NA = 0.9 — o sinal é ~9× mais forte que com NA = 0.3,
o que reduz o tempo de exposição e melhora o SNR.

---

## Referências do projeto

1. **EasyGrid** (EMBL, 2024) — plataforma automatizada com DHM, referência conceitual
   DOI: 10.1101/2024.01.18.576170

2. **Hohle et al.** (Gene Center Munich, 2022) — setup mais próximo do protótipo CNPEM:
   microscópio de campo amplo, estágio criogênico de alumínio, LWD 10×/NA 0.3, Darknet19
   DOI: 10.1038/s41598-022-16978-7

3. **MeasureIce** (Melbourne, 2022) — padrão-ouro de validação por espalhamento de elétrons (TEM)
   DOI: 10.1038/s42003-022-03698-x

4. **Last et al.** (Leiden, 2023) — referência técnica principal do hardware: LED 405/470/528 nm,
   Plan Apo 100×/NA 0.9, sCMOS, modelo r(d,λ), rede pix2pix, erro ±7.4 nm em 0–300 nm
   DOI: 10.1016/j.jsb.2023.107965

5. **VitroJet** (CryoSol-World, 2024) — interferometria antes da vitrificação (amostra líquida a 4°C)
   DOI: 10.1016/j.jsb.2024.108139
