# 📋 Guía de Migración: Campo NombreComun

## 📌 Resumen de Cambios

Esta migración agrega el campo **`NombreComun`** (nombre común/vernáculo) a los documentos de avistamientos. Este campo permite buscar especies por su nombre popular además del nombre científico.

**Los nombres comunes se obtienen automáticamente de las APIs de GBIF e iNaturalist.**

---

## PROCESO DE MIGRACIÓN PASO A PASO

### Requisitos Previos
- Python 3.8+
- Acceso a MongoDB (local o Atlas)
- Conexión a internet (para consultar GBIF e iNaturalist)

---

### PASO 1: Actualizar el Código

Asegúrate de tener el código más reciente del branch `main`:

```bash
git pull origin main
```

Verifica que existan estos archivos:
- `backend/app/migrate_common_names.py` ← Script de migración
- `backend/app/models.py` ← Modelo actualizado
- `backend/database/init/02_apply_avistamientos_schema.js` ← Esquema actualizado

---

### PASO 2: Configurar la Conexión a MongoDB

#### Opción A: MongoDB Local (Docker)
```bash
# Las variables ya están configuradas por defecto:
# MONGO_URI=mongodb://admin:123123@localhost:27017
# MONGO_DB=biogeovis
```

#### Opción B: MongoDB Atlas
```bash
# Exporta las variables de entorno con tu conexión:
export MONGO_URI="mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority"
export MONGO_DB="biogeovis"
```

---

### PASO 3: Actualizar el Esquema de la Base de Datos

#### Si usas Docker (desarrollo local):
```bash
# Reconstruir contenedores (aplica el nuevo esquema automáticamente)
docker compose down
docker compose up --build -d
```

#### Si usas MongoDB Atlas:
Ejecuta este script en `mongosh` conectado a Atlas:

```javascript
use biogeovis;

const avistamientosSchema = {
    bsonType: "object",
    required: ["Taxonomia", "Ubicacion", "FechaEvento", "NombreCientifico"],
    properties: {
        Taxonomia: {
            bsonType: "object",
            required: ["Reino", "Filo", "Clase", "Orden", "Familia", "Genero", "Especie"],
            properties: {
                Reino: { bsonType: "string" },
                Filo: { bsonType: "string" },
                Clase: { bsonType: "string" },
                Orden: { bsonType: "string" },
                Familia: { bsonType: "string" },
                Genero: { bsonType: "string" },
                Especie: { bsonType: "string" }
            }
        },
        Ubicacion: {
            bsonType: "object",
            required: ["Pais", "Geolocalizacion"],
            properties: {
                Pais: { bsonType: "string" },
                Geolocalizacion: {
                    bsonType: "object",
                    required: ["Latitud", "Longitud"],
                    properties: {
                        Latitud: { bsonType: "number" },
                        Longitud: { bsonType: "number" }
                    }
                }
            }
        },
        FechaEvento: { bsonType: "date" },
        NombreCientifico: { bsonType: "string" },
        NombreComun: { bsonType: "string" }  // ← NUEVO CAMPO
    }
};

db.runCommand({
    collMod: "avistamientos",
    validator: { $jsonSchema: avistamientosSchema },
    validationLevel: "moderate",
    validationAction: "warn"
});

print("✅ Esquema actualizado");
```

---

### PASO 4: Ejecutar la Migración de Datos

El script `migrate_common_names.py` consulta GBIF e iNaturalist para obtener los nombres comunes de cada especie y actualiza todos los documentos.

#### 4.1 Instalar dependencias (si no las tienes):
```bash
pip install pymongo requests
```

#### 4.2 Ejecutar en modo DRY RUN (prueba sin modificar datos):
```bash
cd backend/app
python migrate_common_names.py
```

Esto te mostrará:
- Cuántas especies únicas hay
- Cuántos documentos se actualizarían
- Ejemplos de nombres encontrados

#### 4.3 Ejecutar la migración REAL:
```bash
# Migración completa (puede tomar varias horas para 1M de registros)
python migrate_common_names.py --execute
```

#### 4.4 Si la migración se interrumpe, continúa desde donde quedó:
```bash
python migrate_common_names.py --execute --resume
```

#### 4.5 Para probar con pocas especies primero:
```bash
# Solo las primeras 100 especies
python migrate_common_names.py --execute --limit 100
```

---

### PASO 5: Crear Índices (Importante para rendimiento)

```bash
python migrate_common_names.py --create-index
```

