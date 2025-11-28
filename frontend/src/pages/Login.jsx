import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { login, validateLoginForm, validateEmail } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import AuthSuccessModal from '../components/AuthSuccessModal';
import UserNavMenu from '../components/UserNavMenu';
import './Login.css';

const NAV_LINKS = [
    { id: 'home', label: 'Inicio', to: '/' },
    { id: 'explorer', label: 'Explorer', to: '/explorer' },
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard' },
    { id: 'analisis', label: 'Análisis', to: '/analisis' }
];

const Login = () => {
    const navigate = useNavigate();
    const { login: authLogin, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        
        // Limpiar error del campo al escribir
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
        setServerError('');
    };

    // Validación en tiempo real al salir del campo
    const handleBlur = (e) => {
        const { name, value } = e.target;
        
        if (name === 'email' && value) {
            const emailValidation = validateEmail(value);
            if (!emailValidation.isValid) {
                setErrors({ ...errors, email: emailValidation.message });
            }
        }
    };

    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    setActiveSection(entry.target.dataset.section || 'hero');
                }
            });
        }, { threshold: 0.5 });

        const animatedBlocks = document.querySelectorAll('.scroll-animate');
        animatedBlocks.forEach((block) => observer.observe(block));

        return () => observer.disconnect();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');

        // Validar formulario completo
        const validation = validateLoginForm(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Llamar al servicio de autenticación
            const response = await login(formData.email, formData.password);
            
            // Guardar usuario en el contexto
            authLogin(response.user);
            setLoggedInUser(response.user);
            
            // Mostrar modal de éxito
            setShowSuccessModal(true);
            
        } catch (err) {
            setServerError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        navigate('/dashboard');
    };

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Verificar si el formulario es válido para habilitar el botón
    const isFormValid = formData.email && formData.password && Object.keys(errors).every(key => !errors[key]);

    return (
        <div className="login-page">
            {/* Barra superior replicada de About para consistencia */}
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

            <main className="login-shell">
                

                <section id="form" data-section="form" className="login-grid">
                    <article className="login-card scroll-animate" aria-label="Formulario de inicio de sesión">
                        <header className="login-card__header">
                            <h2>Ingresa a BioGeoVis</h2>
                            <p>Todos los campos son obligatorios.</p>
                        </header>

                        {serverError && (
                            <div className="alert alert-danger" role="alert">
                                {serverError}
                            </div>
                        )}

                        <Form onSubmit={handleSubmit} noValidate>
                            <Form.Group className="mb-3">
                                <Form.Label>Correo electrónico</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    placeholder="tu@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    disabled={loading}
                                    isInvalid={!!errors.email}
                                    className={errors.email ? 'is-invalid' : ''}
                                />
                                {errors.email ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email}
                                    </Form.Control.Feedback>
                                ) : (
                                    <span className="microcopy">Usa el correo que tienes registrado.</span>
                                )}
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    isInvalid={!!errors.password}
                                    className={errors.password ? 'is-invalid' : ''}
                                />
                                {errors.password ? (
                                    <Form.Control.Feedback type="invalid">
                                        {errors.password}
                                    </Form.Control.Feedback>
                                ) : (
                                    <span className="microcopy">Ingresa tu contraseña.</span>
                                )}
                            </Form.Group>

                            <div className="login-card__actions">
                                <Form.Check type="checkbox" label="Recordarme" disabled={loading} />
                                <Link to="/forgot-password" className="forgot-password-link">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <Button
                                variant="primary"
                                type="submit"
                                className="login-submit"
                                disabled={loading || !isFormValid}
                            >
                                {loading ? 'Iniciando sesión…' : 'Iniciar sesión' }
                            </Button>

                            <div className="login-card__footer">
                                <span>¿No tienes cuenta?</span>
                                <Link to="/register" className="register-link">
                                    Solicita acceso
                                </Link>
                            </div>
                        </Form>
                    </article>

                    <aside id="support" data-section="support" className="login-support scroll-animate" aria-label="Recordatorios de seguridad">
                        <h3>Soporte y seguridad</h3>
                        <p>Solo personal autorizado puede iniciar sesión. Si detectas actividad sospechosa:</p>
                        <ul>
                            <li>Contacta al equipo en <a href="mailto:biogevis@gmail.com">biogevis@gmail.com</a>.</li>
                            <li>Actualiza tu contraseña desde un dispositivo confiable.</li>
                            <li>Consulta el estado del servicio en el Dashboard si notas latencia.</li>
                        </ul>
                        <Link to="/" className="back-to-home">← Volver al inicio</Link>
                    </aside>
                </section>

                <section
                    id="register"
                    data-section="register"
                    className="login-register scroll-animate"
                    aria-label="Área para solicitudes de registro"
                >
                    <div className="login-register__content">
                        <p className="eyebrow">¿Necesitas acceso?</p>
                        <h3>Solicita tu cuenta institucional.</h3>
                        <p>
                            Completa el formulario de registro para que el equipo valide la información.
                            Te pediremos correo institucional, área de estudio y objetivo de uso para habilitar tu perfil.
                        </p>
                        <ol>
                            <li>Envía la solicitud con tus datos académicos y inmediatamente activamos tu acceso.</li>

                        </ol>
                    </div>
                    <div className="login-register__cta">
                        <Button as={Link} to="/register" size="lg" variant="primary">
                            Ir a registro
                        </Button>
                        <p>
                            ¿Tienes dudas? Escribe a <a href="mailto:biogevis@gmail.com">biogevis@gmail.com</a> y te guiamos paso a paso.
                        </p>
                    </div>
                </section>
            </main>

            {/* Modal de éxito */}
            <AuthSuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
                userName={loggedInUser?.firstName || loggedInUser?.username || ''}
                type="login"
            />
        </div>
    );
};

export default Login;
