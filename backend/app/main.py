from fastapi import FastAPI
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware
from .models import Avistamiento
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:5173",
        "https://bio-geo-vis-3sfh.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client[os.getenv("MONGO_DB", "biogeovis")]

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/avistamientos")
def get_all_avistamientos(skip: int = 0, limit: int = 100):
    avistamientos = list(db.avistamientos.find().skip(skip).limit(limit))
    # Convertir ObjectId a string
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos

@app.get("/api/avistamientos/nombre_cientifico/{nombre_cientifico}")
def get_avistamientos_by_nombre_cientifico(nombre_cientifico: str):
    pass

@app.get("/api/avistamientos/fecha/{desde}/{hasta}")
def get_avistamientos_by_fecha(desde: str, hasta: str):
    pass

@app.get("/api/avistamientos/pais/{nombre_pais}")
def get_avistamientos_by_pais(nombre_pais: str):
    pass

@app.get("/api/avistamientos/taxonomia")
def get_avistamientos_by_taxonomia():
    pass

@app.get("/api/avistamientos/ubicacion/{lat}/{lng}")
def get_avistamientos_by_ubicacion(lat: float, lng: float):
    pass

@app.get("/api/avistamientos/agrupados/pais")
def get_avistamientos_agrupados_por_pais():
    pass

@app.get("/api/avistamientos/agrupados/fecha")
def get_avistamientos_agrupados_por_fecha():
    pass

@app.get("/api/avistamientos/agrupados/especie")
def get_avistamientos_agrupados_por_especie():
    pass
