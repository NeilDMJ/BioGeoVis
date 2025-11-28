const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ==================== Validaciones ====================

/**
 * Valida el formato de email
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
        return { isValid: false, message: 'El correo electrónico es requerido' };
    }
    if (!emailRegex.test(email.trim())) {
        return { isValid: false, message: 'Ingresa un correo electrónico válido' };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida la contraseña según los requisitos de seguridad
 */
export const validatePassword = (password) => {
    if (!password) {
        return { isValid: false, message: 'La contraseña es requerida' };
    }
    if (password.length < 8) {
        return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos una mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos una minúscula' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos un número' };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida un campo de nombre (nombre o apellido)
 */
export const validateName = (name, fieldName = 'El nombre') => {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    if (!name || !name.trim()) {
        return { isValid: false, message: `${fieldName} es requerido` };
    }
    if (name.trim().length < 2) {
        return { isValid: false, message: `${fieldName} debe tener al menos 2 caracteres` };
    }
    if (!nameRegex.test(name.trim())) {
        return { isValid: false, message: `${fieldName} solo puede contener letras y espacios` };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida el nombre de usuario
 */
export const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!username || !username.trim()) {
        return { isValid: false, message: 'El nombre de usuario es requerido' };
    }
    if (username.trim().length < 5) {
        return { isValid: false, message: 'El nombre de usuario debe tener al menos 5 caracteres' };
    }
    if (username.trim().length > 20) {
        return { isValid: false, message: 'El nombre de usuario no puede exceder 20 caracteres' };
    }
    if (!usernameRegex.test(username.trim())) {
        return { isValid: false, message: 'El nombre de usuario solo puede contener letras, números y guiones bajos' };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida que las contraseñas coincidan
 */
export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) {
        return { isValid: false, message: 'Debes confirmar tu contraseña' };
    }
    if (password !== confirmPassword) {
        return { isValid: false, message: 'Las contraseñas no coinciden' };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida la edad (opcional)
 */
export const validateAge = (age) => {
    if (!age && age !== 0) {
        return { isValid: true, message: '' }; // Edad es opcional
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0) {
        return { isValid: false, message: 'La edad no puede ser negativa' };
    }
    if (ageNum < 10 || ageNum > 85 ) {
        return { isValid: false, message: 'La edad debe ser un número entre 10 y 100' };
    }
    return { isValid: true, message: '' };
};

/**
 * Valida todos los campos del formulario de registro
 */
export const validateRegisterForm = (formData) => {
    const errors = {};
    
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) errors.username = usernameValidation.message;
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) errors.email = emailValidation.message;
    
    const firstNameValidation = validateName(formData.firstName, 'El nombre');
    if (!firstNameValidation.isValid) errors.firstName = firstNameValidation.message;
    
    const lastNameValidation = validateName(formData.lastName, 'El apellido');
    if (!lastNameValidation.isValid) errors.lastName = lastNameValidation.message;
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) errors.password = passwordValidation.message;
    
    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (!confirmPasswordValidation.isValid) errors.confirmPassword = confirmPasswordValidation.message;
    
    const ageValidation = validateAge(formData.age);
    if (!ageValidation.isValid) errors.age = ageValidation.message;
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Valida todos los campos del formulario de login
 */
export const validateLoginForm = (formData) => {
    const errors = {};
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) errors.email = emailValidation.message;
    
    if (!formData.password || !formData.password.trim()) {
        errors.password = 'La contraseña es requerida';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ==================== Servicios de Autenticación ====================

export const register = async (userData) => {
    try {
        console.log('[AuthService] Intentando registro en:', `${API_URL}/api/auth/register`);
        
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

        return {
            success: true,
            user: data
        };
    } catch (error) {
        console.error('Error en registro:', error);
        // Mejorar mensaje de error para problemas de conexión
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        }
        throw error;
    }
};

export const login = async (email, password) => {
    try {
        console.log('[AuthService] Intentando login en:', `${API_URL}/api/auth/login`);
        
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

        // Obtener los datos del usuario después del login
        const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access_token}`,
            },
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
            throw new Error('Error al obtener datos del usuario');
        }

        // Guardar datos del usuario en localStorage
        localStorage.setItem('user_data', JSON.stringify(userData));

        return {
            success: true,
            token: data.access_token,
            user: userData
        };
    } catch (error) {
        console.error('Error en login:', error);
        // Mejorar mensaje de error para problemas de conexión
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        }
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
};

export const getToken = () => {
    return localStorage.getItem('access_token');
};

export const isAuthenticated = () => {
    return !!getToken();
};

/**
 * Obtiene los datos del usuario desde localStorage (sin llamada al servidor)
 */
export const getStoredUser = () => {
    try {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    } catch {
        return null;
    }
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
    getStoredUser,
    authenticatedFetch,
    validateEmail,
    validatePassword,
    validateName,
    validateUsername,
    validateConfirmPassword,
    validateAge,
    validateRegisterForm,
    validateLoginForm,
};
