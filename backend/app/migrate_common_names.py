"""
Script de migración para agregar NombreComun a documentos existentes.
Optimizado para 1 millón de registros usando GBIF como fuente primaria
e iNaturalist como fallback.

USO:
    # Modo DRY RUN (no modifica datos, solo muestra qué haría):
    python migrate_common_names.py

    # Ejecutar migración real:
    python migrate_common_names.py --execute

    # Continuar desde donde se quedó (por si falla a mitad):
    python migrate_common_names.py --execute --resume

    # Limitar a N especies únicas (para pruebas):
    python migrate_common_names.py --execute --limit 100
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pymongo import MongoClient, UpdateMany
from typing import Optional, Dict, List
import time
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Crear sesión con reintentos automáticos
def create_session():
    session = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

# Sesión global reutilizable
HTTP_SESSION = create_session()

# Configuración
GBIF_SPECIES_MATCH = "https://api.gbif.org/v1/species/match"
GBIF_VERNACULAR = "https://api.gbif.org/v1/species/{}/vernacularNames"
INAT_TAXA_SEARCH = "https://api.inaturalist.org/v1/taxa"

# Archivo de caché persistente para no repetir consultas entre ejecuciones
CACHE_FILE = Path(__file__).parent.parent / "database" / "common_names_cache.json"
PROGRESS_FILE = Path(__file__).parent.parent / "database" / "migration_progress.json"

# Rate limiting
GBIF_DELAY = 0.05  # 20 req/seg máximo para GBIF
INAT_DELAY = 0.5   # iNaturalist es más restrictivo

def load_cache() -> Dict[str, Optional[str]]:
    """Cargar caché de nombres desde disco."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Error cargando caché: {e}")
    return {}

def save_cache(cache: Dict[str, Optional[str]]):
    """Guardar caché a disco."""
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[WARN] Error guardando caché: {e}")

def load_progress() -> Dict:
    """Cargar progreso de migración."""
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"processed_names": [], "last_update": None}

def save_progress(progress: Dict):
    """Guardar progreso."""
    progress["last_update"] = datetime.now().isoformat()
    try:
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[WARN] Error guardando progreso: {e}")


def get_common_name_gbif(scientific_name: str, lang: str = "spa") -> Optional[str]:
    """Consulta GBIF para obtener nombre común en español."""
    try:
        # 1. Obtener taxonKey
        match = HTTP_SESSION.get(
            GBIF_SPECIES_MATCH, 
            params={"name": scientific_name, "verbose": False},
            timeout=30
        )
        if match.status_code != 200:
            return None
        
        data = match.json()
        taxon_key = data.get("usageKey")
        if not taxon_key:
            return None
        
        time.sleep(GBIF_DELAY)
        
        # 2. Obtener nombres vernáculos
        vernacular = HTTP_SESSION.get(
            GBIF_VERNACULAR.format(taxon_key),
            params={"limit": 100},
            timeout=30
        )
        if vernacular.status_code != 200:
            return None
        
        names = vernacular.json().get("results", [])
        
        # Prioridad: español > inglés > cualquiera
        for priority_lang in [lang, "spa", "es", "eng", "en"]:
            for name in names:
                name_lang = (name.get("language") or "").lower()
                if name_lang == priority_lang or name_lang.startswith(priority_lang[:2]):
                    return name.get("vernacularName")
        
        # Fallback: primer nombre disponible
        if names:
            return names[0].get("vernacularName")
        
        return None
    except Exception as e:
        print(f"  [GBIF ERROR] {scientific_name}: {e}")
        return None


def get_common_name_inaturalist(scientific_name: str) -> Optional[str]:
    """Fallback: consulta iNaturalist para nombre común."""
    try:
        response = HTTP_SESSION.get(
            INAT_TAXA_SEARCH,
            params={
                "q": scientific_name,
                "locale": "es",
                "per_page": 1
            },
            timeout=30
        )
        if response.status_code != 200:
            return None
        
        results = response.json().get("results", [])
        if not results:
            return None
        
        taxon = results[0]
        # iNat ya devuelve preferred_common_name según locale
        common = taxon.get("preferred_common_name")
        if common:
            return common
        
        # Fallback: buscar en nombres por idioma
        names = taxon.get("names", [])
        for name in names:
            if name.get("locale") in ["es", "es-MX", "es-ES"]:
                return name.get("name")
        
        return None
    except Exception as e:
        print(f"  [INAT ERROR] {scientific_name}: {e}")
        return None


