import { Link } from 'react-router-dom';
import HomeGlobe from '../components/HomeGlobe';
import './Home.css';

function Home() {
  return (
    <div className="home-container">
      {/* Globo de fondo */}
      <div className="globe-background">
        <HomeGlobe />
      </div>

      {/* Overlay de contenido */}
      <div className="content-overlay">
        <div className="hero-section">
          <h1 className="title">BioGeoVis</h1>
          <p className="subtitle">
            Sistema de Visualización Geográfica de Biodiversidad
          </p>
          <p className="description">
            Explora y visualiza avistamientos de especies alrededor del mundo
          </p>
          
          <div className="cta-buttons">
            <Link to="/explorer" className="btn btn-primary">
              Explorar Mapa Interactivo
            </Link>
            <Link to="/about" className="btn btn-secondary">
              Conocer Más
            </Link>
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Visualización Global</h3>
            <p>Observa avistamientos de especies en tiempo real sobre un globo terráqueo interactivo</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Datos Geolocalizados</h3>
            <p>Información detallada sobre ubicación, especie y características de cada avistamiento</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Búsqueda Avanzada</h3>
            <p>Filtra y encuentra avistamientos por especie, región y otros criterios</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
