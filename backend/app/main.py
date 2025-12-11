from fastapi import FastAPI, HTTPException, Depends, status, Request
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from .models import (
    Avistamiento,
    AnalyticsRequest,
    AnalyticsResponse,
    AnalyticsDetailRequest,
    AnalyticsDetailResponse,
)
from .stripe_service import (
    DonationRequest,
    PaymentIntentResponse,
    create_payment_intent,
    verify_webhook_signature,
    handle_payment_intent_succeeded,
    handle_payment_intent_failed,
)
import os
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Set
from collections import Counter
import re
import json
from bson import ObjectId


def _normalize_option(value: Optional[Any]) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    return str(value)


def _regex_exact(value: str) -> Dict[str, Any]:
    return {"$regex": f"^{re.escape(value.strip())}$", "$options": "i"}


TAXONOMY_FIELD_MAP = [
    ("nombreComun", "NombreComun"),
    ("reino", "Taxonomia.Reino"),
    ("filo", "Taxonomia.Filo"),
    ("clase", "Taxonomia.Clase"),
    ("orden", "Taxonomia.Orden"),
    ("familia", "Taxonomia.Familia"),
    ("genero", "Taxonomia.Genero"),
    ("especie", "Taxonomia.Especie"),
    ("pais", "Ubicacion.Pais"),
]

TAXONOMY_OPTION_LIMIT = 2000
TAXONOMY_SAMPLE_SIZE = 2000


LOCATION_FIELD_MAP = [
    ("ciudad", "Ubicacion.Ciudad"),
    ("estado", "Ubicacion.Estado"),
    ("municipio", "Ubicacion.Municipio"),
    ("localidad", "Ubicacion.Localidad"),
    ("pais", "Ubicacion.Pais"),
]


def _facet_spec(limit: int = TAXONOMY_OPTION_LIMIT) -> Dict[str, List[Dict[str, Any]]]:
    """Construye la definición del $facet para cada nivel taxonómico limitando resultados."""
    return {
        key: [
            {"$group": {"_id": f"${field}"}},
            {"$sort": {"_id": 1}},
            {"$limit": limit},
        ]
        for key, field in TAXONOMY_FIELD_MAP
    }


def _serialize_taxonomy_filters(filters: Dict[str, Optional[str]]) -> str:
    """Serializa los filtros en un json ordenado para usarlos como clave de caché."""
    ordered = {key: filters.get(key) for key, _ in TAXONOMY_FIELD_MAP}
    return json.dumps(ordered, sort_keys=True, ensure_ascii=False)


@lru_cache(maxsize=128)
def _cached_taxonomy_options(filter_key: str) -> Dict[str, List[str]]:
    """Realiza la agregación facet y la almacena en memoria (por instancia).

    Nota: en despliegues con varios workers cada proceso mantiene su propia
    caché. Si se requiere coherencia global habría que usar un backend como
    Redis, pero no se introduce aquí para mantener el footprint actual.
    """
    filters = json.loads(filter_key)
    match_query = _build_taxonomy_query(filters)
    pipeline: List[Dict[str, Any]] = []
    if match_query:
        pipeline.append({"$match": match_query})
    # Para evitar scans completos sobre colecciones grandes, se toma una muestra
    # determinística (primeros documentos según el orden natural de almacenamiento).
    # Esto mantiene la latencia baja en ambientes con cientos de miles de registros
    # sacrificando la exhaustividad cuando no hay filtros activos.
    pipeline.append({"$limit": TAXONOMY_SAMPLE_SIZE})
    pipeline.append({"$facet": _facet_spec()})

    result = list(db.avistamientos.aggregate(pipeline))
    facets = result[0] if result else {}
    response: Dict[str, List[str]] = {}
    for key, _ in TAXONOMY_FIELD_MAP:
        raw_values = facets.get(key, []) or []
        cleaned: List[str] = []
        for item in raw_values:
            normalized = _normalize_option(item.get("_id"))
            if not normalized:
                continue
            cleaned.append(normalized)
        response[key] = cleaned
    return response


