from fastapi import FastAPI, HTTPException
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
# Tomar en cuenta que los datos de salida se estan limitando a 1000 registros para evitar sobrecarga
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
    # Obtener avistamientos por nombre científico
    avistamientos = list(db.avistamientos.find({"NombreCientifico": nombre_cientifico}))
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos


@app.get("/api/avistamientos/fecha/{desde}/{hasta}")
def get_avistamientos_by_fecha(desde: str, hasta: str):
    Avistamientos = list(db.avistamientos.find({
        "FechaEvento": {
            "$gte": desde,
            "$lte": hasta
        }
    }).limit(1000))
    for avistamiento in Avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return Avistamientos


@app.get("/api/avistamientos/pais/{nombre_pais}")
def get_avistamientos_by_pais(nombre_pais: str):
    avistamientos = list(db.avistamientos.find({"Ubicacion.Pais": nombre_pais}).limit(1000))
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos
    

@app.get("/api/avistamientos/taxonomia")
def get_avistamientos_by_taxonomia():
    # Obtener Avistamientos por taxonomía:Reino, Filo, Clase, Orden, Familia, Genero, Especie
    Avistamientos = list(db.avistamientos.find(
        {"Taxonomia.Reino": "Animalia",
        "Taxonomia.Filo": "Chordata",
        "Taxonomia.Clase": "Mammalia",
        "Taxonomia.Orden": "Carnivora",
        "Taxonomia.Familia": "Felidae",
        "Taxonomia.Genero": "Felis",
        "Taxonomia.Especie": "catus"
        }
    ))
    for avistamiento in Avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return Avistamientos

@app.get("/api/avistamientos/ubicacion/{lat}/{lng}")
def get_avistamientos_by_ubicacion(lat: float, lng: float):
    Avistamientos = list(db.avistamientos.find({
        "Ubicacion.Latitud": {
            "$gte": lat 
        },
        "Ubicacion.Longitud": {
            "$gte": lng
        }
    }).limit(1000))
    for avistamiento in Avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])      
    return Avistamientos

@app.get("/api/avistamientos/agrupados/pais")
def get_avistamientos_agrupados_por_pais():
    # Agrupar avistamientos por país
    try:          
        Avistamientos = list(db.avistamientos.aggregate([
            {
                "$group": {
                    "_id": "$Ubicacion.Pais",
                    "count": {"$sum": 1}
                }
            }
        ]))
        for avistamiento in Avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return Avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por país: {e}")


@app.get("/api/avistamientos/agrupados/fecha")
def get_avistamientos_agrupados_por_fecha():
    try:
        pipeline = [
            {"$match": {"FechaEvento": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$FechaEvento", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"])
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por fecha: {e}")

@app.get("/api/avistamientos/agrupados/especie")
def get_avistamientos_agrupados_por_especie():
    try:
        pipeline = [
            {"$match": {"Taxonomia.Especie": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Especie", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por especie: {e}")
