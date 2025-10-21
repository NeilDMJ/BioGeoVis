from fastapi import FastAPI
from pymongo import MongoClient
import os

app = FastAPI()

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client[os.getenv("MONGO_DB", "biogeovis")]

@app.get("/")
def root():
    return {"message": "Backend del proyecto funcionando"}

@app.get("/api/sightings")
def get_sightings():
    return list(db.sightings.find({}, {"_id": 0}))
    
    
    
def get_all_avistamientos():
    pass

def get_avistamiento_by_id(id: str):
    pass

def get_avistamientos_by_nombre_cientifico(nombre_cientifico: str):
    pass

def get_avistamientos_by_fecha(desde: str, hasta: str):
    pass

def get_avistamientos_by_pais(nombre_pais: str):
    pass

def get_avistamientos_by_taxonomia(
    reino: str = None,
    clase: str = None,
    orden: str = None,
    familia: str = None,
    genero: str = None,
    especie: str = None
):
    pass

def get_avistamientos_by_ubicacion(lat: float, lng: float, radio_km: float):
    pass

def get_avistamientos_agrupados_por_pais():
    pass

def get_avistamientos_agrupados_por_fecha():
    pass

def get_avistamientos_agrupados_por_especie():
    pass
