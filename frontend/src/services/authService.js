const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const register = async (userData) => {
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al registrar usuario');
        }

        return data;
    } catch (error) {
        console.error('Error en registro:', error);
        throw error;
    }
};

export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al iniciar sesión');
        }

        // Guardar el token en localStorage
        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
        }

        return data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('access_token');
};

export const getToken = () => {
    return localStorage.getItem('access_token');
};

export const isAuthenticated = () => {
    return !!getToken();
};

export const getCurrentUser = async () => {
    try {
        const token = getToken();

        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        const response = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            // Si el token es inválido, cerrar sesión
            if (response.status === 401) {
                logout();
            }
            throw new Error(data.detail || 'Error al obtener usuario');
        }

        return data;
    } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        throw error;
    }
};

export const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();

    if (!token) {
        throw new Error('No hay token de autenticación');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
    };

    return fetch(url, { ...options, headers });
};

export default {
    register,
    login,
    logout,
    getToken,
    isAuthenticated,
    getCurrentUser,
    authenticatedFetch,
};
