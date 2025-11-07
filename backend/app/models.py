from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
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