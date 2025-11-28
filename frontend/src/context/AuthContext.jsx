import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getToken, logout as logoutService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Verificar si hay un usuario logueado al cargar la app
    const checkAuth = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            // Intentar obtener el usuario actual desde el backend
            const userData = await getCurrentUser();
            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            // Si hay error, limpiar el estado
            setUser(null);
            setIsAuthenticated(false);
            logoutService();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Función para actualizar el usuario después del login
    const login = useCallback((userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    }, []);

    // Función para cerrar sesión
    const logout = useCallback(() => {
        logoutService();
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    // Función para refrescar los datos del usuario
    const refreshUser = useCallback(async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Error refrescando usuario:', error);
        }
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
