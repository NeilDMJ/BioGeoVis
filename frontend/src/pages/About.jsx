import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import UserNavMenu from '../components/UserNavMenu';
import './About.css';

const SECTIONS = [
    { id: 'hero', label: 'Bienvenida' },
    { id: 'mission', label: 'Propósito' },
    { id: 'features', label: 'Capacidades' },
    { id: 'usage', label: 'Cómo usar' },
    { id: 'team', label: 'Equipo' },
    { id: 'contact', label: 'Contacto' }
];

function AboutPage() {
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const sections = document.querySelectorAll('[data-section]');
        const animatedBlocks = document.querySelectorAll('.scroll-animate');

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.dataset.section);
                }
            });
        }, { threshold: 0.5 });

        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.3 });

        sections.forEach((section) => sectionObserver.observe(section));
        animatedBlocks.forEach((block) => animationObserver.observe(block));

        return () => {
            sectionObserver.disconnect();
            animationObserver.disconnect();
        };
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="about-page">
            {/* Barra superior replica la jerarquía de Home para mantener memoria espacial. */}
        <header className="mapview__nav" aria-label="Navegación de mapa">
        <div className="mapview__logo">BioGeoVis</div>
        <nav className="mapview__nav-links">
          <Link to="/" className="mapview__nav-link">Inicio</Link>
          <Link to="/explorer" className="mapview__nav-link">Explorador</Link>
                    <Link to="/dashboard" className="mapview__nav-link">Dashboard</Link>
                    
                    <UserNavMenu />
        </nav>
      </header>

            <div className="about-grid">
                <main className="about-main">
                    <section
                        id="hero"
                        data-section="hero"
                        className="about-hero scroll-animate"
                    >
                        {/* Hero explica cómo continuar antes de desplazarse. */}
                        <div className="about-hero__content">
                            <p className="eyebrow">Experiencia guiada</p>
                            <h1>BioGeoVis contextualiza la biodiversidad con datos auditables.</h1>
                            <p className="lead">
                                En esta página entenderás la propuesta científica, cómo navegarla y dónde colaborar.
                            </p>
                            <ul className="about-hero__prompts">
                                <li>1. Sigue la barra superior para ubicar tu estado actual.</li>
                                <li>2. Revisa las tarjetas "Capacidades" para conocer cada flujo.</li>
                                <li>3. Usa los indicadores laterales para saltar sin perder contexto.</li>
                            </ul>
                            <div className="about-hero__actions">
                                <Button as={Link} to="/explorer" size="lg" variant="primary">
                                    Mapear avistamientos ahora
                                </Button>
                                <Button as={Link} to="/analisis" size="lg" variant="outline-light">
                                    Ver analítica comparativa
                                </Button>
                            </div>
                        </div>
                        <div className="about-hero__cards">
                            <article className="hero-card">
                                <span>Base de datos activa</span>
                                <strong>+12K registros</strong>
                                <p>Sincronizados con los pipelines del backend cada hora.</p>
                            </article>
                            <article className="hero-card">
                                <span>Latencia de consulta</span>
                                <strong>&lt; 250ms</strong>
                                <p>Optimizada para mantener la sensación de mapa vivo.</p>
                            </article>
                        </div>
                    </section>

                    <section
                        id="mission"
                        data-section="mission"
                        className="content-section scroll-animate"
                    >
                        <header>
                            <p className="microcopy">Lee primero para comprender qué problema resolvemos.</p>
                            <h2>Propósito y alcance</h2>
                        </header>
                        <p>
                            BioGeoVis es una plataforma diseñada para visualizar y explorar datos geográficos de biodiversidad en tiempo casi real.
                        </p>
                        <p>
                            Nuestra misión es ofrecer herramientas interactivas que permitan a científicos, investigadores y entusiastas analizar avistamientos con claridad narrativa y rigor técnico.
                        </p>
                    </section>

                    <section
                        id="features"
                        data-section="features"
                        className="content-section scroll-animate"
                    >
                        <header>
                            <p className="microcopy">Cada tarjeta explica qué hacer y cómo interpretar la vista.</p>
                            <h2>Capacidades clave</h2>
                        </header>
                        <div className="features-grid">
                            <article className="feature-item">
                                <h3>Visualización global</h3>
                                <p>Explora el globo 3D para detectar hotspots antes de profundizar.</p>
                                <span className="microcopy">Tip: usa gestos suaves; las animaciones se aceleran si detectan arrastre continuo.</span>
                            </article>
                            <article className="feature-item">
                                <h3>Mapas detallados</h3>
                                <p>Activa capas base claras u oscuras según la región y horario.</p>
                                <span className="microcopy">Tip: cambia el proveedor del mapa para validar contraste en zonas costeras.</span>
                            </article>
                            <article className="feature-item">
                                <h3>Datos precisos</h3>
                                <p>Consulta coordenadas, especie y confiabilidad sin abandonar la vista.</p>
                                <span className="microcopy">Tip: abre la tarjeta flotante para confirmar el origen del dato.</span>
                            </article>
                            <article className="feature-item">
                                <h3>Búsqueda guiada</h3>
                                <p>Filtra por taxonomía, fecha o región con sugerencias progresivas.</p>
                                <span className="microcopy">Tip: guarda filtros recurrentes; el backend ya los cachea.</span>
                            </article>
                        </div>
                    </section>

                    <section
                        id="usage"
                        data-section="usage"
                        className="content-section scroll-animate"
                    >
                        <header>
                            <p className="microcopy">Sigue los pasos para no perderte durante la transición Home → Explorer.</p>
                            <h2>Cómo usar BioGeoVis</h2>
                        </header>
                        <div className="usage-steps">
                            <div className="step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h3>Explora el globo</h3>
                                    <p>Desde Inicio selecciona "Explorar mapa" para entrar al flujo inmersivo.</p>
                                    <span className="microcopy">El globo recuerda tu última posición gracias al estado global.</span>
                                </div>
                            </div>
                            <div className="step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h3>Selecciona una ubicación</h3>
                                    <p>Haz clic o toca un punto para abrir la tarjeta con contexto regional.</p>
                                    <span className="microcopy">Si el mapa detecta zoom alto, activa automáticamente etiquetas detalladas.</span>
                                </div>
                            </div>
                            <div className="step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h3>Analiza los datos</h3>
                                    <p>Alterna capas y filtros; la interfaz suaviza las transiciones con fades.</p>
                                    <span className="microcopy">Cambia a "Insights" para comparar tendencias agregadas.</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        id="team"
                        data-section="team"
                        className="content-section scroll-animate"
                    >
                        <header>
                            <p className="microcopy">Esta sección confirma la autoría del proyecto.</p>
                            <h2>Nuestro equipo</h2>
                        </header>
                        <p>
                            BioGeoVis es desarrollado por estudiantes de ingeniería en computación comprometidos con la conservación de la biodiversidad.
                        </p>
                        <div className="team-info">
                            <p>
                                <strong>Universidad:</strong> Universidad Tecnológica de la Mixteca<br />
                                <strong>Proyecto:</strong> Sistema de Visualización Geográfica de Biodiversidad<br />
                                <strong>Año:</strong> 2025
                            </p>
                        </div>
                    </section>

                    <section
                        id="contact"
                        data-section="contact"
                        className="content-section scroll-animate"
                    >
                        <header>
                            <p className="microcopy">Indica cómo colaborar sin salir del flujo principal.</p>
                            <h2>Contacto directo</h2>
                        </header>
                        <p>
                            ¿Tienes preguntas, sugerencias o quieres contribuir al proyecto? Escríbenos con contexto y la sección que te interesa mejorar.
                        </p>
                        <div className="contact-info">
                            <p>
                                <strong>Email:</strong> info@biogeovis.com<br />
                                <strong>GitHub:</strong> github.com/NeilDMJ/BioGeoVis<br />
                                <strong>Repositorio:</strong> Código abierto para colaboración
                            </p>
                        </div>
                    </section>
                </main>

                <aside className="sidebar-menu" aria-label="Índice contextual">
                    <nav className="sticky-nav">
                        <h3>En esta página</h3>
                        <ul>
                            {SECTIONS.map((section) => (
                                <li key={section.id}>
                                    <button
                                        type="button"
                                        className={`sticky-link ${activeSection === section.id ? 'active' : ''}`}
                                        onClick={() => scrollToSection(section.id)}
                                    >
                                        {section.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
            </div>
        </div>
    );
}

export default AboutPage;
