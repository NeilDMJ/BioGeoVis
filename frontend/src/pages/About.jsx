import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './About.css';

function AboutPage() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('introduction');

    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('.content-section');
            const scrollPosition = window.scrollY + 150;

            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    setActiveSection(sectionId);
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="about-page">
            {/* Botón de regreso */}
            <button 
                className="back-button"
                onClick={() => navigate('/')}
            >
                Volver al Inicio
            </button>

            {/* Contenido principal */}
            <div className="about-container">
                <main className="about-content">
                    <section id="introduction" className="content-section">
                        <h1>Acerca de BioGeoVis</h1>
                        <p className="lead">
                            BioGeoVis es una plataforma innovadora diseñada para la visualización 
                            y exploración de datos geográficos de biodiversidad alrededor del mundo.
                        </p>
                        <p>
                            Nuestra misión es proporcionar herramientas interactivas que permitan 
                            a científicos, investigadores y entusiastas de la naturaleza explorar 
                            y analizar avistamientos de especies de manera intuitiva y visual.
                        </p>
                    </section>

                    <section id="features" className="content-section">
                        <h2>Características Principales</h2>
                        <div className="features-grid">
                            <div className="feature-item">
                                <h3>Visualización Global</h3>
                                <p>
                                    Explora avistamientos de especies en un globo terráqueo 3D interactivo 
                                    que te permite navegar por todo el planeta de manera fluida.
                                </p> 
                            </div>
                            <div className="feature-item">
                                <h3>Mapas Detallados</h3>
                                <p>
                                    Accede a mapas detallados con múltiples estilos de visualización 
                                    para análisis más profundos de regiones específicas.
                                </p>
                            </div>
                            <div className="feature-item">
                                <h3>Datos Precisos</h3>
                                <p>
                                    Información geolocalizada precisa sobre cada avistamiento, 
                                    incluyendo coordenadas, especies y características.
                                </p>
                            </div>
                            <div className="feature-item">
                                <h3>Búsqueda Avanzada</h3>
                                <p>
                                    Filtra y busca avistamientos por especie, ubicación, fecha 
                                    y otros criterios relevantes.
                                </p>
                            </div>
                        </div>
                    </section>    

                    <section id="usage" className="content-section">
                        <h2>Cómo Usar</h2>
                        <div className="usage-steps">
                            <div className="step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h3>Explora el Globo</h3>
                                    <p>
                                        Desde la página de inicio, haz clic en "Explorar Mapa Interactivo" 
                                        para acceder al globo terráqueo 3D.
                                    </p>
                                </div>
                            </div>
                            <div className="step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h3>Selecciona una Ubicación</h3>
                                    <p>
                                        Haz clic en cualquier parte del globo para ver información 
                                        detallada de esa región en un mapa interactivo.
                                    </p>
                                </div>
                            </div>
                            <div className="step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h3>Analiza los Datos</h3>
                                    <p>
                                        Utiliza las herramientas del mapa para hacer zoom, cambiar 
                                        estilos de visualización y explorar avistamientos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="team" className="content-section">
                        <h2>Nuestro Equipo</h2>
                        <p>
                            BioGeoVis es desarrollado por un equipo dedicado de estudiantes de ingeniería en computación
                            apasionados por la tecnología y la conservación de la biodiversidad.
                        </p>
                        <div className="team-info">
                            <p>
                                <strong>Universidad:</strong> Universidad Tecnológica de la Mixteca<br />
                                <strong>Proyecto:</strong> Sistema de Visualización Geográfica de Biodiversidad<br />
                                <strong>Año:</strong> 2025
                            </p>
                        </div>
                    </section>

                    <section id="contact" className="content-section">
                        <h2>Contacto</h2>
                        <p>
                            ¿Tienes preguntas, sugerencias o quieres contribuir al proyecto? 
                            Nos encantaría escucharte.
                        </p>
                        <div className="contact-info">
                            <p>
                                <strong>Email:</strong> info@biogeovis.com<br />
                                <strong>GitHub:</strong> github.com/NeilDMJ/BioGeoVis<br />
                                <strong>Repositorio:</strong> Código abierto y disponible para colaboración
                            </p>
                        </div>
                    </section>
                </main>

                {/* Menú lateral */}
                <aside className="sidebar-menu">
                    <nav className="sticky-nav">
                        <h3>En esta página</h3>
                        <ul>
                            <li>
                                <a 
                                    href="#introduction"
                                    className={activeSection === 'introduction' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('introduction');
                                    }}
                                >
                                    Introducción
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#features"
                                    className={activeSection === 'features' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('features');
                                    }}
                                >
                                    Características
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#usage"
                                    className={activeSection === 'usage' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('usage');
                                    }}
                                >
                                    Cómo Usar
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#team"
                                    className={activeSection === 'team' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('team');
                                    }}
                                >
                                    Equipo
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#contact"
                                    className={activeSection === 'contact' ? 'active' : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('contact');
                                    }}
                                >
                                    Contacto
                                </a>
                            </li>
                        </ul>
                    </nav>
                </aside>
            </div>
        </div>
    );
}

export default AboutPage;
