from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated, List
from datetime import datetime
from bson import ObjectId

# Anotación personalizada para ObjectId
PyObjectId = Annotated[str, Field()]

# Función para convertir ObjectId a string
def serialize_object_id(obj_id):
    return str(obj_id) if obj_id else None


class Geolocalizacion(BaseModel):
    Latitud : float
    Longitud : float

class Ubicacion(BaseModel):
    Pais: str
    Geolocalizacion: Geolocalizacion

class Taxonomia(BaseModel):
    Reino: str
    Filo:str
    Clase: str
    Orden: str
    Familia: str
    Genero: str
    Especie: str

class Avistamiento(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[str] = Field(default=None, alias="_id")
    Taxonomia: Taxonomia
    Ubicacion: Ubicacion
    FechaEvento: datetime
    NombreCientifico: str


class AnalyticsFilters(BaseModel):
    nombreCientifico: Optional[str] = None
    especie: Optional[str] = None
    reino: Optional[str] = None
    filo: Optional[str] = None
    clase: Optional[str] = None
    orden: Optional[str] = None
    familia: Optional[str] = None
    genero: Optional[str] = None
    pais: Optional[str] = None
    fechaInicio: Optional[str] = None
    fechaFin: Optional[str] = None


class AnalyticsRequest(BaseModel):
    filters: AnalyticsFilters = Field(default_factory=AnalyticsFilters)
    limit: int = Field(default=2000, ge=50, le=5000)
    dimension: Optional[str] = Field(default='family')


class MetricPoint(BaseModel):
    label: str
    value: float
    unit: Optional[str] = None


class KPIItem(BaseModel):
    id: str
    label: str
    value: str
    unit: Optional[str] = None


class AnalyticsResponse(BaseModel):
    kpis: List[KPIItem]
    faunaBreakdown: List[MetricPoint]
    typeDistribution: List[MetricPoint]
    dimensionRanking: List[MetricPoint]
    temporalSeries: List[MetricPoint]
    geoDensity: List[MetricPoint]
    dimensionLabel: str
    dimensionKey: str


class AnalyticsDetailRequest(BaseModel):
    filters: AnalyticsFilters = Field(default_factory=AnalyticsFilters)
    chartId: str
    dimension: Optional[str] = Field(default='family')
    limit: int = Field(default=12, ge=3, le=50)


class AnalyticsDetailBucket(BaseModel):
    label: str
    value: int
    samples: List[str] = Field(default_factory=list)


class AnalyticsDetailResponse(BaseModel):
    chartId: str
    bucketLabel: str
    filterKey: Optional[str] = None
    dimensionLabel: str
    buckets: List[AnalyticsDetailBucket]
    total: int