O manualmente en MongoDB:
```javascript
db.avistamientos.createIndex({ "NombreComun": 1 }, { sparse: true });
db.avistamientos.createIndex(
    { "NombreComun": 1, "NombreCientifico": 1 },
    { name: "idx_common_scientific" }
);
```

---

### PASO 6: Verificar la Migración

```javascript
// Contar documentos con NombreComun
db.avistamientos.countDocuments({ NombreComun: { $exists: true, $ne: null } });

// Ver ejemplos
db.avistamientos.find(
    { NombreComun: { $exists: true } },
    { NombreCientifico: 1, NombreComun: 1, _id: 0 }
).limit(10);

// Buscar una especie
db.avistamientos.findOne({ NombreComun: /monarca/i });
```

---

##  Ejemplo de Salida del Script

```
============================================================
MIGRACIÓN DE NOMBRES COMUNES - EJECUCIÓN REAL
============================================================
[INFO] Caché cargada: 0 nombres
[INFO] Progreso previo: 0 nombres procesados

[PASO 1] Obteniendo nombres científicos únicos...
[INFO] Nombres únicos a procesar: 15,234
[INFO] Total documentos afectados: 1,111,972

[PASO 2] Consultando APIs y actualizando...
  [10/15234] Danaus plexippus                    -> ✓ Mariposa Monarca
      Velocidad: 2.1 sp/seg | ETA: 120.5 min
  [20/15234] Panthera onca                       -> ✓ Jaguar
      Velocidad: 2.0 sp/seg | ETA: 125.3 min
  ...

============================================================
RESUMEN DE MIGRACIÓN
============================================================
Especies procesadas:     15,234
Con nombre común:        12,456 (81.8%)
Sin nombre común:        2,778
Documentos actualizados: 909,828
Errores:                 0
Tiempo total:            127.3 minutos
Caché guardada en:       backend/database/common_names_cache.json
```

---

##  Archivos Generados por la Migración

| Archivo | Descripción |
|---------|-------------|
| `backend/database/common_names_cache.json` | Caché de nombres comunes (evita repetir consultas) |
| `backend/database/migration_progress.json` | Progreso de migración (para continuar si falla) |

**IMPORTANTE:** Estos archivos se pueden compartir entre compañeros para evitar consultar las APIs nuevamente.

---

##  Cambios en el Modelo de Datos

### Antes (esquema original) 
```javascript
{
  "_id": ObjectId,
  "Taxonomia": {
    "Reino": String,
    "Filo": String,
    "Clase": String,
    "Orden": String,
    "Familia": String,
    "Genero": String,
    "Especie": String
  },
  "Ubicacion": {
    "Pais": String,
    "Geolocalizacion": {
      "Latitud": Number,
      "Longitud": Number
    }
  },
  "FechaEvento": Date,
  "NombreCientifico": String
}
```

### Después 
```javascript
{
  "_id": ObjectId,
  "Taxonomia": {
    "Reino": String,
    "Filo": String,
    "Clase": String,
    "Orden": String,
    "Familia": String,
    "Genero": String,
    "Especie": String
  },
  "Ubicacion": {
    "Pais": String,
    "Geolocalizacion": {
      "Latitud": Number,
      "Longitud": Number
    }
  },
  "FechaEvento": Date,
  "NombreCientifico": String,
  "NombreComun": String  
}
```

### Características del nuevo campo
- **Nombre**: `NombreComun`
- **Tipo**: `String`
- **Requerido**: No (opcional)
- **Descripción**: Nombre común o vernáculo de la especie
- **Fuente**: APIs de GBIF e iNaturalist

---

## Archivos Modificados

| Archivo | Descripción |
|---------|-------------|
| `backend/app/models.py` | Modelo Pydantic con `NombreComun: Optional[str] = None` |
| `backend/app/main.py` | Endpoints de API actualizados para filtrar por NombreComun |
| `backend/app/migrate_common_names.py` | **Script de migración automática** |
| `backend/database/init/02_apply_avistamientos_schema.js` | Esquema MongoDB actualizado |

---

## Notas Importantes

1. **El campo NombreComun es OPCIONAL**: Los documentos existentes sin este campo seguirán siendo válidos.

2. **La migración toma tiempo**: Para ~1 millón de registros, espera ~2 horas.

3. **Puedes pausar y continuar**: Usa `--resume` si se interrumpe.

4. **Caché reutilizable**: El archivo `common_names_cache.json` se puede compartir para evitar repetir consultas.

5. **Backup**: Siempre haz un backup antes de modificar:
   ```bash
   mongodump --uri="mongodb+srv://..." --out=./backup_$(date +%Y%m%d)
   ```

---

