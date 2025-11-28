import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { 
    register, 
    login,
    validateRegisterForm, 
    validateUsername, 
    validateEmail, 
    validateName, 
    validatePassword,
    validateConfirmPassword,
    validateAge
} from '../services/authService';
import { useAuth } from '../context/AuthContext';
import AuthSuccessModal from '../components/AuthSuccessModal';
import UserNavMenu from '../components/UserNavMenu';
import './Register.css';

const NAV_LINKS = [
    { id: 'home', label: 'Inicio', to: '/home' },
    { id: 'explorer', label: 'Explorer', to: '/explorer' },
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard' },
    { id: 'analisis', label: 'Análisis', to: '/analisis' }
];

const ROLE_OPTIONS = [
    { value: 'investigador', label: 'Investigador/a' },
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'institucional', label: 'Representante institucional' },
    { value: 'colaborador', label: 'Colaborador externo' }
];

const Register = () => {
    const navigate = useNavigate();
    const { login: authLogin, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        age: '',
    });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ message: '', tone: 'muted' });
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [registeredUser, setRegisteredUser] = useState(null);

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const blocks = document.querySelectorAll('.scroll-animate');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.4 });

        blocks.forEach((block) => observer.observe(block));
        return () => observer.disconnect();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setFormData((prev) => ({
            ...prev,
            [name]: newValue
        }));
        
        // Limpiar error del campo al escribir
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
        setStatus({ message: '', tone: 'muted' });
    };

    // Validación en tiempo real al salir del campo
    const handleBlur = (e) => {
        const { name, value } = e.target;
        let validation = { isValid: true, message: '' };

        switch (name) {
            case 'username':
                validation = validateUsername(value);
                break;
            case 'email':
                validation = validateEmail(value);
                break;
            case 'firstName':
                validation = validateName(value, 'El nombre');
                break;
            case 'lastName':
                validation = validateName(value, 'El apellido');
                break;
            case 'password':
                validation = validatePassword(value);
                break;
            case 'confirmPassword':
                validation = validateConfirmPassword(formData.password, value);
                break;
            case 'age':
                validation = validateAge(value);
                break;
            default:
                break;
        }

        if (!validation.isValid) {
            setErrors((prev) => ({ ...prev, [name]: validation.message }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar formulario completo
        const validation = validateRegisterForm(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            setStatus({ message: 'Por favor corrige los errores en el formulario.', tone: 'error' });
            return;
        }

        setSubmitting(true);
        setStatus({ message: 'Registrando usuario...', tone: 'muted' });
        setErrors({});

        try {
            // Preparar datos para el backend
            const userData = {
                username: formData.username.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                age: formData.age ? parseInt(formData.age) : null,
            };

            // Llamar al servicio de registro
            const registerResponse = await register(userData);

            // Hacer login automático después del registro
            const loginResponse = await login(formData.email, formData.password);
            
            // Guardar usuario en el contexto
            authLogin(loginResponse.user);
            setRegisteredUser(loginResponse.user);

            setStatus({
                message: '¡Registro exitoso!',
                tone: 'success'
            });

            // Mostrar modal de éxito
            setShowSuccessModal(true);

        } catch (error) {
            setStatus({
                message: error.message || 'Error al registrar usuario. Intenta nuevamente.',
                tone: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        navigate('/dashboard');
    };

    // Verificar si el formulario es válido para habilitar el botón
    const isFormValid = 
        formData.username && 
        formData.email && 
        formData.password && 
        formData.confirmPassword && 
        formData.firstName && 
        formData.lastName &&
        Object.keys(errors).every(key => !errors[key]);

    return (
        <div className="register-page">
            <header className="home__nav about__nav login__nav" aria-label="Navegación principal">
                <div className="home__logo">BioGeoVis</div>
                <nav className="home__nav-links">
                    {NAV_LINKS.map((link) => (
                        <Link key={link.id} to={link.to} className="home__nav-link">
                            {link.label}
                        </Link>
                    ))}
                    <UserNavMenu />
                </nav>
            </header>

            <main className="register-shell">
                <section className="register-hero scroll-animate" aria-label="Resumen de registro">
                    <div>
                        <p className="eyebrow">Alta guiada</p>
                        <h1>Solicita acceso con credenciales verificables.</h1>
                        <p className="lead">
                            Necesitamos asegurarnos de que los datos sensibles se utilicen dentro de proyectos avalados.
                        </p>
                        <ul className="register-hero__steps">
                            <li>1. Completa el formulario con tu correo institucional.</li>
                            <li>2. Describe en qué proyecto o curso emplearás BioGeoVis.</li>
                            <li>3. Firma las políticas de uso responsable y confirma tu bandeja.</li>
                        </ul>
                        <div className="register-hero__cta">
                            <Button as={Link} to="/about" variant="outline-light">
                                Leer misión completa
                            </Button>
                            <Button as={Link} to="/login" variant="primary">
                                Ya tengo cuenta
                            </Button>
                        </div>
                    </div>
                    <div className="register-hero__status">
                        <article>
                            <span>Solicitudes aprobadas</span>
                            <strong>92%</strong>
                            <p>Cuando incluyen correo institucional válido.</p>
                        </article>
                    </div>
                </section>

                <section className="register-grid">
                    <article className="register-card scroll-animate" aria-label="Formulario de registro">
                        <header className="register-card__header">
                            <h2>Formulario de registro</h2>
                            <p>Completa todos los campos para crear tu cuenta.</p>
                        </header>

                        {status.message && (
                            <div className={`register-status ${status.tone}`} role="status">
                                {status.message}
                            </div>
                        )}

                        <Form onSubmit={handleSubmit} noValidate>
                            <Form.Group controlId="username" className="mb-3">
                                <Form.Label>Nombre de usuario*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="usuario123"
                                    disabled={submitting}
                                    minLength={5}
                                    maxLength={20}
                                    isInvalid={!!errors.username}
                                />
                                {errors.username ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.username}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Entre 5 y 20 caracteres, solo letras, números y guiones bajos
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label>Correo electrónico*</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="usuario@ejemplo.com"
                                    disabled={submitting}
                                    isInvalid={!!errors.email}
                                />
                                {errors.email ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Ingresa un correo electrónico válido
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="firstName" className="mb-3">
                                <Form.Label>Nombre*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Tu nombre"
                                    disabled={submitting}
                                    minLength={2}
                                    maxLength={50}
                                    isInvalid={!!errors.firstName}
                                />
                                {errors.firstName ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.firstName}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Mínimo 2 caracteres, solo letras
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="lastName" className="mb-3">
                                <Form.Label>Apellido*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="Tu apellido"
                                    disabled={submitting}
                                    minLength={2}
                                    maxLength={50}
                                    isInvalid={!!errors.lastName}
                                />
                                {errors.lastName ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.lastName}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Mínimo 2 caracteres, solo letras
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="age" className="mb-3">
                                <Form.Label>Edad (opcional)</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={(e) => {
                                        // Limitar a máximo 3 dígitos
                                        const value = e.target.value;
                                        if (value.length <= 3) {
                                            handleChange(e);
                                        }
                                    }}
                                    onBlur={handleBlur}
                                    placeholder="18"
                                    disabled={submitting}
                                    min={0}
                                    max={100}
                                    maxLength={3}
                                    onKeyDown={(e) => {
                                        // Prevenir el signo menos y notación científica
                                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                            e.preventDefault();
                                        }
                                        // Prevenir si ya hay 3 dígitos y no es tecla de control
                                        const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key);
                                        if (e.target.value.length >= 2 && !isControlKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                    isInvalid={!!errors.age}
                                />
                                {errors.age ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.age}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Edad entre 10 y 85 años
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="password" className="mb-3">
                                <Form.Label>Contraseña*</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    minLength={8}
                                    isInvalid={!!errors.password}
                                />
                                {errors.password ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.password}
                                    </Form.Control.Feedback>
                                ) : (
                                    <Form.Text className="text-muted">
                                        Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group controlId="confirmPassword" className="mb-4">
                                <Form.Label>Confirmar contraseña*</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    isInvalid={!!errors.confirmPassword}
                                />
                                {errors.confirmPassword && (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.confirmPassword}
                                    </Form.Control.Feedback>
                                )}
                            </Form.Group>

                            <Button type="submit" className="register-submit" disabled={submitting || !isFormValid}>
                                {submitting ? 'Registrando...' : 'Crear cuenta'}
                            </Button>

                            <div className="register-card__footer">
                                <span>¿Ya tienes cuenta?</span>
                                <Link to="/login" className="register-link">Iniciar sesión</Link>
                            </div>
                        </Form>
                    </article>

                    <aside className="register-support scroll-animate" aria-label="Ayuda y proceso">
                        <h3>Proceso de verificación</h3>
                        <ol>
                            <li>Confirmamos tu correo institucional y pertenencia al laboratorio.</li>
                            <li>Validamos que el uso del dataset se apega a la licencia CC-BY.</li>
                            <li>Enviamos credenciales temporales para tu primer inicio de sesión.</li>
                        </ol>
                        <div className="register-support__contact">
                            <p>¿Necesitas acelerar la revisión?</p>
                            <a href="mailto:biogeovis@gmail.com">biogeovis@gmail.com</a>
                        </div>

                    </aside>
                </section>

                <section className="register-faq scroll-animate" aria-label="Preguntas frecuentes">
                  
                    <article>
                        <h4>¿Puedo sumar a mi equipo?</h4>
                        <p>Sí, anexa los correos institucionales en el campo de motivación.</p>
                    </article>
                    <article>
                        <h4>¿Qué pasa si no tengo cuenta institucional?</h4>
                        <p>Comparte evidencia de tu afiliación vigente. El equipo revisará cada caso y te notificará por correo.</p>
                    </article>
                </section>
            </main>

            {/* Modal de éxito */}
            <AuthSuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
                userName={registeredUser?.firstName || registeredUser?.username || ''}
                type="register"
            />
        </div>
    );
};

export default Register;
