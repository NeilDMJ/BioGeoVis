import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
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
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        institution: '',
        role: '',
        researchArea: '',
        motivation: '',
        acceptPolicies: false
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
        if (!formData.fullName || !formData.email || !formData.institution || !formData.role || !formData.researchArea || !formData.acceptPolicies) {
            setStatus({ message: 'Completa los campos obligatorios y acepta las políticas de uso.', tone: 'error' });
            return;
        }
        setSubmitting(true);
        setStatus({ message: 'Enviando solicitud...', tone: 'muted' });
        try {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            setStatus({ message: 'Solicitud enviada correctamente. Revisa tu correo institucional para confirmar el registro.', tone: 'success' });
            setFormData((prev) => ({
                ...prev,
                motivation: '',
                acceptPolicies: false
            }));
        } catch (error) {
            setStatus({ message: 'No pudimos enviar la solicitud. Intenta nuevamente.', tone: 'error' });
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
                            Necesitamos asegurarnos de que los datos sensibles se utilicen dentro de proyectos avalados. Comparte tu contexto
                            y recibirás un enlace de activación en menos de 24 horas hábiles.
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
                            <h2>Formulario de acceso</h2>
                            <p>Validaremos tu información con tu institución de origen.</p>
                        </header>

                        {status.message && (
                            <div className={`register-status ${status.tone}`} role="status">
                                {status.message}
                            </div>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="fullName" className="mb-3">
                                <Form.Label>Nombre completo*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Nombres y apellidos"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label>Correo institucional*</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="usuario@institucion.edu"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Group controlId="institution" className="mb-3">
                                <Form.Label>Institución o laboratorio*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="institution"
                                    value={formData.institution}
                                    onChange={handleChange}
                                    placeholder="Nombre de la institución"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Group controlId="role" className="mb-3">
                                <Form.Label>Rol principal*</Form.Label>
                                <Form.Select name="role" value={formData.role} onChange={handleChange} disabled={submitting}>
                                    <option value="">Selecciona una opción</option>
                                    {ROLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group controlId="researchArea" className="mb-3">
                                <Form.Label>Área de investigación o curso*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="researchArea"
                                    value={formData.researchArea}
                                    onChange={handleChange}
                                    placeholder="Ej. Zoología, Cambio climático, SIG aplicado"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Group controlId="motivation" className="mb-4">
                                <Form.Label>Objetivo o proyecto</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="motivation"
                                    value={formData.motivation}
                                    onChange={handleChange}
                                    placeholder="Describe brevemente el alcance de tu investigación"
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <Form.Check
                                type="checkbox"
                                id="acceptPolicies"
                                name="acceptPolicies"
                                label="Confirmo que utilizaré BioGeoVis bajo las políticas de ética y seguridad de datos."
                                checked={formData.acceptPolicies}
                                onChange={handleChange}
                                disabled={submitting}
                                className="mb-4"
                            />

                            <Button type="submit" className="register-submit" disabled={submitting}>
                                {submitting ? 'Enviando...' : 'Enviar solicitud'}
                            </Button>

                            <div className="register-card__footer">
                                <span>¿Ya tienes acceso?</span>
                                <Link to="/login" className="register-link">Regresa al login</Link>
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
