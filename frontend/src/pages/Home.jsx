import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import HomeGlobe from '../components/HomeGlobe';
import UserNavMenu from '../components/UserNavMenu';
import './Home.css';

const sectionNav = [
  { id: 'hero', label: 'Inicio', href: '#hero' },
  { id: 'features', label: 'Guía rápida', href: '#features' }
];

function Home() {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const animatedEls = document.querySelectorAll('.fade-slide-in');
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.2 });

    animatedEls.forEach((el) => fadeObserver.observe(el));

    const sections = document.querySelectorAll('[data-section]');
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.dataset.section);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      fadeObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <div className="home">
      <div className="home__globe" aria-hidden="true">
        <HomeGlobe className="home__globe-canvas" />
      </div>

      <header className="home__nav" aria-label="Navegación principal">
        <div className="home__logo">BioGeoVis</div>
        <nav className="home__nav-links">
          <Link to="/home" className="home__nav-link external">
            Inicio
          </Link>
          <Link to="/explorer" className="home__nav-link external">
            Explorador
          </Link>
          <Link to="/dashboard" className="home__nav-link external">
            Dashboard
          </Link>
          <Link to="/about" className="home__nav-link external">
            Acerca de Nosotros
          </Link>
          <UserNavMenu />
        </nav>
      </header>

      <main className="home__content">
        <section id="hero" data-section="hero" className="hero fade-slide-in">
          <div className="hero__copy">
            <p className="eyebrow">Visualización científica en vivo</p>
            <h1>Explora la biodiversidad global con precisión y contexto.</h1>
            <p className="lead">
              Sigue el globo 3D, descubre hotspots y entra con confianza al explorador.
            </p>
            <ol className="hero__steps" aria-label="Cómo comenzar">
              <li>Observa el globo rotando de fondo y ubica tu región de interés.</li>
              <li>Usa la barra superior para conocer secciones clave y navegar con un clic.</li>
              <li>Haz clic en "Explorar mapa" para aplicar filtros precisos y ver resultados.</li>
            </ol>
            <div className="hero__actions">
              <Button
                as={Link}
                to="/explorer"
                size="lg"
                variant="primary"
                className="home-btn home-btn--primary"
              >
                Explorar mapa interactivo
              </Button>
              <Button
                as={Link}
                to="/about"
                size="lg"
                variant="outline-light"
                className="home-btn home-btn--ghost"
              >
                Conocer metodología
              </Button>
            </div>
          </div>

          <div className="hero__metrics">
            <article className="metric-card fade-slide-in delay-1">
              <span className="metric-card__label">Avistamientos activos</span>
              <strong>+12,400</strong>
              <p>Actualizados cada hora desde nuestra base científica.</p>
            </article>
            <article className="metric-card fade-slide-in delay-2">
              <span className="metric-card__label">Cobertura</span>
              <strong>190 países</strong>
              <p>Detecta migraciones, hotspots y anomalías en segundos.</p>
            </article>
          </div>
        </section>

        <section id="features" data-section="features" className="features fade-slide-in delay-1">
          <header>
            <p className="eyebrow">Qué puedes hacer</p>
            <h2>Navega con claridad sin perder la vista del globo.</h2>
            <p className="lead">
              Cada tarjeta describe una acción clave y un tip corto.
            </p>
          </header>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>Visualización Global</h3>
              <p>Gira el globo, acerca hotspots y entra al Explorer con un clic contextual.</p>
              <span className="microcopy">Tip: usa el trackpad o rueda para zoom suave.</span>
            </article>
            <article className="feature-card">
              <h3>Búsqueda Guiada</h3>
              <p>Recibe sugerencias de filtros antes de navegar para evitar pasos ambiguos.</p>
              <span className="microcopy">Tip: guarda tus criterios frecuentes con un marcador.</span>
            </article>
            <article className="feature-card">
              <h3>Transiciones Claras</h3>
              <p>Animaciones sincronizadas comunican el paso hacia Explorer o Dashboard.</p>
              <span className="microcopy">Tip: observa la barra superior para confirmar dónde estás.</span>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