def get_common_name(scientific_name: str, cache: Dict[str, Optional[str]]) -> Optional[str]:
    """Obtener nombre común, primero de caché, luego GBIF, luego iNaturalist."""
    # Normalizar nombre
    sci_name = scientific_name.strip() if scientific_name else ""
    if not sci_name:
        return None
    
    # Revisar caché
    if sci_name in cache:
        return cache[sci_name]
    
    # Intentar GBIF primero
    common = get_common_name_gbif(sci_name)
    
    # Si no hay resultado, intentar iNaturalist
    if not common:
        time.sleep(INAT_DELAY)
        common = get_common_name_inaturalist(sci_name)
    
    # Guardar en caché (incluso si es None para no repetir consultas)
    cache[sci_name] = common
    
    return common


def migrate_common_names(
    dry_run: bool = True,
    resume: bool = False,
    limit: Optional[int] = None,
    batch_size: int = 500
):
    """
    Migración optimizada para 1M de registros.
    
    Estrategia:
    1. Obtener nombres científicos ÚNICOS (reduce de 1M a ~miles)
    2. Consultar APIs por nombre único (con caché persistente)
    3. Actualizar todos los documentos con ese nombre en un bulk_write
    """
    print("=" * 60)
    print(f"MIGRACIÓN DE NOMBRES COMUNES - {'DRY RUN' if dry_run else 'EJECUCIÓN REAL'}")
    print("=" * 60)
    
    # Conectar a MongoDB con autenticación
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:123123@localhost:27017")
    client = MongoClient(mongo_uri)
    db = client[os.getenv("MONGO_DB", "biogeovis")]
    
    # Cargar caché y progreso
    cache = load_cache()
    progress = load_progress() if resume else {"processed_names": [], "last_update": None}
    processed_set = set(progress.get("processed_names", []))
    
    print(f"[INFO] Caché cargada: {len(cache)} nombres")
    print(f"[INFO] Progreso previo: {len(processed_set)} nombres procesados")
    
    # 1. Obtener nombres científicos únicos SIN NombreComun
    print("\n[PASO 1] Obteniendo nombres científicos únicos...")
    pipeline = [
        {"$match": {"NombreComun": {"$exists": False}}},
        {"$group": {"_id": "$NombreCientifico", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}  # Priorizar los más frecuentes
    ]
    if limit:
        pipeline.append({"$limit": limit})
    
    unique_species = list(db.avistamientos.aggregate(pipeline, allowDiskUse=True))
    
    # Filtrar ya procesados si resume=True
    if resume:
        unique_species = [s for s in unique_species if s["_id"] not in processed_set]
    
    total_unique = len(unique_species)
    total_docs = sum(s["count"] for s in unique_species)
    
    print(f"[INFO] Nombres únicos a procesar: {total_unique}")
    print(f"[INFO] Total documentos afectados: {total_docs}")
    
    if total_unique == 0:
        print("\n✅ No hay registros pendientes de migración.")
        return
    
    # 2. Procesar cada nombre único
    print("\n[PASO 2] Consultando APIs y actualizando...")
    
    operations: List[UpdateMany] = []
    stats = {"found": 0, "not_found": 0, "errors": 0, "docs_updated": 0}
    start_time = time.time()
    
    for i, species in enumerate(unique_species):
        sci_name = species["_id"]
        doc_count = species["count"]
        
        if not sci_name or not sci_name.strip():
            continue
        
        # Obtener nombre común
        common_name = get_common_name(sci_name, cache)
        
        if common_name:
            stats["found"] += 1
            stats["docs_updated"] += doc_count
            operations.append(
                UpdateMany(
                    {"NombreCientifico": sci_name, "NombreComun": {"$exists": False}},
                    {"$set": {"NombreComun": common_name}}
                )
            )
            status = f"✓ {common_name}"
        else:
            stats["not_found"] += 1
            status = "✗ Sin nombre común"
        
        # Log de progreso cada 10 especies o al final
        if (i + 1) % 10 == 0 or i == total_unique - 1:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (total_unique - i - 1) / rate if rate > 0 else 0
            print(f"  [{i+1}/{total_unique}] {sci_name[:40]:<40} -> {status[:30]}")
            print(f"      Velocidad: {rate:.1f} sp/seg | ETA: {eta/60:.1f} min")
        
        # Guardar progreso cada 50 especies
        if (i + 1) % 50 == 0:
            processed_set.add(sci_name)
            progress["processed_names"] = list(processed_set)
            save_progress(progress)
            save_cache(cache)
        
        # Ejecutar batch de operaciones
        if len(operations) >= batch_size:
            if not dry_run:
                try:
                    result = db.avistamientos.bulk_write(operations, ordered=False)
                    print(f"      [BATCH] {result.modified_count} documentos actualizados")
                except Exception as e:
                    print(f"      [BATCH ERROR] {e}")
                    stats["errors"] += 1
            else:
                print(f"      [DRY RUN] {len(operations)} operaciones en batch")
            operations = []
        
        # Rate limiting
        time.sleep(GBIF_DELAY)
    
    # Ejecutar operaciones restantes
    if operations:
        if not dry_run:
            try:
                result = db.avistamientos.bulk_write(operations, ordered=False)
                print(f"\n[FINAL BATCH] {result.modified_count} documentos actualizados")
            except Exception as e:
                print(f"\n[FINAL BATCH ERROR] {e}")
                stats["errors"] += 1
        else:
            print(f"\n[DRY RUN] {len(operations)} operaciones finales")
    
    # Guardar caché y progreso final
    save_cache(cache)
    progress["processed_names"] = list(processed_set)
    save_progress(progress)
    
    # Resumen
    elapsed_total = time.time() - start_time
    print("\n" + "=" * 60)
    print("RESUMEN DE MIGRACIÓN")
    print("=" * 60)
    print(f"Especies procesadas:     {total_unique}")
    print(f"Con nombre común:        {stats['found']} ({100*stats['found']/total_unique:.1f}%)")
    print(f"Sin nombre común:        {stats['not_found']}")
    print(f"Documentos actualizados: {stats['docs_updated']}")
    print(f"Errores:                 {stats['errors']}")
    print(f"Tiempo total:            {elapsed_total/60:.1f} minutos")
    print(f"Caché guardada en:       {CACHE_FILE}")
    
    if dry_run:
        print("\n⚠️  MODO DRY RUN - No se modificaron datos")
        print("   Ejecuta con --execute para aplicar cambios")


def create_index():
    """Crear índice para NombreComun."""
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:123123@localhost:27017")
    client = MongoClient(mongo_uri)
    db = client[os.getenv("MONGO_DB", "biogeovis")]
    
    print("[INDEX] Creando índice para NombreComun...")
    try:
        db.avistamientos.create_index("NombreComun", background=True)
        db.avistamientos.create_index(
            [("NombreComun", 1), ("NombreCientifico", 1)],
            background=True,
            name="idx_common_scientific"
        )
        print("[INDEX] ✓ Índices creados exitosamente")
    except Exception as e:
        print(f"[INDEX] Error: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrar nombres comunes a avistamientos")
    parser.add_argument("--execute", action="store_true", help="Ejecutar migración real (sin esto es dry run)")
    parser.add_argument("--resume", action="store_true", help="Continuar desde progreso guardado")
    parser.add_argument("--limit", type=int, help="Limitar a N especies únicas")
    parser.add_argument("--create-index", action="store_true", help="Solo crear índices")
    
    args = parser.parse_args()
    
    if args.create_index:
        create_index()
    else:
        migrate_common_names(
            dry_run=not args.execute,
            resume=args.resume,
            limit=args.limit
        )
