# BioGeoVis

Panel interactivo para explorar avistamientos de biodiversidad, combinar filtros avanzados y obtener analíticas accionables. El proyecto está dividido en un backend FastAPI + MongoDB y un frontend React/Vite con visualizaciones (VisX, Globe, Leaflet).

## Características destacadas
- **Explorer 3D + mapa 2D:** render de avistamientos con información taxonómica enriquecida.
- **Filtros persistentes:** los filtros avanzados se guardan en `sessionStorage` y se reutilizan en Analytics.
- **Analytics dimension-aware:** KPIs, rankings y series cambian según la dimensión activa (especie, familia, orden, ubicación).
- **Drawer de detalle:** cada tarjeta de analytics expone “Ver detalles” con buckets, muestras ejemplo y acciones para saltar a Explorer o exportar CSV.
- **Seed de datos automatizado:** scripts de inicialización en `backend/database/init` para poblar Mongo al levantar via Docker.

## Estructura del repositorio
```
BioGeoVis/
├─ backend/             # FastAPI, modelos Pydantic y agregaciones de analytics
│  ├─ app/
│  ├─ database/         # Datos semilla y scripts de inicialización
│  └─ requirements.txt
├─ frontend/            # React + Vite + VisX + Globe.gl
│  ├─ src/
│  └─ package.json
├─ mongo_data/          # Volumen persistente para Mongo (usado por docker-compose)
└─ docker-compose.yml
```

## Requisitos
- Node.js ≥ 18 y npm ≥ 9
- Python ≥ 3.10
- Docker + Docker Compose (opcional pero recomendado)
- MongoDB 7 si decides correr la base fuera de Docker

## Variables de entorno
| Servicio  | Variable      | Descripción |
|-----------|---------------|-------------|
| Backend   | `MONGO_URI`   | Cadena de conexión hacia MongoDB (por defecto `mongodb://localhost:27017`). |
| Backend   | `MONGO_DB`    | Nombre de la base de datos (`biogeovis`). |
| Frontend  | `BASE_URL`    | Actualmente se define en `frontend/src/services/api.js` (`http://localhost:8000`). Ajusta si el backend corre en otra URL/puerto. |

Para despliegues crea un archivo `.env` o exporta las variables antes de iniciar cada servicio.

## Puesta en marcha rápida

### 1) Con Docker Compose
```bash
docker compose up --build
```
Esto levanta:
- MongoDB (`27017`), aplicando los scripts de `backend/database/init`.
- Backend FastAPI en `http://localhost:8000`.
- (Opcional) Mongo Express en `http://localhost:8081` para inspeccionar datos.

> El servicio de frontend está comentado en `docker-compose.yml`. Puedes habilitarlo si deseas empaquetar todo en contenedores.

### 2) Manual (local)

#### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # PowerShell en Windows
pip install -r requirements.txt
set MONGO_URI=mongodb://localhost:27017
set MONGO_DB=biogeovis
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Si necesitas datos locales, levanta Mongo con Docker (`docker compose up mongo`) o importa los JSON de `backend/database/` manualmente.

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
La app quedará disponible en `http://localhost:5173`. El servicio espera que el backend corra en `http://localhost:8000`.

## Flujo de Analytics + Detalles
1. **Explorer**: configura filtros (taxonomía, fechas, país, etc.). Se guardan en `sessionStorage`.
2. **Analytics**: reutiliza los filtros persistidos y permite cambiar la dimensión principal (especie/familia/orden/ubicación). Los KPIs y rankings responden en tiempo real.
3. **Ver detalles**: abre un drawer con buckets, ejemplos y acciones:
	- Exportar CSV del dataset mostrado.
	- “Explorar en Explorer” añade el bucket como filtro adicional y navega al módulo Explorer con `?ref=analytics`.
4. **Endpoint de detalle** (`POST /api/analytics/detail`): devuelve conteos + muestras por bucket para cualquier gráfica (fauna, tipo, ranking, temporal y densidad geográfica).

## Scripts útiles
| Comando | Ubicación | Descripción |
|---------|-----------|-------------|
| `npm run dev` | `frontend/` | Servidor Vite con HMR. |
| `npm run build` | `frontend/` | Build de producción. |
| `npm run lint` | `frontend/` | ESLint + reglas React Hooks. |
| `uvicorn app.main:app --reload` | `backend/` | API FastAPI con recarga automática. |

## Próximos pasos sugeridos
- Ajustar `BASE_URL` para entornos de producción (ej. variables `import.meta.env.VITE_API_URL`).
- Añadir pruebas automatizadas (PyTest para backend, Vitest/RTL para frontend).
- Crear pipelines (GitHub Actions) para lint + build.

---
Si encuentras problemas al seguir esta guía abre un issue o documenta el comando exacto que falló para poder reproducirlo.
