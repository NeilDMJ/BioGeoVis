### **1: Colocar el archivo de datos**

El archivo `avistamientos_mongodb.json` debe estar en:
```
backend/database/avistamientos_mongodb.json
```

### **Paso 2: Iniciar los contenedores**

```bash
docker compose up -d
```

### **Paso 3: Cargar los datos**

```bash
# Copiar el script de carga al contenedor
docker cp backend/app/load_data.py biogeovis-backend:/app/app/load_data.py

# Copiar datos al contenedor
docker cp backend/database/avistamientos_mongodb.json biogeovis-backend:/app/database/avistamientos_mongodb.json

# Ejecutar la carga
docker exec -it biogeovis-backend python /app/app/load_data.py
```

Abre http://localhost:8081 (Login: `admin` / `123123`)