def _build_taxonomy_query(filters: Dict[str, Optional[str]], exclude_key: Optional[str] = None) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    for key, field in TAXONOMY_FIELD_MAP:
        if key == exclude_key:
            continue
        raw_value = filters.get(key)
        normalized = _normalize_option(raw_value)
        if not normalized:
            continue
        if normalized in {"-", "*"}:
            continue
        query[field] = _regex_exact(normalized)
    return query

app = FastAPI()

# Índices para acelerar las consultas. Se crean en startup.
@app.on_event("startup")
def _ensure_indexes():
    try:
        db.avistamientos.create_index("FechaEvento")
        db.avistamientos.create_index("NombreCientifico")
        db.avistamientos.create_index("NombreComun")
        db.avistamientos.create_index([("NombreComun", 1), ("NombreCientifico", 1)])
        db.avistamientos.create_index("Ubicacion.Pais")
        db.avistamientos.create_index("Ubicacion.Latitud")
        db.avistamientos.create_index("Ubicacion.Longitud")
        db.avistamientos.create_index("Taxonomia.Reino")
        db.avistamientos.create_index("Taxonomia.Filo")
        db.avistamientos.create_index("Taxonomia.Clase")
        db.avistamientos.create_index("Taxonomia.Orden")
        db.avistamientos.create_index("Taxonomia.Familia")
        db.avistamientos.create_index("Taxonomia.Genero")
        db.avistamientos.create_index("Taxonomia.Especie")
    except Exception:
        # No bloquear el arranque si falla
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "https://bio-geo-vis-3sfh.vercel.app",
        "https://*.railway.app",
        "https://*.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Comprimir respuestas grandes para acelerar transferencia
app.add_middleware(GZipMiddleware, minimum_size=500)

# Configuración de MongoDB (soporta local y Atlas)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Si es Atlas (mongodb+srv), usar ServerApi
if mongo_uri.startswith("mongodb+srv://"):
    client = MongoClient(mongo_uri, server_api=ServerApi('1'))
else:
    client = MongoClient(mongo_uri)

db = client[os.getenv("MONGO_DB", "biogeovis")]
# Tomar en cuenta que los datos de salida se estan limitando a 1000 registros para evitar sobrecarga
@app.get("/")
def read_root():
    return {"Hello": "World"}


################################ Stripe Donaciones #####################################

@app.post("/api/donations/create-payment-intent", response_model=PaymentIntentResponse)
async def create_donation_payment_intent(donation: DonationRequest):
    """
    Crear un PaymentIntent de Stripe para procesar una donación
    """
    return await create_payment_intent(donation)


