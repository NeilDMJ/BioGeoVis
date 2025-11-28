import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSpeciesImage, getSpeciesGallery } from '../services/speciesImage';
import { getSpeciesDetailedInfo } from '../services/geminiService';
import Icons from '../components/Icons';
import './SpeciesDetail.css';

const FALLBACK_IMAGE = 'https://placehold.co/600x400/1a2332/FFFFFF?text=BioGeoVis';

function SpeciesDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const speciesData = location.state?.species;

  const [imageData, setImageData] = useState({ url: null, loading: true });
  const [gallery, setGallery] = useState([]);
  const [detailedInfo, setDetailedInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  const info = speciesData?.speciesInfo || {};
  const taxonomy = info.taxonomy || {};
  const scientificName = info.scientificName || speciesData?.label || 'Especie desconocida';
  const commonName = info.commonName || null;

  // Cargar imagen principal
  useEffect(() => {
    if (!scientificName || scientificName === 'Especie desconocida') return;
    
    let mounted = true;
    const controller = new AbortController();
    
    (async () => {
      try {
        const result = await getSpeciesImage(scientificName, { signal: controller.signal });
        if (mounted && result?.imageUrl) {
          setImageData({ url: result.imageUrl, loading: false, source: result.source });
        } else if (mounted) {
          setImageData({ url: info.imageUrl || null, loading: false });
        }
      } catch (error) {
        if (mounted && error?.name !== 'AbortError') {
          setImageData({ url: info.imageUrl || null, loading: false });
        }
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [scientificName, info.imageUrl]);

  // Cargar galería
  useEffect(() => {
    if (!scientificName || scientificName === 'Especie desconocida') return;
    
    let mounted = true;
    const controller = new AbortController();
    
    (async () => {
      try {
        const images = await getSpeciesGallery(scientificName, 8, { signal: controller.signal });
        if (mounted) {
          setGallery(images || []);
        }
      } catch (error) {
        if (mounted && error?.name !== 'AbortError') {
          console.error('Error loading gallery:', error);
        }
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [scientificName]);

  // Cargar información detallada de Gemini
  useEffect(() => {
    if (!scientificName || scientificName === 'Especie desconocida') {
      setInfoLoading(false);
      return;
    }
    
    let mounted = true;
    const controller = new AbortController();
    
    (async () => {
      try {
        setInfoLoading(true);
        const result = await getSpeciesDetailedInfo(
          scientificName, 
          commonName, 
          taxonomy, 
          { signal: controller.signal }
        );
        if (mounted) {
          setDetailedInfo(result);
          setInfoLoading(false);
        }
      } catch (error) {
        if (mounted && error?.name !== 'AbortError') {
          console.error('Error loading detailed info:', error);
          setInfoLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [scientificName, commonName, taxonomy]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const taxonomyRows = useMemo(() => ([
    { label: 'Reino', value: taxonomy.kingdom, icon: Icons.crown },
    { label: 'Filo', value: taxonomy.phylum, icon: Icons.dna },
    { label: 'Clase', value: taxonomy.class, icon: Icons.layers },
    { label: 'Orden', value: taxonomy.order, icon: Icons.folder },
    { label: 'Familia', value: taxonomy.family, icon: Icons.users },
    { label: 'Género', value: taxonomy.genus, icon: Icons.microscope },
    { label: 'Especie', value: taxonomy.species, icon: Icons.bug }
  ]), [taxonomy]);

  const tabs = [
    { id: 'general', label: 'Información General', icon: Icons.book },
    { id: 'habitat', label: 'Hábitat', icon: Icons.globe },
    { id: 'comportamiento', label: 'Comportamiento', icon: Icons.activity },
    { id: 'conservacion', label: 'Conservación', icon: Icons.shield },
    { id: 'curiosidades', label: 'Curiosidades', icon: Icons.lightbulb }
  ];

  if (!speciesData) {
    return (
      <div className="species-detail-page">
        <div className="species-detail-error">
          <div className="error-icon">{Icons.search}</div>
          <h2>Especie no encontrada</h2>
          <p>No se proporcionó información de la especie</p>
          <button className="back-btn-primary" onClick={handleGoBack}>
            ← Regresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="species-detail-page">
      {/* Header con navegación */}
      <header className="species-detail-header">
        <button className="back-btn" onClick={handleGoBack}>
          <span>Regresar</span>
        </button>
        <div className="header-title">
          <span className="header-badge">Ficha de Especie</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="species-hero">
        <div className="hero-image-container">
          {imageData.loading ? (
            <div className="hero-image-skeleton">
              <div className="skeleton-pulse"></div>
            </div>
          ) : (
            <img 
              src={imageData.url || FALLBACK_IMAGE} 
              alt={scientificName}
              className="hero-image"
              onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
            />
          )}
          {imageData.source && (
            <span className="image-source-badge">📷 {imageData.source}</span>
          )}
        </div>
        
        <div className="hero-content">
          <div className="hero-eyebrow">
            {taxonomy.class || taxonomy.order || 'Especie'}
          </div>
          <h1 className="hero-title">{scientificName}</h1>
          {commonName && (
            <p className="hero-common-name">
              <span className="common-name-label">Nombre común:</span> {commonName}
            </p>
          )}
          
          {/* Taxonomía compacta */}
          <div className="hero-taxonomy">
            {taxonomyRows.filter(row => row.value).slice(0, 4).map(row => (
              <div key={row.label} className="taxonomy-chip">
                <span className="chip-icon">{row.icon}</span>
                <span className="chip-label">{row.label}:</span>
                <span className="chip-value">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs de navegación */}
      <nav className="species-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main className="species-content">
        {infoLoading ? (
          <div className="content-loading">
            <div className="loading-spinner"></div>
            <p>Cargando información detallada...</p>
            <span className="loading-subtitle">Consultando base de datos de biodiversidad</span>
          </div>
        ) : (
          <>
            {/* Tab: General */}
            {activeTab === 'general' && (
              <div className="tab-content fade-in">
                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.book}</span>
                    Descripción
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.descripcion || 'Información no disponible para esta especie.'}
                  </p>
                </div>

                <div className="info-grid">
                  <div className="info-card">
                    <h3 className="card-title-sm">
                      <span className="title-icon">{Icons.utensils}</span>
                      Alimentación
                    </h3>
                    <p className="card-text-sm">
                      {detailedInfo?.alimentacion || 'Información no disponible'}
                    </p>
                  </div>
                  
                  <div className="info-card">
                    <h3 className="card-title-sm">
                      <span className="title-icon">{Icons.baby}</span>
                      Reproducción
                    </h3>
                    <p className="card-text-sm">
                      {detailedInfo?.reproduccion || 'Información no disponible'}
                    </p>
                  </div>
                </div>

                {/* Taxonomía completa */}
                <div className="info-card taxonomy-full">
                  <h3 className="card-title">
                    <span className="title-icon">{Icons.dna}</span>
                    Clasificación Taxonómica
                  </h3>
                  <div className="taxonomy-grid">
                    {taxonomyRows.map(row => (
                      <div key={row.label} className="taxonomy-item">
                        <span className="taxonomy-icon">{row.icon}</span>
                        <div className="taxonomy-text">
                          <span className="taxonomy-label">{row.label}</span>
                          <span className="taxonomy-value">{row.value || 'No registrado'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Hábitat */}
            {activeTab === 'habitat' && (
              <div className="tab-content fade-in">
                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.mapPin}</span>
                    Hábitat Natural
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.habitat || 'Información sobre el hábitat no disponible.'}
                  </p>
                </div>

                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.map}</span>
                    Distribución Geográfica
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.distribucion || 'Información sobre distribución no disponible.'}
                  </p>
                </div>

                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.leaf}</span>
                    Importancia Ecológica
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.importanciaEcologica || 'Información no disponible.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Comportamiento */}
            {activeTab === 'comportamiento' && (
              <div className="tab-content fade-in">
                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.activity}</span>
                    Comportamiento
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.comportamiento || 'Información sobre comportamiento no disponible.'}
                  </p>
                </div>

                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.handshake}</span>
                    Relación con Humanos
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.relacionConHumanos || 'Información no disponible.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Conservación */}
            {activeTab === 'conservacion' && (
              <div className="tab-content fade-in">
                <div className="info-card conservation-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.shield}</span>
                    Estado de Conservación
                  </h2>
                  <div className="conservation-status">
                    <span className="status-badge">
                      {detailedInfo?.estadoConservacion || 'Estado no determinado'}
                    </span>
                  </div>
                </div>

                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.alertTriangle}</span>
                    Amenazas
                  </h2>
                  <p className="card-text">
                    {detailedInfo?.amenazas || 'Información sobre amenazas no disponible.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Curiosidades */}
            {activeTab === 'curiosidades' && (
              <div className="tab-content fade-in">
                <div className="info-card">
                  <h2 className="card-title">
                    <span className="title-icon">{Icons.lightbulb}</span>
                    Datos Curiosos
                  </h2>
                  {detailedInfo?.curiosidades?.length > 0 ? (
                    <ul className="curiosities-list">
                      {detailedInfo.curiosidades.map((item, index) => (
                        <li key={index} className="curiosity-item">
                          <span className="curiosity-number">{index + 1}</span>
                          <span className="curiosity-text">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="card-text">No hay datos curiosos disponibles para esta especie.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Galería de imágenes */}
        {gallery.length > 0 && (
          <section className="gallery-section">
            <h2 className="section-title">
              <span className="title-icon">{Icons.camera}</span>
              Galería de Observaciones
            </h2>
            <div className="gallery-grid">
              {gallery.map((img, index) => (
                <div 
                  key={index} 
                  className="gallery-item"
                  onClick={() => setSelectedGalleryImage(img)}
                >
                  <img 
                    src={img.imageUrl} 
                    alt={`Observación ${index + 1}`}
                    loading="lazy"
                  />
                  {img.location && (
                    <div className="gallery-overlay">
                      <span className="gallery-location"><span className="overlay-icon">{Icons.mapPin}</span> {img.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal de imagen ampliada */}
      {selectedGalleryImage && (
        <div className="image-modal" onClick={() => setSelectedGalleryImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGalleryImage(null)}>{Icons.close}</button>
            <img src={selectedGalleryImage.largeUrl || selectedGalleryImage.imageUrl} alt="Imagen ampliada" />
            <div className="modal-info">
              {selectedGalleryImage.location && <p><span className="modal-icon">{Icons.mapPin}</span> {selectedGalleryImage.location}</p>}
              {selectedGalleryImage.date && <p><span className="modal-icon">{Icons.calendar}</span> {selectedGalleryImage.date}</p>}
              {selectedGalleryImage.user && <p><span className="modal-icon">{Icons.user}</span> {selectedGalleryImage.user}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Footer con fuentes */}
      <footer className="species-detail-footer">
        <p>Información generada con IA • Imágenes de iNaturalist, GBIF y Wikimedia Commons</p>
        <p className="footer-disclaimer">Los datos mostrados son informativos. Consulta fuentes científicas para información precisa.</p>
      </footer>
    </div>
  );
}

export default SpeciesDetail;
