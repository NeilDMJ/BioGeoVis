from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware
from .models import Avistamiento
import os
from datetime import datetime

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

@app.get("/api/avistamientos/fecha/{desde}/{hasta}")
def get_avistamientos_by_fecha(desde: str, hasta: str, limit: int = 1000):
    """
    Obtener avistamientos por rango de fecha [desde, hasta].
    - Acepta fechas en formatos comunes (p.ej. YYYY-MM-DD, DD/MM/YYYY e ISO-8601).
    - Si FechaEvento está guardado como Date en MongoDB, filtra directamente.
    - Si está como string, convierte de forma segura en el pipeline y filtra.
    """
    try:
        def parse_dt(s: str):
            s = (s or "").strip()
            formatos = [
                "%Y-%m-%d",
                "%d/%m/%Y",
                "%Y/%m/%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f",
            ]
            for fmt in formatos:
                try:
                    return datetime.strptime(s, fmt)
                except ValueError:
                    pass
            # Intento genérico ISO (maneja 'Z')
            try:
                iso = s.replace("Z", "+00:00")
                return datetime.fromisoformat(iso).replace(tzinfo=None)
            except Exception:
                return None

        d1, d2 = parse_dt(desde), parse_dt(hasta)
        if not d1 or not d2:
            raise HTTPException(status_code=400, detail="Formato de fecha no válido. Use YYYY-MM-DD o DD/MM/YYYY.")
        if d1 > d2:
            d1, d2 = d2, d1

        # Index (idempotente) para optimizar cuando es tipo Date
        try:
            db.avistamientos.create_index("FechaEvento")
        except Exception:
            pass

        # 1) Intento directo (FechaEvento como Date)
        resultados = list(
            db.avistamientos.find(
                {"FechaEvento": {"$gte": d1, "$lte": d2}}
            ).limit(limit)
        )

        # 2) Si no hay resultados, intentar cuando FechaEvento es string
        if not resultados:
            pipeline = [
                {"$match": {"FechaEvento": {"$exists": True, "$nin": [None, ""]}}},

                # Normalizar a fecha:
                {"$addFields": {
                    "_fecha": {
                        "$ifNull": [
                            {"$dateFromString": {
                                "dateString": "$FechaEvento",
                                "onError": None,
                                "onNull": None
                            }},
                            {"$dateFromString": {
                                "dateString": "$FechaEvento",
                                "format": "%d/%m/%Y",
                                "onError": None,
                                "onNull": None
                            }}
                        ]
                    }
                }},
                {"$match": {"_fecha": {"$gte": d1, "$lte": d2}}},
                {"$project": {"_fecha": 0}},
                {"$limit": limit}
            ]
            resultados = list(db.avistamientos.aggregate(pipeline))

        for a in resultados:
            a["_id"] = str(a["_id"])
        return resultados

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtrando por fecha: {e}")

@app.get("/api/avistamientos/pais/{nombre_pais}")
def get_avistamientos_by_pais(nombre_pais: str):
    ''' Obtener avistamientos por país '''
    avistamientos = list(db.avistamientos.find({"Ubicacion.Pais": nombre_pais}).limit(1000))
    for avistamiento in avistamientos:
        avistamiento["_id"] = str(avistamiento["_id"])
    return avistamientos
    

@app.get("/api/avistamientos/taxonomia/{reino}/{filo}/{clase}/{orden}/{familia}/{genero}/{especie}")
def get_avistamientos_by_taxonomia(reino: str, filo: str, clase: str, orden: str, familia: str, genero: str, especie: str):
    """
    Obtener avistamientos por taxonomía: Reino, Filo, Clase, Orden, Familia, Género, Especie.
    Usa '-' o '*' para ignorar un nivel (comodín); comparación case-insensitive exacta.
    """
    try:
        raw_params = {
            "Taxonomia.Reino": reino,
            "Taxonomia.Filo": filo,
            "Taxonomia.Clase": clase,
            "Taxonomia.Orden": orden,
            "Taxonomia.Familia": familia,
            "Taxonomia.Genero": genero,
            "Taxonomia.Especie": especie
        }
        query = {}
        for field, value in raw_params.items():
            if value not in ("-", "*"):
                # Búsqueda exacta pero ignorando mayúsculas/minúsculas
                query[field] = {"$regex": f"^{value}$", "$options": "i"}
        resultados = list(db.avistamientos.find(query).limit(1000))
        for r in resultados:
            r["_id"] = str(r["_id"])
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtrando por taxonomía: {e}")

@app.get("/api/avistamientos/ubicacion/{lat}/{lng}")
def get_avistamientos_by_ubicacion(lat: float, lng: float, tolerancia: float = 0.0001, limit: int = 1000):
    """
    Obtener avistamientos por ubicación (latitud y longitud) usando una tolerancia.
    Si los valores en la base están como string se intenta también con ese formato.
    """
    try:
        # Búsqueda primaria asumiendo que los campos son numéricos
        query_num = {
            "Ubicacion.Latitud": {"$gte": lat - tolerancia, "$lte": lat + tolerancia},
            "Ubicacion.Longitud": {"$gte": lng - tolerancia, "$lte": lng + tolerancia}
        }
        resultados = list(db.avistamientos.find(query_num).limit(limit))

        # Si no hubo resultados, intentar con valores como string (por si están guardados así)
        if not resultados:
            query_str = {
                "Ubicacion.Latitud": {"$in": [str(lat), f"{lat}"]},
                "Ubicacion.Longitud": {"$in": [str(lng), f"{lng}"]}
            }
            resultados = list(db.avistamientos.find(query_str).limit(limit))

        for avistamiento in resultados:
            avistamiento["_id"] = str(avistamiento["_id"])
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por ubicación: {e}")
#########################Faltantes###############################
@app.get("/api/avistamientos/reino/{reino}")
def get_avistamientos_por_reino(reino: str):
    ''' Obtener avistamientos por reino '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Reino": reino}).limit(2000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por reino: {e}")

@app.get("/api/avistamientos/filo/{filo}")
def get_avistamientos_agrupados_por_filo(filo: str):
    ''' Obtener avistamientos por filo '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Filo": filo}).limit(2000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por filo: {e}")

@app.get("/api/avistamientos/clase/{clase}")
def get_avistamientos_agrupados_por_clase(clase: str):
    ''' Obtener avistamientos por clase '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Clase": clase}).limit(2000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por clase: {e}")

@app.get("/api/avistamientos/orden/{orden}")
def get_avistamientos_agrupados_por_orden(orden: str):
    ''' Obtener avistamientos por orden '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Orden": orden}).limit(2000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por orden: {e}")

@app.get("/api/avistamientos/familia/{familia}")
def get_avistamientos_agrupados_por_familia(familia: str):
    ''' Obtener avistamientos por familia '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Familia": familia}).limit(2000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por familia: {e}")

@app.get("/api/avistamientos/genero/{genero}")
def get_avistamientos_agrupados_por_genero(genero: str):
    ''' Obtener avistamientos por género '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Genero": genero}).limit(1000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por género: {e}")

@app.get("/api/avistamientos/especie/{especie}")
def get_avistamientos_agrupados_por_especie(especie: str):
    ''' Obtener avistamientos por especie '''
    try:
        avistamientos = list(db.avistamientos.find({"Taxonomia.Especie": especie}).limit(1000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por especie: {e}")

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

