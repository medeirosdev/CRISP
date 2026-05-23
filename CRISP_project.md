# CRISP — Cryo Interferometry Simulator and Planner

> Simulador óptico 2D interativo para design e validação de setups de interferometria de reflexão em condições criogênicas, com mesa óptica metrificada, motor de física em Python e interface TypeScript.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Motivação e contexto](#2-motivação-e-contexto)
3. [Funcionalidades planejadas](#3-funcionalidades-planejadas)
4. [Arquitetura do sistema](#4-arquitetura-do-sistema)
5. [Stack tecnológica](#5-stack-tecnológica)
6. [Estrutura de diretórios](#6-estrutura-de-diretórios)
7. [Módulos do backend (Python)](#7-módulos-do-backend-python)
8. [Módulos do frontend (TypeScript)](#8-módulos-do-frontend-typescript)
9. [API WebSocket — protocolo de mensagens](#9-api-websocket--protocolo-de-mensagens)
10. [Motor de física — detalhes](#10-motor-de-física--detalhes)
11. [Mesa óptica — sistema de coordenadas](#11-mesa-óptica--sistema-de-coordenadas)
12. [Biblioteca de componentes ópticos](#12-biblioteca-de-componentes-ópticos)
13. [Sistema de metrificação e medições](#13-sistema-de-metrificação-e-medições)
14. [Presets de setup](#14-presets-de-setup)
15. [Painel de validação física](#15-painel-de-validação-física)
16. [Exportação e integração](#16-exportação-e-integração)
17. [Instalação e execução](#17-instalação-e-execução)
18. [Roteiro de desenvolvimento (roadmap)](#18-roteiro-de-desenvolvimento-roadmap)
19. [Referências físicas](#19-referências-físicas)

---

## 1. Visão geral

O CRISP é uma aplicação web local para design e simulação de setups de interferometria óptica de reflexão em película fina. Ele permite montar um interferômetro virtualmente sobre uma mesa óptica metrificada, arrastar componentes, medir distâncias reais em milímetros, e visualizar em tempo real o sinal de interferência esperado para diferentes espessuras de gelo vítreo.

O projeto nasceu como ferramenta auxiliar de um interferômetro óptico criogênico construído no LNLS/CNPEM para medição de espessura de gelo vítreo (0–300 nm) em grids de microscopia eletrônica (cryo-EM e cryo-SXT).

---

## 2. Motivação e contexto

Sistemas de interferometria óptica de baixo custo para medição de gelo vítreo em cryo-EM foram descritos por Hohle et al. (2022) e Last et al. (2023). Ambos usam LEDs narrowband em 405/470/528 nm, objetivas de longa distância de trabalho e modelos de refletividade de película fina para extrair a espessura do gelo a partir da intensidade refletida.

O design desses setups envolve decisões interdependentes — escolha do divisor de feixe (50/50 vs. dicroico), distância objetiva-amostra, comprimento de coerência da fonte, eficiência de coleta — que são difíceis de otimizar sem simulação. Ferramentas comerciais como Zemax OpticStudio custam dezenas de milhares de dólares e não modelam a física de película fina de forma integrada.

O CRISP resolve isso com uma aplicação open-source específica para esse domínio.

---

## 3. Funcionalidades planejadas

### Mesa óptica interativa

- Grade com espaçamento real de 25 mm (padrão de mesa óptica)
- Componentes arrastáveis com snap para os furos da grade
- Zoom e pan com coordenadas sempre visíveis em mm
- Régua virtual clicável para medir distâncias
- Rotação de componentes com display do ângulo em graus

### Motor de raios (ray tracer 2D)

- Traçado geométrico em tempo real (TypeScript, 60 fps)
- Suporte a múltiplos comprimentos de onda simultâneos
- Fan de raios para fontes tipo LED (incoerência espacial)
- Feixe colimado para laser
- Reflexão, refração (lei de Snell), divisão de amplitude
- Atenuação por propagação e por componentes

### Motor de física (Python backend)

- Modelo de refletividade `r(d, λ)` com fator de amortecimento L
- Cálculo de comprimento de coerência `Lc(λ, FWHM)`
- Diferença de caminho óptico `OPD = 2·n·d`
- Comparação automática OPD vs. Lc
- Integração espectral sobre o perfil da fonte (perfil gaussiano)
- Índice de refração do gelo vítreo `n(λ)` a 77 K (Kofman et al. 2019)

### Painel de medições

- Distância entre qualquer par de componentes
- Comprimento total do caminho óptico (OPL)
- Ângulo de incidência em cada superfície
- Abertura numérica efetiva
- Campo de visão no plano da amostra
- Eficiência de coleta por comprimento de onda

### Painel de validação

- Alertas em tempo real para condições fora de spec
- Verificação de compatibilidade OPD × Lc
- Verificação de distância de trabalho da objetiva
- Avisos de sobreposição de componentes
- Checklist de alinhamento exportável

### Presets de setup

- Hohle et al. 2022 (Gene Center Munich)
- Last et al. 2023 (Leiden University)
- VitroJet 2024 (CryoSol)
- Setup customizado LNLS/CNPEM

### Exportação

- JSON da cena (salvar/carregar workspace)
- SVG do diagrama do setup
- PDF de relatório técnico com BOM
- Lista de materiais com part numbers Thorlabs
- Dados do sinal `r(d, λ)` em CSV

---

## 4. Arquitetura do sistema

```
┌─────────────────────────────────────────────────────────┐
│                    Navegador (Browser)                   │
│                                                          │
│   ┌──────────────┐  ┌────────────────┐  ┌───────────┐  │
│   │ Mesa óptica  │  │ Painel props   │  │ Gráfico   │  │
│   │ Canvas 2D    │  │ + medições     │  │ r(d,λ)    │  │
│   │ TypeScript   │  │ TypeScript     │  │ TypeScript│  │
│   └──────┬───────┘  └───────┬────────┘  └─────┬─────┘  │
│          │                  │                  │        │
│   ┌──────▼──────────────────▼──────────────────▼─────┐  │
│   │              Scene Manager (TypeScript)           │  │
│   │   SceneGraph · RayTracer · MeasurementEngine     │  │
│   └──────────────────────┬────────────────────────────┘  │
│                          │ WebSocket (JSON)               │
└──────────────────────────┼────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│                  Backend (Python / FastAPI)                │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ PhysicsEngine│  │ SceneParser  │  │ ExportService  │   │
│  │ NumPy/SciPy │  │ Pydantic     │  │ svgwrite / pdf │   │
│  └─────────────┘  └──────────────┘  └────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Fluxo de dados principal

1. Usuário arrasta componente → TypeScript atualiza posição localmente → redesenha canvas (< 1 ms)
2. Usuário solta componente → TypeScript envia evento via WebSocket → Python recalcula física
3. Python responde (< 10 ms) → TypeScript atualiza painéis de análise e sinal

---

## 5. Stack tecnológica

### Backend

| Tecnologia | Versão mínima | Função |
|---|---|---|
| Python | 3.11+ | Runtime principal |
| FastAPI | 0.110+ | Servidor HTTP + WebSocket |
| Uvicorn | 0.29+ | ASGI server |
| NumPy | 1.26+ | Cálculos vetorizados |
| SciPy | 1.13+ | Integração espectral, interpolação |
| Pydantic | 2.0+ | Validação de modelos de dados |
| svgwrite | 1.4+ | Geração de SVG para export |
| reportlab | 4.0+ | Geração de PDF |

### Frontend

| Tecnologia | Versão mínima | Função |
|---|---|---|
| TypeScript | 5.3+ | Linguagem principal |
| Vite | 5.0+ | Build tool / dev server |
| Canvas API | nativo | Rendering da mesa óptica |
| Recharts | 2.10+ | Gráfico r(d,λ) |
| Zustand | 4.5+ | Gerenciamento de estado da cena |
| TailwindCSS | 3.4+ | Estilização |

### Desenvolvimento

| Tecnologia | Função |
|---|---|
| Git | Controle de versão |
| pytest | Testes do backend |
| Vitest | Testes do frontend |
| ESLint + Prettier | Linting TypeScript |
| Ruff | Linting Python |

---

## 6. Estrutura de diretórios

```
crisp/
├── README.md
├── LICENSE                        # MIT
├── pyproject.toml                 # Dependências Python (uv ou pip)
├── package.json                   # Dependências TypeScript
│
├── backend/                       # Servidor Python / FastAPI
│   ├── main.py                    # Entrypoint FastAPI
│   ├── config.py                  # Constantes físicas globais
│   │
│   ├── physics/
│   │   ├── __init__.py
│   │   ├── thin_film.py           # Modelo r(d, λ), sweep de espessura
│   │   ├── ray_tracer.py          # Raios, reflexão, refração (referência)
│   │   ├── coherence.py           # Lc(λ, FWHM), comparação OPD vs Lc
│   │   ├── refractive_index.py    # n(λ) do gelo vítreo (Kofman 2019)
│   │   └── efficiency.py          # Eficiência de coleta, OPL, NA
│   │
│   ├── scene/
│   │   ├── __init__.py
│   │   ├── models.py              # Pydantic: Component, Ray, Scene
│   │   ├── parser.py              # JSON → objetos Python
│   │   └── validator.py           # Checklist de validade física
│   │
│   ├── export/
│   │   ├── __init__.py
│   │   ├── svg_exporter.py        # Gera SVG do setup
│   │   ├── pdf_report.py          # Relatório técnico em PDF
│   │   ├── bom_generator.py       # Bill of Materials Thorlabs
│   │   └── csv_writer.py          # r(d,λ) em CSV
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── ws_handler.py          # Handler WebSocket principal
│   │   └── routes.py              # Endpoints REST (export, presets)
│   │
│   └── tests/
│       ├── test_thin_film.py
│       ├── test_coherence.py
│       └── test_scene_parser.py
│
├── frontend/                      # Aplicação TypeScript / Vite
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── main.ts                # Entrypoint
│       ├── store/
│       │   ├── sceneStore.ts      # Estado global da cena (Zustand)
│       │   └── uiStore.ts         # Estado da interface
│       │
│       ├── canvas/
│       │   ├── OpticalTable.ts    # Canvas principal + grid
│       │   ├── RayTracer.ts       # Ray tracing 2D em TypeScript
│       │   ├── Renderer.ts        # Renderização dos componentes
│       │   ├── DragController.ts  # Drag-and-drop, snap ao grid
│       │   ├── ZoomPan.ts         # Zoom e pan com coordenadas mm
│       │   └── MeasureTool.ts     # Ferramenta de medição (régua)
│       │
│       ├── components/            # Componentes UI (React ou vanilla)
│       │   ├── Sidebar.ts         # Biblioteca de componentes ópticos
│       │   ├── PropsPanel.ts      # Painel de propriedades
│       │   ├── MeasurementPanel.ts# Painel de medições
│       │   ├── SignalChart.ts     # Gráfico r(d,λ)
│       │   ├── ValidationPanel.ts # Avisos e alertas
│       │   └── Toolbar.ts         # Barra de ferramentas superior
│       │
│       ├── physics/               # Física leve em TypeScript
│       │   ├── geometry.ts        # Interseção raio-elemento
│       │   ├── optics.ts          # Snell, reflexão, beamsplitter
│       │   └── wavelength.ts      # Mapeamento λ → cor RGB
│       │
│       ├── ws/
│       │   ├── WebSocketClient.ts # Cliente WebSocket
│       │   └── MessageTypes.ts    # Tipos das mensagens (shared)
│       │
│       └── utils/
│           ├── units.ts           # Conversão px ↔ mm
│           ├── colors.ts          # Paleta de cores por λ
│           └── presets.ts         # Presets de setup (JSON)
│
└── docs/
    ├── physics.md                 # Derivação dos modelos físicos
    ├── api.md                     # Documentação da API WebSocket
    └── components.md              # Catálogo de componentes ópticos
```

---

## 7. Módulos do backend (Python)

### `physics/thin_film.py`

Motor central do simulador. Implementa o modelo de refletividade de película fina e gera os dados para o gráfico de sinal.

```python
import numpy as np
from dataclasses import dataclass

# Constantes físicas
N2_ICE_77K = 1.31          # Índice de refração do gelo vítreo a 77 K
L_COHERENCE_NM = 1000.0    # Comprimento de amortecimento empírico (nm)
                            # Nota: este L não é o Lc da fonte — é um fator
                            # fenomenológico de espalhamento do gelo (Last 2023)

@dataclass
class ThinFilmResult:
    wavelengths_nm: list[float]
    thickness_nm: np.ndarray      # eixo d, shape (N,)
    reflectivity: np.ndarray      # r(d,λ), shape (N, len(wavelengths))
    r_at_d: list[float]           # r para espessura específica
    zone: str                     # "monotonic" | "ambiguous" | "fringes"
    opd_nm: float                 # OPD = 2·n·d no ponto atual

def reflectivity(d_nm: float | np.ndarray,
                 lam_nm: float,
                 n2: float = N2_ICE_77K,
                 L: float = L_COHERENCE_NM) -> np.ndarray:
    """
    Refletividade de película fina por interferência.

    r(d, λ) = 1/2 + 1/2 · exp(-d/L) · cos(4π·n₂·d/λ + π)

    Parâmetros
    ----------
    d_nm : espessura do filme em nanômetros
    lam_nm : comprimento de onda em nanômetros
    n2 : índice de refração do filme (gelo vítreo a 77 K)
    L : comprimento de amortecimento por espalhamento (nm)
        NÃO é o comprimento de coerência da fonte

    Retorna
    -------
    r : refletividade no intervalo [0, 1]

    Referência: Last et al. J. Struct. Biol. 215, 107965 (2023)
    """
    phase = 4 * np.pi * n2 * d_nm / lam_nm + np.pi
    return 0.5 + 0.5 * np.exp(-d_nm / L) * np.cos(phase)


def sweep(wavelengths_nm: list[float],
          d_max_nm: float = 300.0,
          d_step_nm: float = 0.5,
          n2: float = N2_ICE_77K,
          d_target_nm: float | None = None) -> ThinFilmResult:
    """
    Calcula r(d, λ) para uma faixa de espessuras.

    Usado para gerar os dados do gráfico de sinal.
    """
    d = np.arange(0, d_max_nm + d_step_nm, d_step_nm)
    r = np.column_stack([reflectivity(d, lam, n2) for lam in wavelengths_nm])

    # Determinar zona de operação para d_target
    zone = "monotonic"
    r_at_d = []
    opd = 0.0

    if d_target_nm is not None:
        opd = 2 * n2 * d_target_nm
        d1 = wavelengths_nm[0] / (4 * n2)   # λ/(4n): limite monotônico
        d2 = wavelengths_nm[0] / (2 * n2)   # λ/(2n): primeiro mínimo

        if d_target_nm > d2:
            zone = "fringes"
        elif d_target_nm > d1:
            zone = "ambiguous"

        r_at_d = [float(reflectivity(d_target_nm, lam, n2))
                  for lam in wavelengths_nm]

    return ThinFilmResult(
        wavelengths_nm=wavelengths_nm,
        thickness_nm=d,
        reflectivity=r,
        r_at_d=r_at_d,
        zone=zone,
        opd_nm=opd
    )


def spectral_sweep(wavelengths_nm: list[float],
                   fwhm_nm: list[float],
                   d_max_nm: float = 300.0) -> np.ndarray:
    """
    Sweep com integração espectral sobre o perfil gaussiano de cada LED.

    Modela o efeito real de uma fonte de banda finita (FWHM > 0).
    Para cada λ central, integra r(d, λ') ponderado pelo perfil gaussiano
    da fonte — resultado mais preciso que o modelo monocromático.
    """
    d = np.arange(0, d_max_nm + 0.5, 0.5)
    result = np.zeros((len(d), len(wavelengths_nm)))

    for i, (lam, fwhm) in enumerate(zip(wavelengths_nm, fwhm_nm)):
        sigma = fwhm / (2 * np.sqrt(2 * np.log(2)))
        lam_range = np.linspace(lam - 2 * fwhm, lam + 2 * fwhm, 40)
        weights = np.exp(-0.5 * ((lam_range - lam) / sigma) ** 2)
        weights /= weights.sum()

        r_integrated = sum(w * reflectivity(d, l)
                          for w, l in zip(weights, lam_range))
        result[:, i] = r_integrated

    return result
```

---

### `physics/coherence.py`

```python
def coherence_length(lam_nm: float, fwhm_nm: float) -> float:
    """
    Comprimento de coerência temporal de uma fonte quasi-monocromática.

    Lc = λ² / Δλ

    Para LED com FWHM = 15 nm em λ = 528 nm:
        Lc ≈ 528² / 15 ≈ 18,600 nm ≈ 18.6 µm

    Este Lc é MUITO maior que o OPD máximo (2 × 1.31 × 300 nm ≈ 786 nm),
    portanto LED narrowband garante franjas visíveis em toda a faixa 0–300 nm.

    Parâmetros
    ----------
    lam_nm : comprimento de onda central (nm)
    fwhm_nm : largura espectral a meia-altura (nm)

    Retorna
    -------
    Lc em nanômetros
    """
    return (lam_nm ** 2) / fwhm_nm


def opd(d_nm: float, n: float = 1.31) -> float:
    """Diferença de caminho óptico para película de espessura d."""
    return 2 * n * d_nm


def check_coherence(lam_nm: float,
                    fwhm_nm: float,
                    d_max_nm: float = 300.0) -> dict:
    """
    Verifica se a fonte tem coerência suficiente para a faixa de medição.

    Retorna dict com status, Lc, OPD_max e margem de segurança.
    """
    lc = coherence_length(lam_nm, fwhm_nm)
    opd_max = opd(d_max_nm)
    margin = lc / opd_max

    return {
        "lc_nm": round(lc, 1),
        "opd_max_nm": round(opd_max, 1),
        "margin": round(margin, 1),
        "ok": lc > opd_max,
        "message": (
            f"Lc = {lc:.0f} nm >> OPD_max = {opd_max:.0f} nm "
            f"(margem {margin:.0f}×) — coerência garantida"
            if lc > opd_max
            else f"AVISO: Lc = {lc:.0f} nm < OPD_max = {opd_max:.0f} nm"
        )
    }
```

---

### `physics/refractive_index.py`

```python
import numpy as np
from scipy.interpolate import interp1d

# Dados de Kofman et al. 2019 (ApJ 875, 131)
# Gelo amorfo a 80 K, faixa 210–757 nm
# doi: 10.3847/1538-4357/ab0d89
_KOFMAN_LAM = np.array([210, 250, 300, 350, 400, 405, 450, 470, 500,
                         528, 550, 600, 650, 700, 757])
_KOFMAN_N   = np.array([1.38, 1.36, 1.345, 1.335, 1.325, 1.323, 1.318,
                         1.315, 1.312, 1.310, 1.308, 1.305, 1.303, 1.301, 1.299])

_n_interp = interp1d(_KOFMAN_LAM, _KOFMAN_N,
                     kind='cubic', fill_value='extrapolate')


def n_ice_77k(lam_nm: float | np.ndarray) -> float | np.ndarray:
    """
    Índice de refração do gelo vítreo a 77 K.

    Interpolação cúbica dos dados de Kofman et al. 2019.
    Válida para 210–757 nm. Para os LEDs do projeto:
        n(405 nm) ≈ 1.323
        n(470 nm) ≈ 1.315
        n(528 nm) ≈ 1.310

    Nota: Last et al. 2023 usam n₂ = 1.25 — valor ajustado para gelo
    com proteína, não gelo puro. Usar n_ice_77k() para maior precisão.
    """
    return float(_n_interp(lam_nm))


def n_sensitivity_analysis(lam_nm: float,
                            d_nm: float,
                            dn: float = 0.01) -> float:
    """
    Sensibilidade do modelo de espessura ao erro no índice de refração.

    Calcula Δd/Δn para quantificar o impacto de incerteza em n₂.
    Um erro de 1% em n₂ causa ~1% de erro em d (CSI arXiv 2025).
    """
    r_base = _reflectivity_with_n(d_nm, lam_nm, n_ice_77k(lam_nm))
    r_perturbed = _reflectivity_with_n(d_nm, lam_nm, n_ice_77k(lam_nm) + dn)
    return abs(r_perturbed - r_base) / dn


def _reflectivity_with_n(d, lam, n):
    return 0.5 + 0.5 * np.exp(-d / 1000) * np.cos(4 * np.pi * n * d / lam + np.pi)
```

---

### `scene/models.py`

```python
from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional

class ComponentType(str, Enum):
    SOURCE_LED   = "source_led"
    SOURCE_LASER = "source_laser"
    MIRROR       = "mirror"
    BEAMSPLITTER = "beamsplitter"
    DICHROIC     = "dichroic"
    LENS         = "lens"
    OBJECTIVE    = "objective"
    CAMERA       = "camera"
    FILTER_BP    = "filter_bandpass"
    FILTER_ND    = "filter_nd"
    CRYO_STAGE   = "cryo_stage"
    IRIS         = "iris"
    POST         = "post"

class Position(BaseModel):
    x_mm: float   # posição real em milímetros no plano da mesa
    y_mm: float

class ComponentSpec(BaseModel):
    id: str
    type: ComponentType
    position: Position
    angle_deg: float = 0.0
    label: Optional[str] = None

    # Propriedades específicas por tipo
    wavelengths_nm: list[float] = Field(default_factory=list)
    fwhm_nm: list[float] = Field(default_factory=list)
    focal_length_mm: Optional[float] = None
    na: Optional[float] = None
    working_distance_mm: Optional[float] = None
    reflectance: Optional[float] = None   # para BS e dicroico
    cutoff_nm: Optional[float] = None     # para dicroico
    od: Optional[float] = None            # para filtro ND
    diameter_mm: Optional[float] = None   # para iris

    # Referência Thorlabs (para BOM)
    thorlabs_pn: Optional[str] = None

class Scene(BaseModel):
    id: str
    name: str
    description: str = ""
    table_width_mm: float = 600.0
    table_height_mm: float = 450.0
    grid_spacing_mm: float = 25.0
    components: list[ComponentSpec] = Field(default_factory=list)
    scale_factor: float = 1.0   # px/mm no frontend

class PhysicsRequest(BaseModel):
    scene: Scene
    wavelengths_nm: list[float] = [405.0, 470.0, 528.0]
    fwhm_nm: list[float] = [6.0, 9.0, 15.0]
    d_target_nm: float = 80.0
    d_max_nm: float = 300.0
    source_type: str = "led"     # "led" | "laser"
    use_kofman_n: bool = True

class PhysicsResponse(BaseModel):
    thickness_nm: list[float]
    reflectivity: list[list[float]]   # shape (N_d, N_lambda)
    r_at_target: list[float]
    zone: str
    opd_nm: float
    coherence: list[dict]
    efficiency: dict
    validation: list[dict]
    n_values: list[float]   # n(λ) para cada comprimento de onda
```

---

### `api/ws_handler.py`

```python
from fastapi import WebSocket
from ..physics import thin_film, coherence, efficiency, refractive_index
from ..scene.models import PhysicsRequest, PhysicsResponse
from ..scene.validator import validate_scene
import json

async def handle_physics_update(websocket: WebSocket, data: dict):
    """
    Handler principal do WebSocket.

    Recebe a cena do frontend e retorna os dados físicos calculados.
    Latência alvo: < 10 ms para cenas com até 20 componentes.
    """
    try:
        req = PhysicsRequest(**data)
        scene = req.scene

        # 1. Índice de refração para cada λ (Kofman 2019 ou constante)
        if req.use_kofman_n:
            n_vals = [refractive_index.n_ice_77k(lam)
                      for lam in req.wavelengths_nm]
        else:
            n_vals = [1.31] * len(req.wavelengths_nm)

        # 2. Sweep de refletividade com integração espectral
        result = thin_film.sweep(
            wavelengths_nm=req.wavelengths_nm,
            d_max_nm=req.d_max_nm,
            d_target_nm=req.d_target_nm,
            n2=n_vals[1]   # usa n do canal central (470 nm) como referência
        )

        # 3. Verificação de coerência para cada λ
        coh = [
            coherence.check_coherence(lam, fwhm, req.d_max_nm)
            for lam, fwhm in zip(req.wavelengths_nm, req.fwhm_nm)
        ]

        # 4. Eficiência de coleta do divisor de feixe
        eff = _calculate_efficiency(scene, req.wavelengths_nm)

        # 5. Validação da cena
        validation = validate_scene(scene)

        response = PhysicsResponse(
            thickness_nm=result.thickness_nm.tolist(),
            reflectivity=result.reflectivity.tolist(),
            r_at_target=result.r_at_d,
            zone=result.zone,
            opd_nm=result.opd_nm,
            coherence=coh,
            efficiency=eff,
            validation=validation,
            n_values=n_vals
        )

        await websocket.send_json(response.model_dump())

    except Exception as e:
        await websocket.send_json({"error": str(e)})


def _calculate_efficiency(scene, wavelengths_nm: list[float]) -> dict:
    """Calcula eficiência de coleta para cada λ com base no divisor da cena."""
    bs = next((c for c in scene.components
               if c.type in ("beamsplitter", "dichroic")), None)

    if bs is None:
        return {"error": "Nenhum divisor de feixe na cena"}

    result = {}
    for lam in wavelengths_nm:
        if bs.type == "beamsplitter":
            R = bs.reflectance or 0.5
        else:
            # Dicroico: R depende de λ vs. λ_cutoff
            cutoff = bs.cutoff_nm or 505
            R = 0.90 if lam < cutoff else 0.10
        T = 1 - R
        # Eficiência ida-e-volta: R (para amostra) × T (para câmera)
        result[f"{lam:.0f}nm"] = round(R * T * 100, 1)

    return result
```

---

### `main.py`

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api.ws_handler import handle_physics_update
from .api.routes import router
import uvicorn

app = FastAPI(
    title="CRISP — Cryo Interferometry Simulator and Planner",
    version="0.1.0"
)

app.include_router(router, prefix="/api")

# Serve o frontend buildado
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/")
async def root():
    return FileResponse("frontend/dist/index.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            await handle_physics_update(websocket, data)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
```

---

## 8. Módulos do frontend (TypeScript)

### `canvas/OpticalTable.ts`

```typescript
import { Component, Ray } from '../types/scene'
import { mmToPx, pxToMm } from '../utils/units'
import { RayTracer } from './RayTracer'
import { Renderer } from './Renderer'
import { DragController } from './DragController'

export interface TableConfig {
  widthMm: number        // largura real da mesa em mm
  heightMm: number       // altura real da mesa em mm
  gridSpacingMm: number  // espaçamento da grade (padrão: 25 mm)
  pxPerMm: number        // escala inicial
}

export class OpticalTable {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: TableConfig
  private rayTracer: RayTracer
  private renderer: Renderer
  private dragController: DragController

  // Parâmetros de viewport (zoom e pan)
  private scale: number = 1.0        // fator de zoom atual
  private offsetX: number = 0        // pan X em pixels
  private offsetY: number = 0        // pan Y em pixels

  constructor(canvas: HTMLCanvasElement, config: TableConfig) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.config = config
    this.rayTracer = new RayTracer()
    this.renderer = new Renderer(this.ctx)
    this.dragController = new DragController(canvas, this)
    this.setupEventListeners()
  }

  // Converte coordenadas da tela (px) para coordenadas da mesa (mm)
  screenToMm(screenX: number, screenY: number): { x: number, y: number } {
    const x = (screenX - this.offsetX) / (this.config.pxPerMm * this.scale)
    const y = (screenY - this.offsetY) / (this.config.pxPerMm * this.scale)
    return { x, y }
  }

  // Converte coordenadas da mesa (mm) para coordenadas da tela (px)
  mmToScreen(xMm: number, yMm: number): { x: number, y: number } {
    const x = xMm * this.config.pxPerMm * this.scale + this.offsetX
    const y = yMm * this.config.pxPerMm * this.scale + this.offsetY
    return { x, y }
  }

  // Snap da posição ao grid de 25 mm
  snapToGrid(xMm: number, yMm: number): { x: number, y: number } {
    const g = this.config.gridSpacingMm
    return {
      x: Math.round(xMm / g) * g,
      y: Math.round(yMm / g) * g
    }
  }

  render(components: Component[]): void {
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale * this.config.pxPerMm,
              this.scale * this.config.pxPerMm)

    this.drawGrid()
    this.drawRulers()

    // Ray tracing em TypeScript (geometria pura, sem backend)
    const rays = this.rayTracer.trace(components)
    this.renderer.drawRays(rays)
    this.renderer.drawComponents(components)
    this.renderer.drawMeasurements(components)

    ctx.restore()
  }

  private drawGrid(): void {
    const { ctx, config } = this
    const g = config.gridSpacingMm

    ctx.strokeStyle = 'rgba(180, 178, 169, 0.4)'
    ctx.lineWidth = 0.1

    // Furos da mesa óptica (círculos nos nós do grid)
    for (let x = 0; x <= config.widthMm; x += g) {
      for (let y = 0; y <= config.heightMm; y += g) {
        ctx.beginPath()
        ctx.arc(x, y, 0.8, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Linhas auxiliares em escala menor (5 mm)
    ctx.strokeStyle = 'rgba(180, 178, 169, 0.15)'
    ctx.lineWidth = 0.05
    for (let x = 0; x <= config.widthMm; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, config.heightMm)
      ctx.stroke()
    }
    for (let y = 0; y <= config.heightMm; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(config.widthMm, y)
      ctx.stroke()
    }
  }

  private drawRulers(): void {
    // Réguas com marcações em mm nas bordas da mesa
    // Implementação omitida por brevidade
  }

  private setupEventListeners(): void {
    // Zoom com scroll, pan com clique central/espaço + drag
    this.canvas.addEventListener('wheel', this.onWheel.bind(this))
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    // Zoom centrado na posição do cursor
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    this.offsetX = cx - (cx - this.offsetX) * factor
    this.offsetY = cy - (cy - this.offsetY) * factor
    this.scale *= factor
  }
}
```

---

### `canvas/RayTracer.ts`

```typescript
import { Component, ComponentType } from '../types/scene'

export interface Ray {
  x1: number; y1: number   // origem (mm)
  x2: number; y2: number   // fim (mm)
  wavelengthNm: number
  intensity: number         // 0.0 – 1.0
  isReflected: boolean
}

export class RayTracer {
  // Mapeamento λ → cor RGB para rendering
  static wavelengthToRgb(nm: number): string {
    if (nm <= 410) return `rgba(153, 51, 255, `  // violeta
    if (nm <= 480) return `rgba(51, 153, 255, `  // azul
    if (nm <= 540) return `rgba(51, 204, 102, `  // verde
    return `rgba(255, 80, 80, `                  // vermelho
  }

  trace(components: Component[]): Ray[] {
    const rays: Ray[] = []
    const sources = components.filter(c =>
      c.type === ComponentType.SOURCE_LED ||
      c.type === ComponentType.SOURCE_LASER
    )

    for (const source of sources) {
      for (const lam of (source.wavelengthsNm ?? [470])) {
        const sourceRays = this.generateSourceRays(source, lam)
        for (const ray of sourceRays) {
          rays.push(...this.propagate(ray, components))
        }
      }
    }

    return rays
  }

  private generateSourceRays(source: Component, lam: number): Ray[] {
    // LED: feixe divergente (fan de 5 raios)
    // Laser: feixe colimado (1 raio)
    const isFan = source.type === ComponentType.SOURCE_LED
    const angles = isFan ? [-6, -3, 0, 3, 6] : [0]
    const angleRad = (source.angleDeg ?? 0) * Math.PI / 180

    return angles.map(da => ({
      x1: source.position.xMm,
      y1: source.position.yMm,
      x2: source.position.xMm + 1000 * Math.cos(angleRad + da * Math.PI / 180),
      y2: source.position.yMm + 1000 * Math.sin(angleRad + da * Math.PI / 180),
      wavelengthNm: lam,
      intensity: 1.0 / angles.length,
      isReflected: false
    }))
  }

  private propagate(ray: Ray, components: Component[], depth = 0): Ray[] {
    if (depth > 10) return []   // evitar recursão infinita

    // Encontrar o componente mais próximo que o raio atinge
    const hit = this.findClosestHit(ray, components)
    if (!hit) {
      // Raio vai até o limite da mesa
      return [ray]
    }

    const rays: Ray[] = [{
      ...ray,
      x2: hit.x,
      y2: hit.y
    }]

    // Gerar raios filhos (reflexão, transmissão)
    const children = this.applyComponent(ray, hit, depth)
    for (const child of children) {
      rays.push(...this.propagate(child, components, depth + 1))
    }

    return rays
  }

  private findClosestHit(ray: Ray, components: Component[]) {
    // Interseção raio × elemento óptico
    // Implementação de intersecção segmento-retângulo para cada componente
    let closest: { x: number, y: number, component: Component } | null = null
    let minDist = Infinity

    for (const comp of components) {
      const hit = this.rayComponentIntersect(ray, comp)
      if (hit) {
        const d = Math.hypot(hit.x - ray.x1, hit.y - ray.y1)
        if (d < minDist && d > 0.1) {
          minDist = d
          closest = { ...hit, component: comp }
        }
      }
    }

    return closest
  }

  private rayComponentIntersect(ray: Ray, comp: Component) {
    // Interseção segmento de raio com superfície do componente
    // Aproximação: cada componente é um segmento de linha rotacionado
    // Retorna ponto de interseção ou null
    // (implementação geométrica completa omitida por brevidade)
    return null
  }

  private applyComponent(ray: Ray, hit: any, depth: number): Ray[] {
    const { component } = hit
    const rays: Ray[] = []

    switch (component.type) {
      case ComponentType.MIRROR:
        rays.push(this.reflect(ray, hit, component.angleDeg ?? 45, 1.0))
        break

      case ComponentType.BEAMSPLITTER: {
        const R = component.reflectance ?? 0.5
        rays.push(this.reflect(ray, hit, component.angleDeg ?? 45, R))
        rays.push(this.transmit(ray, hit, 1 - R))
        break
      }

      case ComponentType.DICHROIC: {
        const cutoff = component.cutoffNm ?? 505
        const R = ray.wavelengthNm < cutoff ? 0.90 : 0.10
        rays.push(this.reflect(ray, hit, component.angleDeg ?? 45, R))
        rays.push(this.transmit(ray, hit, 1 - R))
        break
      }
    }

    return rays
  }

  private reflect(ray: Ray, hit: any, angleDeg: number, intensity: number): Ray {
    // Reflexão especular na superfície inclinada
    const normalAngle = angleDeg * Math.PI / 180
    const dx = ray.x2 - ray.x1
    const dy = ray.y2 - ray.y1
    // Reflexão: d_ref = d - 2(d·n̂)n̂
    const dot = dx * Math.cos(normalAngle) + dy * Math.sin(normalAngle)
    return {
      x1: hit.x, y1: hit.y,
      x2: hit.x + (dx - 2 * dot * Math.cos(normalAngle)) * 100,
      y2: hit.y + (dy - 2 * dot * Math.sin(normalAngle)) * 100,
      wavelengthNm: ray.wavelengthNm,
      intensity: ray.intensity * intensity,
      isReflected: true
    }
  }

  private transmit(ray: Ray, hit: any, intensity: number): Ray {
    const dx = ray.x2 - ray.x1
    const len = Math.hypot(dx, ray.y2 - ray.y1)
    return {
      x1: hit.x, y1: hit.y,
      x2: hit.x + (dx / len) * 1000,
      y2: hit.y + ((ray.y2 - ray.y1) / len) * 1000,
      wavelengthNm: ray.wavelengthNm,
      intensity: ray.intensity * intensity,
      isReflected: false
    }
  }
}
```

---

### `ws/WebSocketClient.ts`

```typescript
import { Scene } from '../types/scene'
import { PhysicsResponse } from '../types/physics'

type PhysicsCallback = (response: PhysicsResponse) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private callbacks: PhysicsCallback[] = []
  private reconnectDelay = 1000
  private pendingRequest: object | null = null

  connect(url: string = 'ws://localhost:8000/ws'): void {
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[CRISP] Backend conectado')
      if (this.pendingRequest) {
        this.send(this.pendingRequest)
        this.pendingRequest = null
      }
    }

    this.ws.onmessage = (event) => {
      const data: PhysicsResponse = JSON.parse(event.data)
      this.callbacks.forEach(cb => cb(data))
    }

    this.ws.onclose = () => {
      console.warn('[CRISP] Backend desconectado — reconectando...')
      setTimeout(() => this.connect(url), this.reconnectDelay)
    }
  }

  // Debounce: envia apenas quando o usuário para de mexer (200ms)
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  requestPhysicsUpdate(scene: Scene, params: {
    wavelengthsNm: number[]
    fwhmNm: number[]
    dTargetNm: number
    sourceType: 'led' | 'laser'
  }): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      const payload = { scene, ...params }
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(payload)
      } else {
        this.pendingRequest = payload
      }
    }, 200)  // espera 200ms após último evento antes de enviar
  }

  onPhysicsUpdate(callback: PhysicsCallback): void {
    this.callbacks.push(callback)
  }

  private send(data: object): void {
    this.ws?.send(JSON.stringify(data))
  }
}
```

---

## 9. API WebSocket — protocolo de mensagens

### Request (frontend → backend)

```json
{
  "scene": {
    "id": "setup-01",
    "name": "Hohle 2022 replica",
    "table_width_mm": 600,
    "table_height_mm": 450,
    "grid_spacing_mm": 25,
    "components": [
      {
        "id": "led-01",
        "type": "source_led",
        "position": { "x_mm": 50, "y_mm": 100 },
        "angle_deg": 0,
        "wavelengths_nm": [405, 470, 528],
        "fwhm_nm": [6, 9, 15],
        "thorlabs_pn": "LED4D120"
      },
      {
        "id": "bs-01",
        "type": "beamsplitter",
        "position": { "x_mm": 200, "y_mm": 100 },
        "angle_deg": 45,
        "reflectance": 0.5,
        "thorlabs_pn": "BS013"
      },
      {
        "id": "obj-01",
        "type": "objective",
        "position": { "x_mm": 200, "y_mm": 200 },
        "angle_deg": 90,
        "na": 0.3,
        "working_distance_mm": 34.0,
        "focal_length_mm": 20.0
      },
      {
        "id": "cryo-01",
        "type": "cryo_stage",
        "position": { "x_mm": 200, "y_mm": 310 },
        "angle_deg": 0
      }
    ]
  },
  "wavelengths_nm": [405, 470, 528],
  "fwhm_nm": [6, 9, 15],
  "d_target_nm": 80,
  "d_max_nm": 300,
  "source_type": "led",
  "use_kofman_n": true
}
```

### Response (backend → frontend)

```json
{
  "thickness_nm": [0.0, 0.5, 1.0, "...", 300.0],
  "reflectivity": [[0.5, 0.5, 0.5], [0.498, 0.499, 0.499], "..."],
  "r_at_target": [0.412, 0.538, 0.621],
  "zone": "monotonic",
  "opd_nm": 209.6,
  "coherence": [
    { "lc_nm": 27337, "opd_max_nm": 786, "margin": 34.8, "ok": true,
      "message": "Lc = 27337 nm >> OPD_max = 786 nm (margem 35×)" },
    { "lc_nm": 24544, "opd_max_nm": 786, "margin": 31.2, "ok": true,
      "message": "Lc = 24544 nm >> OPD_max = 786 nm (margem 31×)" },
    { "lc_nm": 18590, "opd_max_nm": 786, "margin": 23.7, "ok": true,
      "message": "Lc = 18590 nm >> OPD_max = 786 nm (margem 24×)" }
  ],
  "efficiency": {
    "405nm": 22.5,
    "470nm": 25.0,
    "528nm": 24.7
  },
  "n_values": [1.323, 1.315, 1.310],
  "validation": [
    { "level": "ok",      "message": "OPD dentro da janela de coerência para todos os canais" },
    { "level": "ok",      "message": "Distância objetiva-amostra compatível com WD = 34 mm" },
    { "level": "warning", "message": "BS 50/50: eficiência de coleta limitada a 25% — considere otimização" },
    { "level": "info",    "message": "n₂ calculado via Kofman 2019 — mais preciso que n = 1.25 (Last 2023)" }
  ]
}
```

---

## 10. Motor de física — detalhes

### Modelo de refletividade

```
r(d, λ) = ½ + ½ · exp(−d/L) · cos(4π·n₂(λ)·d/λ + π)
```

| Parâmetro | Valor | Origem |
|---|---|---|
| n₂ (405 nm) | 1.323 | Kofman et al. 2019, ApJ 875 |
| n₂ (470 nm) | 1.315 | Kofman et al. 2019, ApJ 875 |
| n₂ (528 nm) | 1.310 | Kofman et al. 2019, ApJ 875 |
| L | 1000 nm | Ajuste empírico (Last et al. 2023) |
| L (lâmela FIB) | 500 nm | Cell Reports Methods 2025 |

**Nota importante:** O parâmetro L não é o comprimento de coerência da fonte. É um fator fenomenológico que modela a perda de contraste de franjas por espalhamento e rugosidade do gelo. Seu valor deve ser calibrado experimentalmente com amostras de espessura conhecida (SiO₂).

### Zonas de operação

| Zona | Condição | Comportamento |
|---|---|---|
| Monotônica | d < λ/(4n) ≈ 77–86 nm | r varia monotonicamente — sem ambiguidade, alta sensibilidade a n₂ |
| Ambígua | λ/(4n) < d < λ/(2n) | Dois valores de d para mesmo r — requer 3λ para resolver |
| Franjas | d > λ/(2n) ≈ 154–172 nm | Franjas completas visíveis — ordem identificável |

### Comprimento de coerência dos LEDs do projeto

| Canal | λ (nm) | FWHM (nm) | Lc (µm) | OPD_max (nm) | Margem |
|---|---|---|---|---|---|
| Violeta | 405 | 6 | 27.3 | 786 | 35× |
| Azul | 470 | 9 | 24.5 | 786 | 31× |
| Verde | 528 | 15 | 18.6 | 786 | 24× |

---

## 11. Mesa óptica — sistema de coordenadas

```
Origem (0, 0) = canto superior esquerdo da mesa

Unidade real: milímetros (mm)
Grade: nós a cada 25 mm (padrão de mesa óptica Newport / Thorlabs)
Escala padrão: 1 mm = 4 px (zoom 1:1)

Conversões:
  screen_x = mm_x × px_per_mm × zoom + pan_x
  mm_x = (screen_x - pan_x) / (px_per_mm × zoom)

Snap ao grid:
  mm_snap = round(mm / 25) × 25

Ângulos:
  0° = direção horizontal positiva (→)
  90° = direção vertical positiva (↓)
  Medidos no sentido horário (convenção de tela, y cresce para baixo)
```

---

## 12. Biblioteca de componentes ópticos

| Tipo | Part number Thorlabs | Parâmetros | Notas |
|---|---|---|---|
| LED 405 nm | M405LP1 | FWHM ~6 nm | Com filtro Semrock FF01-405/10 |
| LED 470 nm | M470L5 | FWHM ~9 nm | Com filtro Semrock FF01-470/28 |
| LED 528 nm | M530L4 | FWHM ~15 nm | Com filtro Semrock FF01-531/40 |
| Beamsplitter 50/50 | BS013 | R=T=50%, 400–700 nm | Cubo 1" |
| Beamsplitter plano | BSW10 | R=T=50%, broadband | Alternativa mais barata |
| Dicroico 505 nm | DMLP505 | LP505: R<505, T>505 | Para separação com cuidado |
| Objetiva LWD 10× | TU Plan Apo 10× | NA=0.3, WD=34 mm | Utilizada por Last et al. |
| Objetiva LWD 10× | RMS10X | NA=0.25, WD=8.3 mm | Alternativa mais barata |
| Câmera sCMOS | pco.edge 4.2 | 2048×2048, 6.5 µm/px | Utilizada por Last et al. |
| Câmera color | acA2440-20gm | 2448×2048 | Utilizada no VitroJet |
| Driver LED 4ch | DC4100 | 4 canais independentes | Compatível com LED4D |
| Cabeçote LED 4λ | LED4D120 | 405/470/530/625 nm | Alternativa ao LedHUB |

---

## 13. Sistema de metrificação e medições

Toda grandeza física no CRISP é armazenada em unidades SI com prefixo explícito:

- Posições: **mm** (milímetros)
- Comprimentos de onda: **nm** (nanômetros)
- Distâncias focais: **mm**
- Ângulos: **graus** (° — input do usuário) e **radianos** (cálculos internos)
- Eficiência: **%** (porcentagem)
- Comprimento de coerência: **µm** (micrômetros)

### Medições calculadas automaticamente

```
Distância entre componentes A e B:
  d_AB = √[(x_B - x_A)² + (y_B - y_A)²]  [mm]

Comprimento de caminho óptico (OPL):
  OPL = Σ (n_i × L_i)  [mm]
  onde n_i = índice do meio, L_i = comprimento do segmento

Abertura numérica efetiva:
  NA_eff = n_obj × sin(θ_max)
  θ_max = arctan(d_apertura / (2 × f_obj))

Campo de visão no plano da amostra:
  FOV_mm = sensor_size_mm × (WD_mm / f_obj_mm)

Magnificação efetiva:
  M = f_tubo / f_obj

Eficiência de coleta (BS 50/50):
  η = R × T = 0.5 × 0.5 = 25%

Eficiência de coleta (dicroico, λ < cutoff):
  η = R × T = 0.90 × 0.10 = 9%
```

---

## 14. Presets de setup

### Preset: Hohle et al. 2022

```json
{
  "name": "Hohle et al. 2022 — Gene Center Munich",
  "reference": "doi:10.1038/s41598-022-16978-7",
  "source": { "type": "led", "wavelengths_nm": [405, 470, 528], "fwhm_nm": [6, 9, 15] },
  "objective": { "magnification": 10, "na": 0.3, "wd_mm": 34 },
  "splitter": { "type": "beamsplitter", "r": 0.5 },
  "camera": { "type": "color", "pixel_um": 6.5 },
  "cryo_stage": { "medium": "ln2", "temperature_k": 77 }
}
```

### Preset: Last et al. 2023

```json
{
  "name": "Last et al. 2023 — LUMC Leiden",
  "reference": "doi:10.1016/j.jsb.2023.107965",
  "source": { "type": "led", "part_number": "LedHUB-Omicron",
               "wavelengths_nm": [405, 470, 528], "fwhm_nm": [6, 9, 15] },
  "objective": { "model": "Nikon CFI TU Plan Apo 100×", "na": 0.9 },
  "splitter": { "type": "beamsplitter", "part": "Chroma" },
  "camera": { "model": "pco.edge 4.2", "pixel_um": 6.5 },
  "model_params": { "n2": 1.25, "L_nm": 1000 }
}
```

### Preset: LNLS/CNPEM (projeto PIBIC)

```json
{
  "name": "LNLS/CNPEM — SIBIPIRUNA setup",
  "source": { "type": "led", "part_number": "LED4D120",
               "wavelengths_nm": [405, 470, 530], "fwhm_nm": [6, 9, 15] },
  "objective": { "magnification": 10, "na": 0.3, "wd_mm": 34 },
  "splitter": { "type": "beamsplitter", "r": 0.5, "part": "BS013" },
  "camera": { "type": "color_or_scmos" },
  "cryo_stage": { "material": "aluminium", "medium": "ln2", "temperature_k": 77 },
  "model_params": { "n2": "kofman2019", "L_nm": "calibrate" }
}
```

---

## 15. Painel de validação física

O painel exibe alertas em três níveis:

| Nível | Cor | Condição de disparo |
|---|---|---|
| `ok` | verde | Condição física satisfeita |
| `info` | azul | Informação relevante sem ação requerida |
| `warning` | amarelo | Parâmetro subótimo — recomenda revisão |
| `error` | vermelho | Condição física violada — medição comprometida |

### Regras de validação implementadas

```python
# validator.py — regras de validação da cena

def validate_scene(scene: Scene) -> list[dict]:
    issues = []

    # 1. Verificar distância de trabalho da objetiva
    obj = get_component(scene, "objective")
    sample = get_component(scene, "cryo_stage")
    if obj and sample:
        d = distance_mm(obj, sample)
        wd = obj.working_distance_mm or 34.0
        if abs(d - wd) > 2.0:
            issues.append({
                "level": "error",
                "message": f"Distância objetiva-amostra = {d:.1f} mm, "
                           f"WD = {wd:.1f} mm — fora de foco"
            })

    # 2. Verificar presença de fonte
    if not get_component(scene, "source_led", "source_laser"):
        issues.append({"level": "error", "message": "Nenhuma fonte de luz na cena"})

    # 3. Verificar presença de divisor de feixe
    bs = get_component(scene, "beamsplitter", "dichroic")
    if not bs:
        issues.append({"level": "warning",
                       "message": "Nenhum divisor de feixe — path de retorno indefinido"})

    # 4. Verificar coerência (já feito no physics handler)

    # 5. Avisar sobre eficiência baixa do dicroico para λ > cutoff
    if bs and bs.type == "dichroic":
        issues.append({
            "level": "warning",
            "message": f"Dicroico {bs.cutoff_nm} nm: canal 528 nm terá eficiência "
                       f"~9% (vs. 25% do BS 50/50)"
        })

    # 6. Verificar câmera presente
    if not get_component(scene, "camera"):
        issues.append({"level": "info", "message": "Câmera não adicionada ao setup"})

    return issues or [{"level": "ok", "message": "Setup fisicamente consistente"}]
```

---

## 16. Exportação e integração

### BOM (Bill of Materials)

Gerado automaticamente a partir dos `thorlabs_pn` dos componentes na cena.

```
CRISP — Lista de Materiais
Setup: LNLS/CNPEM SIBIPIRUNA
Gerado em: 2025-05-23

Part Number   Descrição                              Qtd   Preço est. (USD)
-----------   --------------------------------       ---   ----------------
LED4D120      4-Wavelength LED Head 405/470/530/625    1         ~900
DC4100        4-Channel LED Driver                     1         ~850
BS013         Beamsplitter Cube 50:50, 400-700nm       1         ~180
TU Plan 10×   Objective LWD 10×/NA0.3 WD34mm          1        ~1200
pco.edge 4.2  sCMOS Camera                             1        ~8000
FF01-405/10   Bandpass Filter 405nm                    1         ~350
FF01-470/28   Bandpass Filter 470nm                    1         ~350
FF01-531/40   Bandpass Filter 528nm                    1         ~350
                                               Total:         ~12,180 USD
                                         Total (BRL ~6×):     ~73,080 BRL
```

### Formato de cena (JSON)

Compatível com importação/exportação entre sessões. Versionado com campo `crisp_version`.

### Integração com pipeline Python do projeto principal

```python
# O CRISP exporta coordenadas dos componentes que podem ser usadas
# diretamente no pipeline de aquisição do interferômetro real

from crisp_export import load_scene, get_camera_params

scene = load_scene("setup_lnls.json")
cam_params = get_camera_params(scene)

# cam_params contém: pixel_size_um, magnification, fov_mm, etc.
# Compatível com o módulo de aquisição do projeto PIBIC
```

---

## 17. Instalação e execução

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- Git

### Setup do backend

```bash
# Clonar o repositório
git clone https://github.com/lnls-cnpem/crisp
cd crisp

# Criar ambiente virtual Python
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate    # Windows

# Instalar dependências Python
pip install -r requirements.txt
# ou com uv (mais rápido):
# uv sync

# Rodar o backend
python -m backend.main
# Servidor disponível em http://localhost:8000
```

### Setup do frontend

```bash
# Em outro terminal
cd frontend
npm install
npm run dev
# Interface disponível em http://localhost:5173
```

### Build para produção

```bash
cd frontend
npm run build
# Frontend buildado em frontend/dist/
# O backend serve o frontend em http://localhost:8000
```

### Testes

```bash
# Backend
pytest backend/tests/ -v

# Frontend
cd frontend && npm run test
```

---

## 18. Roteiro de desenvolvimento (roadmap)

### v0.1 — MVP (meses 1–2)

- [ ] Mesa óptica com grid 25 mm e zoom/pan
- [ ] Drag-and-drop de componentes básicos (LED, BS, objetivo, câmera)
- [ ] Ray tracer geométrico em TypeScript (3 comprimentos de onda)
- [ ] Backend FastAPI com WebSocket
- [ ] Modelo r(d,λ) no backend
- [ ] Gráfico de sinal básico
- [ ] Salvar/carregar cena em JSON

### v0.2 — Metrificação e medições (meses 2–3)

- [ ] Coordenadas em mm em tempo real
- [ ] Ferramenta de régua (medir distâncias)
- [ ] Painel de medições (distâncias, OPL, ângulos)
- [ ] Snap ao grid
- [ ] Rotação de componentes

### v0.3 — Física completa (meses 3–4)

- [ ] Integração espectral (perfil gaussiano dos LEDs)
- [ ] n(λ) do gelo via Kofman 2019
- [ ] Cálculo de Lc e comparação com OPD
- [ ] Painel de validação física com alertas
- [ ] Eficiência de coleta por canal

### v0.4 — Presets e exportação (meses 4–5)

- [ ] Presets: Hohle 2022, Last 2023, VitroJet 2024, LNLS/CNPEM
- [ ] Geração de BOM Thorlabs
- [ ] Export SVG do diagrama
- [ ] Export CSV dos dados de sinal
- [ ] Relatório PDF

### v0.5 — Polimento e documentação (mês 6)

- [ ] Undo/redo
- [ ] Modo de comparação (dois setups lado a lado)
- [ ] Documentação completa
- [ ] Publicação no GitHub com licença MIT

---

## 19. Referências físicas

| Referência | Relevância para o CRISP |
|---|---|
| Last et al. J. Struct. Biol. 215, 107965 (2023) | Modelo r(d,λ), parâmetro L, dataset sintético |
| Hohle et al. Sci. Rep. 12, 15330 (2022) | Arquitetura do setup, estágio criogênico |
| Henderikx et al. J. Struct. Biol. 216, 108139 (2024) | VitroJet, medição de gelo 0–70 nm com LED |
| Kofman et al. ApJ 875, 131 (2019) | n(λ) do gelo amorfo a 10–130 K, UV-vis |
| Stubbing et al. PCCP 22, 25353 (2020) | n(λ) do gelo pós-deposição, criogênico |
| Ziapkoff et al. EPJ E (2025) | Método de luz branca, biblioteca optifik |
| arXiv 2503.06088 (2025) | Sensibilidade do erro em n₂ para CSI |
| Efimov et al. IEEE ICSP (2016) | LED vs SLD para interferometria espectral |

---

*CRISP é um projeto open-source desenvolvido no contexto do PIBIC LNLS/CNPEM.*
*Licença: MIT. Contribuições bem-vindas via pull request.*
