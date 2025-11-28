import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { register } from '../services/authService';
import './Register.css';

const NAV_LINKS = [
    { id: 'home', label: 'Inicio', to: '/home' },
    { id: 'explorer', label: 'Explorer', to: '/explorer' },
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard' },
    { id: 'analisis', label: 'Analisis', to: '/analisis' }
];

const ROLE_OPTIONS = [
    { value: 'investigador', label: 'Investigador/a' },
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'institucional', label: 'Representante institucional' },
    { value: 'colaborador', label: 'Colaborador externo' }
];

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        age: '',
    });
    const [status, setStatus] = useState({ message: '', tone: 'muted' });
    const [submitting, setSubmitting] = useState(false);

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
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setStatus({ message: '', tone: 'muted' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validación de campos obligatorios
        if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName) {
            setStatus({ message: 'Por favor completa todos los campos obligatorios.', tone: 'error' });
            return;
        }

        // Validación de contraseñas
        if (formData.password !== formData.confirmPassword) {
            setStatus({ message: 'Las contraseñas no coinciden.', tone: 'error' });
            return;
        }

        // Validación de longitud de contraseña
        if (formData.password.length < 8) {
            setStatus({ message: 'La contraseña debe tener al menos 8 caracteres.', tone: 'error' });
            return;
        }

        setSubmitting(true);
        setStatus({ message: 'Registrando usuario...', tone: 'muted' });

        try {
            // Preparar datos para el backend
            const userData = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                age: formData.age ? parseInt(formData.age) : null,
            };

            // Llamar al servicio de registro
            await register(userData);

            setStatus({
                message: 'Registro exitoso. Redirigiendo al inicio de sesión...',
                tone: 'success'
            });

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            setStatus({
                message: error.message || 'Error al registrar usuario. Intenta nuevamente.',
                tone: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

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
                    <Link to="/login" className="home__nav-link nav-login-cta">Iniciar sesión</Link>
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
                            <span>Tiempo de respuesta promedio</span>
                            <strong>&lt; 18 h</strong>
                            <p>Equipo de soporte continental.</p>
                        </article>
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

                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="username" className="mb-3">
                                <Form.Label>Nombre de usuario*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="usuario123"
                                    disabled={submitting}
                                    minLength={5}
                                    maxLength={20}
                                />
                                <Form.Text className="text-muted">
                                    Entre 5 y 20 caracteres
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label>Correo electrónico*</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="usuario@ejemplo.com"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Group controlId="firstName" className="mb-3">
                                <Form.Label>Nombre*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Tu nombre"
                                    disabled={submitting}
                                    minLength={2}
                                    maxLength={50}
                                />
                            </Form.Group>

                            <Form.Group controlId="lastName" className="mb-3">
                                <Form.Label>Apellido*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Tu apellido"
                                    disabled={submitting}
                                    minLength={2}
                                    maxLength={50}
                                />
                            </Form.Group>

                            <Form.Group controlId="age" className="mb-3">
                                <Form.Label>Edad (opcional)</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="18"
                                    disabled={submitting}
                                    min={10}
                                />
                            </Form.Group>

                            <Form.Group controlId="password" className="mb-3">
                                <Form.Label>Contraseña*</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    minLength={8}
                                />
                                <Form.Text className="text-muted">
                                    Mínimo 8 caracteres
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="confirmPassword" className="mb-4">
                                <Form.Label>Confirmar contraseña*</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Button type="submit" className="register-submit" disabled={submitting}>
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
                        <h4>¿Qué datos debo preparar?</h4>
                        <p>Nombre oficial del proyecto, carta de apoyo del tutor (si aplica) y alcance geográfico aproximado.</p>
                    </article>
                    <article>
                        <h4>¿Puedo sumar a mi equipo?</h4>
                        <p>Sí, anexa los correos institucionales en el campo de motivación y enviaremos invitaciones grupales.</p>
                    </article>
                    <article>
                        <h4>¿Qué pasa si no tengo cuenta institucional?</h4>
                        <p>Comparte evidencia de tu afiliación vigente. El equipo revisará cada caso y te notificará por correo.</p>
                    </article>
                </section>
            </main>
        </div>
    );
};

export default Register;