@app.post("/api/donations/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook para recibir eventos de Stripe (pagos exitosos, fallidos, etc.)
    
    Para configurar en Stripe Dashboard:
    1. Ve a Developers → Webhooks
    2. Agrega endpoint: https://tu-dominio.com/api/donations/webhook
    3. Selecciona eventos: payment_intent.succeeded, payment_intent.payment_failed
    4. Copia el signing secret a STRIPE_WEBHOOK_SECRET
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    
    # Verificar que el evento viene de Stripe
    event = await verify_webhook_signature(payload, sig_header)
    
    # Manejar diferentes tipos de eventos
    event_type = event['type']
    
    if event_type == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        await handle_payment_intent_succeeded(payment_intent)
        
    elif event_type == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        await handle_payment_intent_failed(payment_intent)
    
    return {"status": "success"}


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


@app.get("/api/avistamientos/nombre_comun/{nombre_comun}")
def get_avistamientos_by_nombre_comun(nombre_comun: str, limit: int = 1000):
    """
    Obtener avistamientos por nombre común (case-insensitive, búsqueda parcial).
    Ejemplo: /api/avistamientos/nombre_comun/jaguar
    """
    try:
        normalized = _normalize_option(nombre_comun)
        if not normalized:
            raise HTTPException(status_code=400, detail="Nombre común requerido")
        
        # Búsqueda case-insensitive con regex
        query = {"NombreComun": {"$regex": normalized, "$options": "i"}}
        avistamientos = list(db.avistamientos.find(query).limit(limit))
        
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por nombre común: {e}")

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

        try:
            db.avistamientos.create_index("FechaEvento")
        except Exception:
            pass

        # 1) Intento directo 
        resultados = list(
            db.avistamientos.find(
                {"FechaEvento": {"$gte": d1, "$lte": d2}}
            ).limit(limit)
        )

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
    

@app.get("/api/avistamientos/ciudad/{ciudad}")
def get_avistamientos_by_ciudad(ciudad: str):
    '''Obtener avistamientos por ciudad'''
    normalized = _normalize_option(ciudad)
    if not normalized:
        raise HTTPException(status_code=400, detail="Ciudad requerida")
    try:
        query = {"Ubicacion.Ciudad": _regex_exact(normalized)}
        avistamientos = list(db.avistamientos.find(query).limit(1000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por ciudad: {exc}")


@app.get("/api/avistamientos/estado/{estado}")
def get_avistamientos_by_estado(estado: str):
    '''Obtener avistamientos por estado/region'''
    normalized = _normalize_option(estado)
    if not normalized:
        raise HTTPException(status_code=400, detail="Estado requerido")
    try:
        query = {"Ubicacion.Estado": _regex_exact(normalized)}
        avistamientos = list(db.avistamientos.find(query).limit(1000))
        for avistamiento in avistamientos:
            avistamiento["_id"] = str(avistamiento["_id"])
        return avistamientos
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por estado: {exc}")


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
        used_fields = []
        for field, value in raw_params.items():
            if value not in ("-", "*") and value.strip():
                used_fields.append((field, value.strip()))
                query[field] = {"$regex": f"^{value.strip()}$", "$options": "i"}

        resultados = list(db.avistamientos.find(query).limit(1000))

        # Fallback: si no hubo resultados y se usaron campos, probar pipeline con trim+lower
        if not resultados and used_fields:
            and_expr = []
            for field, value in used_fields:
                and_expr.append({
                    "$eq": [
                        {"$toLower": {"$trim": {"input": f"${field}"}}},
                        value.lower()
                    ]
                })
            pipeline = [
                {"$match": {"$expr": {"$and": and_expr}}},
                {"$limit": 1000}
            ]
            resultados = list(db.avistamientos.aggregate(pipeline))

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
        # Según models.py, la estructura es Ubicacion.Geolocalizacion.Latitud/Longitud
        query_num = {
            "Ubicacion.Geolocalizacion.Latitud": {"$gte": lat - tolerancia, "$lte": lat + tolerancia},
            "Ubicacion.Geolocalizacion.Longitud": {"$gte": lng - tolerancia, "$lte": lng + tolerancia}
        }
        resultados = list(db.avistamientos.find(query_num).limit(limit))

        # Si no hubo resultados, intentar con valores como string (por si están guardados así)
        if not resultados:
            query_str = {
                "Ubicacion.Geolocalizacion.Latitud": {"$in": [str(lat), f"{lat}"]},
                "Ubicacion.Geolocalizacion.Longitud": {"$in": [str(lng), f"{lng}"]}
            }
            resultados = list(db.avistamientos.find(query_str).limit(limit))

        for avistamiento in resultados:
            avistamiento["_id"] = str(avistamiento["_id"])
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo avistamientos por ubicación: {e}")


@app.get("/api/metadata/taxonomia/opciones")
def get_taxonomia_options(
    nombreComun: Optional[str] = None,
    reino: Optional[str] = None,
    filo: Optional[str] = None,
    clase: Optional[str] = None,
    orden: Optional[str] = None,
    familia: Optional[str] = None,
    genero: Optional[str] = None,
    especie: Optional[str] = None,
    pais: Optional[str] = None
):
    """Devuelve las listas de opciones filtradas mediante un único $facet."""
    try:
        filters = {
            "nombreComun": nombreComun,
            "reino": reino,
            "filo": filo,
            "clase": clase,
            "orden": orden,
            "familia": familia,
            "genero": genero,
            "especie": especie,
            "pais": pais,
        }
        # Nota: si se ingesta data nueva y se requiere refrescar manualmente,
        # se puede invocar _cached_taxonomy_options.cache_clear() durante el despliegue.
        cache_key = _serialize_taxonomy_filters(filters)
        cached = _cached_taxonomy_options(cache_key)
        # Se devuelve una copia superficial para evitar mutaciones externas
        return {key: list(values) for key, values in cached.items()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error obteniendo opciones taxonómicas: {exc}")


@app.get("/api/metadata/ubicaciones/sugerencias")
def get_location_suggestions(q: str, limit: int = 8):
    """Sugerencias predictivas para ciudades, estados u otras ubicaciones."""
    term = (q or "").strip()
    if len(term) < 2:
        return {"results": []}
    regex = {"$regex": f"^{re.escape(term)}", "$options": "i"}
    suggestions: List[Dict[str, str]] = []
    seen: Set[str] = set()
    try:
        for alias, field in LOCATION_FIELD_MAP:
            matches = db.avistamientos.distinct(field, {field: regex})
            for value in matches:
                normalized = _normalize_option(value)
                if not normalized:
                    continue
                key = normalized.lower()
                if key in seen:
                    continue
                seen.add(key)
                suggestions.append({
                    "label": normalized,
                    "type": alias,
                })
                if len(suggestions) >= limit:
                    return {"results": suggestions}
        return {"results": suggestions}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error obteniendo sugerencias de ubicación: {exc}")
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

################################ Analytics #######################################
DATE_INPUT_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
]

DIMENSION_CONFIG = {
    "species": {"label": "Especie", "path": "Taxonomia.Especie", "filter_key": "especie"},
    "family": {"label": "Familia", "path": "Taxonomia.Familia", "filter_key": "familia"},
    "order": {"label": "Orden", "path": "Taxonomia.Orden", "filter_key": "orden"},
    "location": {"label": "Ubicación", "path": "Ubicacion.Pais", "filter_key": "pais"},
}

DEFAULT_DIMENSION_KEY = "family"

CHART_FIELD_MAP = {
    "fauna-breakdown": {"path": "Taxonomia.Clase", "label": "Clase", "filter_key": "clase"},
    "type-distribution": {"path": "Taxonomia.Orden", "label": "Orden", "filter_key": "orden"},
    "geo-density": {"path": "Ubicacion.Pais", "label": "País", "filter_key": "pais"},
}

DETAIL_DOCUMENT_LIMIT = 3000


def _safe_trim(value: Optional[Any]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _ci_regex(value: str) -> Dict[str, Any]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    for fmt in DATE_INPUT_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    try:
        iso = cleaned.replace("Z", "+00:00")
        return datetime.fromisoformat(iso).replace(tzinfo=None)
    except Exception:
        return None


def _normalize_event_date(raw_value: Any) -> Optional[datetime]:
    if isinstance(raw_value, datetime):
        return raw_value
    if isinstance(raw_value, str):
        return _parse_date(raw_value)
    return None


def _build_filters_query(filters) -> Dict[str, Any]:
    if not filters:
        return {}
    mapping = {
        "nombreCientifico": "NombreCientifico",
        "especie": "Taxonomia.Especie",
        "reino": "Taxonomia.Reino",
        "filo": "Taxonomia.Filo",
        "clase": "Taxonomia.Clase",
        "orden": "Taxonomia.Orden",
        "familia": "Taxonomia.Familia",
        "genero": "Taxonomia.Genero",
        "pais": "Ubicacion.Pais",
    }
    query: Dict[str, Any] = {}
    for attr, field in mapping.items():
        value = _safe_trim(getattr(filters, attr, None))
        if value:
            query[field] = _ci_regex(value)

    start = _parse_date(getattr(filters, "fechaInicio", None))
    end = _parse_date(getattr(filters, "fechaFin", None))
    if start and end and start > end:
        start, end = end, start
    if start or end:
        date_query: Dict[str, Any] = {}
        if start:
            date_query["$gte"] = start
        if end:
            date_query["$lte"] = end
        query["FechaEvento"] = date_query
    return query


def _resolve_dimension_config(dimension: Optional[str]):
    key = (dimension or DEFAULT_DIMENSION_KEY).lower()
    config = DIMENSION_CONFIG.get(key, DIMENSION_CONFIG[DEFAULT_DIMENSION_KEY])
    if config is DIMENSION_CONFIG[DEFAULT_DIMENSION_KEY]:
        key = DEFAULT_DIMENSION_KEY
    return key, config


def _resolve_chart_detail_config(chart_id: str, dimension_config: Dict[str, Any]):
    if chart_id == "family-classification":
        return {
            "type": "dimension",
            "path": dimension_config["path"],
            "label": dimension_config["label"],
            "filter_key": dimension_config.get("filter_key"),
        }
    if chart_id == "temporal-distribution":
        return {
            "type": "temporal",
            "label": "Periodo",
            "filter_key": None,
        }
    base = CHART_FIELD_MAP.get(chart_id)
    if base:
        return {
            "type": "categorical",
            "path": base["path"],
            "label": base["label"],
            "filter_key": base.get("filter_key"),
        }
    raise HTTPException(status_code=400, detail=f"chartId '{chart_id}' no soportado para detalle")


def _fetch_documents(filters, limit):
    query = _build_filters_query(filters)
    cursor = db.avistamientos.find(query)
    return list(cursor.limit(limit))


def _extract_path(document: Dict[str, Any], path: str) -> Optional[str]:
    parts = path.split(".")
    cursor: Any = document
    for part in parts:
        if cursor is None:
            return None
        if isinstance(cursor, dict):
            cursor = cursor.get(part)
        else:
            return None
    if cursor is None:
        return None
    return _safe_trim(cursor)


def _counter_to_series(counter: Counter, top: Optional[int] = None):
    items = counter.most_common(top)
    return [
        {"label": label or "Sin dato", "value": int(value)}
        for label, value in items
    ]


def _build_bucket_series_with_samples(documents, extractor, top: int = 12):
    counter: Counter = Counter()
    samples: Dict[str, list] = {}
    for doc in documents:
        label = extractor(doc) or "Sin dato"
        counter[label] += 1
        bucket_samples = samples.setdefault(label, [])
        if len(bucket_samples) < 3:
            example = _extract_path(doc, "NombreCientifico") or _extract_path(doc, "Taxonomia.Especie") or str(doc.get("_id"))
            if example and example not in bucket_samples:
                bucket_samples.append(example)
    buckets = []
    for label, value in counter.most_common(top):
        buckets.append({"label": label, "value": int(value), "samples": samples.get(label, [])})
    return buckets


def _temporal_series(documents):
    counter: Counter = Counter()
    for doc in documents:
        dt = _normalize_event_date(doc.get("FechaEvento"))
        if not dt:
            continue
        key = dt.strftime("%Y-%m")
        counter[key] += 1
    series = []
    for key in sorted(counter.keys()):
        try:
            dt = datetime.strptime(key, "%Y-%m")
            label = dt.strftime("%b %Y")
        except ValueError:
            label = key
        series.append({"label": label, "value": int(counter[key])})
    return series


def _temporal_buckets_with_samples(documents, top: int = 12):
    base_series = _temporal_series(documents)
    if not base_series:
        return []
    if top and top < len(base_series):
        base_series = base_series[-top:]
    allowed_labels = {bucket["label"] for bucket in base_series}
    samples: Dict[str, list] = {label: [] for label in allowed_labels}
    for doc in documents:
        dt = _normalize_event_date(doc.get("FechaEvento"))
        if not dt:
            continue
        label = dt.strftime("%b %Y")
        if label not in allowed_labels:
            continue
        bucket_samples = samples[label]
        if len(bucket_samples) < 3:
            example = _extract_path(doc, "NombreCientifico") or _extract_path(doc, "Taxonomia.Especie") or str(doc.get("_id"))
            if example and example not in bucket_samples:
                bucket_samples.append(example)
    buckets = []
    for bucket in base_series:
        buckets.append({
            "label": bucket["label"],
            "value": int(bucket["value"]),
            "samples": samples.get(bucket["label"], []),
        })
    return buckets


def _date_range_label(documents):
    dates = [
        _normalize_event_date(doc.get("FechaEvento"))
        for doc in documents
    ]
    filtered = sorted([d for d in dates if d])
    if not filtered:
        return "Sin datos"
    return f"{filtered[0].strftime('%d %b %Y')} – {filtered[-1].strftime('%d %b %Y')}"


def _format_number(number: int) -> str:
    return f"{number:,}".replace(",", " ")


def _empty_analytics_response() -> AnalyticsResponse:
    base_series = []
    return AnalyticsResponse(
        kpis=[
            {"id": "total-records", "label": "Registros", "value": "0"},
            {"id": "dimension", "label": f"{DIMENSION_CONFIG[DEFAULT_DIMENSION_KEY]['label']}s únicos", "value": "0"},
            {"id": "unique-species", "label": "Especies únicas", "value": "0"},
            {"id": "date-range", "label": "Rango temporal", "value": "Sin datos"},
        ],
        faunaBreakdown=base_series,
        typeDistribution=base_series,
        dimensionRanking=base_series,
        temporalSeries=base_series,
        geoDensity=base_series,
        dimensionLabel=DIMENSION_CONFIG[DEFAULT_DIMENSION_KEY]["label"],
        dimensionKey=DEFAULT_DIMENSION_KEY,
    )


@app.post("/api/analytics/summary", response_model=AnalyticsResponse)
def get_analytics_summary(payload: AnalyticsRequest):
    try:
        dimension_key, dimension_config = _resolve_dimension_config(payload.dimension)
        filters = payload.filters
        documents = _fetch_documents(filters, payload.limit)
        if not documents:
            empty = _empty_analytics_response()
            empty.dimensionKey = dimension_key
            empty.dimensionLabel = dimension_config["label"]
            empty.kpis[1]["label"] = f"{dimension_config['label']}s únicos"
            return empty

        total = len(documents)
        species_values = {
            value
            for doc in documents
            for value in [
                _extract_path(doc, "Taxonomia.Especie") or _extract_path(doc, "NombreCientifico")
            ]
            if value
        }
        unique_species = len(species_values)
        dimension_counter = Counter(
            filter(None, (_extract_path(doc, dimension_config["path"]) for doc in documents))
        )
        unique_dimension = len(dimension_counter)

        fauna_counter = Counter(
            filter(None, (_extract_path(doc, "Taxonomia.Clase") for doc in documents))
        )
        type_counter = Counter(
            filter(None, (_extract_path(doc, "Taxonomia.Orden") for doc in documents))
        )
        geo_counter = Counter(
            filter(None, (_extract_path(doc, "Ubicacion.Pais") for doc in documents))
        )

        response = AnalyticsResponse(
            kpis=[
                {"id": "total-records", "label": "Registros", "value": _format_number(total)},
                {"id": "dimension", "label": f"{dimension_config['label']}s únicos", "value": _format_number(unique_dimension)},
                {"id": "unique-species", "label": "Especies únicas", "value": _format_number(unique_species)},
                {"id": "date-range", "label": "Rango temporal", "value": _date_range_label(documents)},
            ],
            faunaBreakdown=_counter_to_series(fauna_counter, top=8),
            typeDistribution=_counter_to_series(type_counter, top=8),
            dimensionRanking=_counter_to_series(dimension_counter, top=10),
            temporalSeries=_temporal_series(documents),
            geoDensity=_counter_to_series(geo_counter, top=10),
            dimensionLabel=dimension_config["label"],
            dimensionKey=dimension_key,
        )
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener analytics: {exc}")


@app.post("/api/analytics/detail", response_model=AnalyticsDetailResponse)
def get_analytics_detail(payload: AnalyticsDetailRequest):
    try:
        _, dimension_config = _resolve_dimension_config(payload.dimension)
        chart_config = _resolve_chart_detail_config(payload.chartId, dimension_config)
        documents = _fetch_documents(payload.filters, DETAIL_DOCUMENT_LIMIT)
        bucket_limit = max(1, min(payload.limit or 12, 50))
        if not documents:
            return AnalyticsDetailResponse(
                chartId=payload.chartId,
                bucketLabel=chart_config["label"],
                filterKey=chart_config.get("filter_key"),
                dimensionLabel=dimension_config["label"],
                buckets=[],
                total=0,
            )

        if chart_config["type"] == "temporal":
            buckets = _temporal_buckets_with_samples(documents, top=bucket_limit)
        else:
            extractor = lambda doc, path=chart_config["path"]: _extract_path(doc, path)
            buckets = _build_bucket_series_with_samples(documents, extractor, top=bucket_limit)

        total = sum(bucket["value"] for bucket in buckets)
        return AnalyticsDetailResponse(
            chartId=payload.chartId,
            bucketLabel=chart_config["label"],
            filterKey=chart_config.get("filter_key"),
            dimensionLabel=dimension_config["label"],
            buckets=buckets,
            total=total,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener detalle de analytics: {exc}")

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

