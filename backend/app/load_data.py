#!/usr/bin/env python3
from pymongo import MongoClient
import json
from datetime import datetime
import sys
import os

# Configuración de MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:123123@localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "biogeovis")
COLLECTION_NAME = "avistamientos"

# Ruta del archivo de datos (absoluta o relativa al script)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "database", "avistamientos_mongodb.json")


def connect_to_mongo():
    """Conectar a MongoDB y retornar la colección."""
    try:
        print(f"Conectando a MongoDB: {MONGO_URI}")
        client = MongoClient(MONGO_URI)
        
        # Verificar conexión
        client.admin.command('ping')
        print("Conexión exitosa")
        
        db = client[MONGO_DB]
        collection = db[COLLECTION_NAME]
        
        return collection, client
    except Exception as e:
        print(f"Error conectando: {e}")
        sys.exit(1)


def load_json_data(file_path):
    """Cargar datos desde archivo JSON."""
    try:
        print(f"\nCargando datos desde: {file_path}")
        
        if not os.path.exists(file_path):
            print(f"Error: El archivo {file_path} no existe")
            sys.exit(1)
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"Archivo cargado: {len(data)} registros encontrados")
        return data
    except json.JSONDecodeError as e:
        print(f"Error al parsear JSON: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error leyendo archivo: {e}")
        sys.exit(1)


def transform_data(data):
    """Transformar datos para que coincidan con el esquema de MongoDB."""
    print("\nTransformando datos...")
    transformed = []
    errors = []
    
    for idx, item in enumerate(data):
        try:
            # Convertir FechaEvento de string a datetime si es necesario
            if "FechaEvento" in item:
                if isinstance(item["FechaEvento"], str):
                    # Intentar varios formatos de fecha
                    fecha_str = item["FechaEvento"]
                    try:
                        # Formato ISO: 2024-03-15T10:30:00Z
                        item["FechaEvento"] = datetime.fromisoformat(fecha_str.replace("Z", "+00:00"))
                    except:
                        try:
                            # Formato simple: 2024-03-15
                            item["FechaEvento"] = datetime.strptime(fecha_str, "%Y-%m-%d")
                        except:
                            try:
                                # Formato con hora: 2024-03-15 10:30:00
                                item["FechaEvento"] = datetime.strptime(fecha_str, "%Y-%m-%d %H:%M:%S")
                            except:
                                print(f"Advertencia: No se pudo convertir fecha en registro {idx}: {fecha_str}")
                                item["FechaEvento"] = datetime.now()
            
            # Validar campos requeridos
            required_fields = ["Taxonomia", "Ubicacion", "FechaEvento", "NombreCientifico"]
            missing_fields = [field for field in required_fields if field not in item]
            
            if missing_fields:
                errors.append(f"Registro {idx}: Faltan campos {missing_fields}")
                continue
            
            # Convertir coordenadas a float si son string
            if "Ubicacion" in item and "Geolocalizacion" in item["Ubicacion"]:
                geo = item["Ubicacion"]["Geolocalizacion"]
                if "Latitud" in geo:
                    geo["Latitud"] = float(geo["Latitud"])
                if "Longitud" in geo:
                    geo["Longitud"] = float(geo["Longitud"])
            
            transformed.append(item)
            
        except Exception as e:
            errors.append(f"Registro {idx}: {str(e)}")
    
    if errors:
        print(f"\nSe encontraron {len(errors)} errores:")
        for error in errors[:10]:  # Mostrar solo los primeros 10
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... y {len(errors) - 10} errores más")
    
    print(f"Datos transformados: {len(transformed)}/{len(data)} registros válidos")
    return transformed


def insert_data(collection, data, batch_size=1000):
    """Insertar datos en MongoDB en lotes."""
    print(f"\nInsertando datos en MongoDB (lotes de {batch_size})...")
    total = len(data)
    inserted_count = 0
    
    try:
        for i in range(0, total, batch_size):
            batch = data[i:i + batch_size]
            result = collection.insert_many(batch, ordered=False)
            inserted_count += len(result.inserted_ids)
            
            # Mostrar progreso
            progress = (i + len(batch)) / total * 100
            print(f"   Progreso: {inserted_count}/{total} ({progress:.1f}%)")
        
        print(f"\nInserción completada: {inserted_count} documentos insertados")
        return inserted_count
        
    except Exception as e:
        print(f"Error durante la inserción: {e}")
        print(f"Documentos insertados antes del error: {inserted_count}")
        return inserted_count


def get_collection_stats(collection):
    """Obtener estadísticas de la colección."""
    print("\nEstadísticas de la colección:")
    count = collection.count_documents({})
    print(f"Total de documentos: {count}")

    if count > 0:
        # Obtener un documento de ejemplo
        sample = collection.find_one()
        print(f"Ejemplo de documento:")
        print(f"- Nombre Científico: {sample.get('NombreCientifico', 'N/A')}")
        print(f"- País: {sample.get('Ubicacion', {}).get('Pais', 'N/A')}")
        print(f"- Fecha: {sample.get('FechaEvento', 'N/A')}")


def main():
    """Función principal."""
    print("=" * 60)
    print("Iniciando carga de datos a MongoDB")
    print("=" * 60)
    
    # 1. Conectar a MongoDB
    collection, client = connect_to_mongo()
    
    # 2. Preguntar si quiere limpiar la colección primero
    print(f"\nLa colección '{COLLECTION_NAME}' actualmente tiene {collection.count_documents({})} documentos")
    respuesta = input("¿Desea eliminar los datos existentes antes de cargar? (s/N): ").lower()
    
    if respuesta == 's':
        collection.delete_many({})
        print("Colección limpiada")
    
    # 3. Cargar datos del archivo
    data = load_json_data(DATA_FILE)
    
    # 4. Transformar datos
    transformed_data = transform_data(data)
    
    if not transformed_data:
        print("\nNo hay datos válidos para insertar")
        client.close()
        sys.exit(1)
    
    # 5. Insertar datos
    inserted = insert_data(collection, transformed_data)
    
    # 6. Mostrar estadísticas
    get_collection_stats(collection)
    
    # 7. Cerrar conexión
    client.close()
    print("\n" + "=" * 60)
    print("Proceso completado exitosamente")
    print("=" * 60)


if __name__ == "__main__":
    main()
