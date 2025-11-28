"""
Script de prueba para el sistema de autenticación
Ejecuta: python test_auth.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_register():
    """Probar registro de usuario"""
    print("\n🔵 Probando registro de usuario...")
    
    data = {
        "username": "testuser123",
        "email": "test@ejemplo.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "User",
        "age": 25
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
        
        if response.status_code == 201:
            print("Usuario registrado exitosamente")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"Error al registrar: {response.status_code}")
            print(response.json())
            return False
    except Exception as e:
        print(f"Error de conexión: {e}")
        return False


def test_login():
    """Probar inicio de sesión"""
    print("\nProbando inicio de sesión...")
    
    data = {
        "email": "test@ejemplo.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=data)
        
        if response.status_code == 200:
            print("Login exitoso")
            result = response.json()
            print(f"Token: {result['access_token'][:50]}...")
            return result['access_token']
        else:
            print(f"Error al hacer login: {response.status_code}")
            print(response.json())
            return None
    except Exception as e:
        print(f"Error de conexión: {e}")
        return None


def test_get_current_user(token):
    """Probar obtener usuario actual"""
    print("\nProbando obtener usuario actual...")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        if response.status_code == 200:
            print("Usuario obtenido exitosamente")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"Error al obtener usuario: {response.status_code}")
            print(response.json())
            return False
    except Exception as e:
        print(f"Error de conexión: {e}")
        return False


def test_health():
    """Probar que el servidor esté corriendo"""
    print("\nVerificando servidor...")
    
    try:
        response = requests.get(f"{BASE_URL}/")
        
        if response.status_code == 200:
            print("Servidor corriendo")
            return True
        else:
            print(f"Error del servidor: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error de conexión: {e}")
        print("Asegúrate de que el backend esté corriendo en http://localhost:8000")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("TEST DEL SISTEMA DE AUTENTICACIÓN")
    print("=" * 60)
    
    # Verificar servidor
    if not test_health():
        exit(1)
    
    # Probar registro
    register_success = test_register()
    
    # Probar login
    token = test_login()
    
    if token:
        # Probar obtener usuario actual
        test_get_current_user(token)
    
    print("\n" + "=" * 60)
    print("Tests completados" if register_success and token else "Algunos tests fallaron")
    print("=" * 60)
