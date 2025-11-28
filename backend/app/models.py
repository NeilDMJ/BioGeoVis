from pydantic import BaseModel, Field, ConfigDict, EmailStr
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
    NombreComun: Optional[str] = None


class AnalyticsFilters(BaseModel):
    nombreCientifico: Optional[str] = None
    nombreComun: Optional[str] = None
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


# ==================== Modelos de Usuario y Autenticación ====================

class UserBase(BaseModel):
    """Modelo base para usuario"""
    username: str = Field(..., min_length=5, max_length=20)
    email: EmailStr
    firstName: str = Field(..., min_length=2, max_length=50)
    lastName: str = Field(..., min_length=2, max_length=50)
    age: Optional[int] = Field(default=None, ge=10)
    photo: Optional[str] = None


class UserRegister(UserBase):
    """Modelo para registro de usuario"""
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Modelo para login de usuario"""
    email: EmailStr
    password: str


class UserInDB(UserBase):
    """Modelo de usuario en base de datos"""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    
    id: Optional[str] = Field(default=None, alias="_id")
    hashed_password: str
    registrationDate: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = Field(default=True)


class UserResponse(UserBase):
    """Modelo de respuesta de usuario (sin contraseña)"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: Optional[str] = Field(default=None, alias="_id")
    registrationDate: datetime
    isActive: bool = Field(default=True)


class Token(BaseModel):
    """Modelo para respuesta de token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Modelo para datos del token"""
    email: Optional[str] = None