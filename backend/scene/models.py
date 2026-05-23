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
    x_mm: float
    y_mm: float


class ComponentSpec(BaseModel):
    id: str
    type: ComponentType
    position: Position
    angle_deg: float = 0.0
    label: Optional[str] = None

    wavelengths_nm: list[float] = Field(default_factory=list)
    fwhm_nm: list[float] = Field(default_factory=list)
    focal_length_mm: Optional[float] = None
    na: Optional[float] = None
    working_distance_mm: Optional[float] = None
    magnification: Optional[float] = None
    correction_type: Optional[str] = None   # 'basic' | 'plan' | 'plan_apo'
    sensor_width_mm: Optional[float] = None
    sensor_height_mm: Optional[float] = None
    reflectance: Optional[float] = None
    cutoff_nm: Optional[float] = None
    od: Optional[float] = None
    diameter_mm: Optional[float] = None
    thorlabs_pn: Optional[str] = None


class Scene(BaseModel):
    id: str
    name: str
    description: str = ""
    table_width_mm: float = 600.0
    table_height_mm: float = 450.0
    grid_spacing_mm: float = 25.0
    components: list[ComponentSpec] = Field(default_factory=list)
    scale_factor: float = 1.0


class PhysicsRequest(BaseModel):
    scene: Scene
    wavelengths_nm: list[float] = [405.0, 470.0, 528.0]
    fwhm_nm: list[float] = [6.0, 9.0, 15.0]
    d_target_nm: float = 80.0
    d_max_nm: float = 300.0
    source_type: str = "led"
    use_kofman_n: bool = True


class PhysicsResponse(BaseModel):
    thickness_nm: list[float]
    reflectivity: list[list[float]]
    r_at_target: list[float]
    zone: str
    opd_nm: float
    coherence: list[dict]
    efficiency: dict
    validation: list[dict]
    n_values: list[float]
