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
################################ Avistamientos #####################################
@app.get("/api/avistamientos")
def get_all_avistamientos(skip: int = 0, limit: int = 100):
    ''' Obtener todos los avistamientos con paginación '''
    avistamientos = list(db.avistamientos.find().skip(skip).limit(limit))
    # Convertir ObjectId a string
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos
###############################Filtro especificos#####################################
@app.get("/api/avistamientos/nombre_cientifico/{nombre_cientifico}")
def get_avistamientos_by_nombre_cientifico(nombre_cientifico: str):
    ''' Obtener avistamientos por nombre científico '''
    avistamientos = list(db.avistamientos.find({"NombreCientifico": nombre_cientifico}))
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos
#No funcional aun
@app.get("/api/avistamientos/fecha/{desde}/{hasta}")
def get_avistamientos_by_fecha(desde: str, hasta: str):
    ''' Obtener avistamientos por fecha '''
    Avistamientos = list(db.avistamientos.find({
        "FechaEvento": {
            "$gte": desde,
            "$lte": hasta
        }
    }).limit(1000))
    for avistamiento in Avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return Avistamientos
#funcional
@app.get("/api/avistamientos/pais/{nombre_pais}")
def get_avistamientos_by_pais(nombre_pais: str):
    ''' Obtener avistamientos por país '''
    avistamientos = list(db.avistamientos.find({"Ubicacion.Pais": nombre_pais}).limit(1000))
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos
    
#No funcional aun
@app.get("/api/avistamientos/taxonomia/{reino}/{filo}/{clase}/{orden}/{familia}/{genero}/{especie}")
def get_avistamientos_by_taxonomia(reino: str, filo: str, clase: str, orden: str, familia: str, genero: str, especie: str):
    ''' Obtener avistamientos por taxonomía:Reino, Filo, Clase, Orden, Familia, Genero, Especie '''
    Avistamientos = list(db.avistamientos.find(
        {"Taxonomia.Reino": reino,
        "Taxonomia.Filo": filo,
        "Taxonomia.Clase": clase,
        "Taxonomia.Orden": orden,
        "Taxonomia.Familia": familia,
        "Taxonomia.Genero": genero,
        "Taxonomia.Especie": especie
        }
    ))
    for avistamiento in Avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return Avistamientos
#No funcional aun
@app.get("/api/avistamientos/ubicacion/{lat}/{lng}")
def get_avistamientos_by_ubicacion(lat: float, lng: float):
    ''' Obtener avistamientos por ubicación (latitud y longitud) '''
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
#########################Faltantes###############################
@app.get("/api/avistamientos/reino/{reino}")
def get_avistamientos_agrupados_por_reino(reino: str):
    return 
@app.get("/api/avistamientos/filo/{filo}")
def get_avistamientos_agrupados_por_filo(filo: str):
    return 
@app.get("/api/avistamientos/clase/{clase}")
def get_avistamientos_agrupados_por_clase(clase: str):
    return
@app.get("/api/avistamientos/orden/{orden}")
def get_avistamientos_agrupados_por_orden(orden: str):
    return
@app.get("/api/avistamientos/familia/{familia}")
def get_avistamientos_agrupados_por_familia(familia: str):
    return
@app.get("/api/avistamientos/genero/{genero}")
def get_avistamientos_agrupados_por_genero(genero: str):
    return
@app.get("/api/avistamientos/especie/{especie}")
def get_avistamientos_agrupados_por_especie(especie: str):
    return
##########################Agrupamientos###############################
@app.get("/api/avistamientos/agrupados/pais")
def get_avistamientos_agrupados_por_pais():
    ''' Agrupar avistamientos por país '''
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
    ''' Agrupar avistamientos por fecha '''
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
    ''' Agrupar avistamientos por especie '''
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
    
@app.get("/api/avistamientos/agrupados/genero")
def get_avistamientos_agrupados_por_genero():
    ''' Agrupar avistamientos por genero '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Genero": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Genero", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por genero: {e}")
    
@app.get("/api/avistamientos/agrupados/clase")
def get_avistamientos_agrupados_por_clase():
    ''' Agrupar avistamientos por clase '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Clase": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Clase", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por clase: {e}")

@app.get("/api/avistamientos/agrupados/reino")
def get_avistamientos_agrupados_por_reino():
    ''' Agrupar avistamientos por reino '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Reino": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Reino", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por reino: {e}")  
    
@app.get("/api/avistamientos/agrupados/orden")
def get_avistamientos_agrupados_por_orden():
    ''' Agrupar avistamientos por orden '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Orden": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Orden", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por orden: {e}")  
    
@app.get("/api/avistamientos/agrupados/familia")
def get_avistamientos_agrupados_por_familia():
    ''' Agrupar avistamientos por familia '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Familia": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Familia", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por familia: {e}")

@app.get("/api/avistamientos/agrupados/filo")
def get_avistamientos_agrupados_por_filo():
    ''' Agrupar avistamientos por filo '''
    try:
        pipeline = [
            {"$match": {"Taxonomia.Filo": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$Taxonomia.Filo", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1000}
        ]
        resultados = list(db.avistamientos.aggregate(pipeline))
        for r in resultados:
            r["_id"] = str(r["_id"]) if r["_id"] is not None else None
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error agrupando por filo: {e}")

