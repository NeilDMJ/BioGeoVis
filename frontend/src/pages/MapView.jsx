import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Clustering 
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import UserNavMenu from '../components/UserNavMenu';
import SpeciesInfoCard from '../components/SpeciesInfoCard';
import {
  ensureSpeciesInfo,
  getPinIcon,
  singlePointIcon,
  TILE_PROVIDERS,
  MAP_MAX_BOUNDS,
  darkenHex
} from '../utils/mapConfig';
import './MapView.css';
import upIcon from '../assets/up.svg';
import downIcon from '../assets/down.svg';

const TILE_DESCRIPTIONS = {
  carto: 'Base equilibrada ideal para análisis generales.',
  osm: 'Enfoque comunitario para validar topónimos al instante.',
  opentopo: 'Resalta relieve y cambios altimétricos.',
  wikimedia: 'Cartografía limpia para reportes y presentaciones.',
  esri: 'Imágenes satelitales para contraste terreno-hábitat.',
  cartoDark: 'Modo oscuro para sesiones nocturnas o datos térmicos.'
};

const TILE_SWATCHES = {
  carto: 'linear-gradient(135deg, #f6f9ff, #c8d4ee)',
  osm: 'linear-gradient(135deg, #ebf7e3, #c2dd9b)',
  opentopo: 'linear-gradient(135deg, #ffe9c7, #f2c57c)',
  wikimedia: 'linear-gradient(135deg, #fef2ff, #cec0f0)',
  esri: 'linear-gradient(135deg, #1e66a1ff, #7598a5ff)',
  cartoDark: 'linear-gradient(135deg, #60b01fff, #dfe1e9ff)'
};

function MapView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [providerKey, setProviderKey] = useState('carto');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const provider = TILE_PROVIDERS[providerKey];

  const resolveInitialMarkers = () => {
    if (Array.isArray(location.state?.markers)) return location.state.markers;
    try {
      const cached = sessionStorage.getItem('biogeovis:mapMarkers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  // Marcadores provenientes del Explorer  o recuperados de sessionStorage en caso de recarga
  const [markers, setMarkers] = useState(() => resolveInitialMarkers().map(ensureSpeciesInfo));
  const hasMarkers = markers.length > 0;
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  // Obtener las coordenadas de la ubicación clickeada en el globo
  const clickedLat = location.state?.lat ?? 40.7128;
  const clickedLng = location.state?.lng ?? -74.0060;

  const position = useMemo(() => {
    if (hasMarkers) {
      const sum = markers.reduce((acc, m) => ({ lat: acc.lat + m.lat, lng: acc.lng + m.lng }), { lat: 0, lng: 0 });
      const cnt = markers.length;
      return [sum.lat / cnt, sum.lng / cnt];
    }
    return [clickedLat, clickedLng];
  }, [hasMarkers, markers, clickedLat, clickedLng]);

  const mapRef = useRef(null);

  // Ajustar vista automáticamente según marcadores
  useEffect(() => {
    if (!mapRef.current || !hasMarkers || !markers.length) return;
    if (markers.length === 1) {
      const m = markers[0];
      mapRef.current.setView([m.lat, m.lng], 6, { animate: true });
      return;
    }
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);
    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
    mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [hasMarkers, markers]);

  // Componente interno para clusters usando la API de react-leaflet
  function MarkerClusters({ points, onMarkerClick }) {
    const map = useMap();
    useEffect(() => {
      if (!map || !points.length) return;
      // Si plugin no cargó, fallback a no clusterizar 
      if (!L.markerClusterGroup) {
        if (import.meta.env.DEV) console.warn('[MapView] markerClusterGroup no disponible, fallback a markers simples');
        return;
      }
      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 52,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 34 : count < 50 ? 40 : count < 200 ? 48 : 56;
          const color = '#ff6b6b';
          const shade = darkenHex(color, 0.35);
          const html = `\n            <div style="\n              background: radial-gradient(circle at 30% 30%, #fff 0%, ${color} 70%);\n              width:${size}px;\n              height:${size}px;\n              border-radius:50%;\n              display:flex;\n              align-items:center;\n              justify-content:center;\n              color:#fff;\n              font-weight:600;\n              font-size:${count < 10 ? 13 : count < 50 ? 14 : 15}px;\n              box-shadow:0 2px 6px rgba(0,0,0,0.35);\n              border:2px solid ${shade};\n            ">${count}</div>`;
          return L.divIcon({ html, className: 'custom-cluster-icon', iconSize: [size, size] });
        }
      });
      const managedMarkers = [];
      points.forEach(m => {
        const marker = L.marker([m.lat, m.lng], { icon: getPinIcon(m.color || '#ff0000') });
        marker.bindPopup(`<div style="font-size:13px"><strong>${m.label || 'Avistamiento'}</strong><br/>Lat: ${m.lat.toFixed(4)}<br/>Lng: ${m.lng.toFixed(4)}</div>`);
        if (onMarkerClick) {
          // Sincroniza el click imperativo de Leaflet con el estado de React.
          const handler = () => onMarkerClick(m);
          marker.on('click', handler);
          managedMarkers.push({ marker, handler });
        }
        clusterGroup.addLayer(marker);
      });
      map.addLayer(clusterGroup);
      if (import.meta.env.DEV) console.debug('[MapView] Clusters montados. Total puntos:', points.length);
      return () => {
        managedMarkers.forEach(({ marker, handler }) => {
          if (handler) marker.off('click', handler);
        });
        map.removeLayer(clusterGroup);
      };
    }, [map, points, onMarkerClick]);
    return null;
  }

  useEffect(() => {
    if (Array.isArray(location.state?.markers)) {
      setMarkers(location.state.markers.map(ensureSpeciesInfo));
    }
  }, [location.state]);

  useEffect(() => {
    try {
      sessionStorage.setItem('biogeovis:mapMarkers', JSON.stringify(markers));
    } catch { }
  }, [markers]);

  useEffect(() => {
    if (!hasMarkers) setSelectedSpecies(null);
  }, [hasMarkers]);

  useEffect(() => {
    const targets = document.querySelectorAll('.mapview .fade-slide-in');
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.2 });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  const handleMarkerSelect = useCallback((markerPayload) => {
    setSelectedSpecies(markerPayload ? ensureSpeciesInfo(markerPayload) : null);
  }, []);

  const handleCloseCard = useCallback(() => setSelectedSpecies(null), []);

  return (
    <div className="mapview">
      <MapContainer
        center={position}
        zoom={hasMarkers ? 3 : 6}
        minZoom={1.5}
        zoomSnap={0}      // permitir zoom fraccional 
        className="mapview__canvas"
        maxBounds={MAP_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        whenCreated={(map) => { mapRef.current = map; }}
      >
        <TileLayer
          attribution={provider.attribution}
          url={provider.url}
        />
        {/* Fallback: si no hay markers mostrar punto único */}
        {hasMarkers ? null : (
          <Marker position={[clickedLat, clickedLng]} icon={singlePointIcon}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>Punto seleccionado</strong><br />
                Lat: {clickedLat.toFixed(4)}<br />
                Lng: {clickedLng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}
        {/* Render: cluster si hay plugin y más de 2 puntos, sino markers simples */}
        {hasMarkers && (
          L.markerClusterGroup ? (
            <MarkerClusters points={markers} onMarkerClick={handleMarkerSelect} />
          ) : (
            markers.map((m, i) => (
              <Marker
                key={i}
                position={[m.lat, m.lng]}
                icon={getPinIcon(m.color || '#ff0000')}
                eventHandlers={{ click: () => handleMarkerSelect(m) }}
              >
                <Popup>
                  <div style={{ fontSize: 13 }}>
                    <strong>{m.label || 'Avistamiento'}</strong><br />
                    Lat: {m.lat.toFixed(4)}<br />
                    Lng: {m.lng.toFixed(4)}
                  </div>
                </Popup>
              </Marker>
            ))
          )
        )}
      </MapContainer>
      <header className="mapview__nav" aria-label="Navegación de mapa">
        <div className="mapview__logo">BioGeoVis</div>
        <nav className="mapview__nav-links">
          <Link to="/" className="mapview__nav-link">Inicio</Link>
          <Link to="/explorer" className="mapview__nav-link">Explorador</Link>
          <Link to="/dashboard" className="mapview__nav-link">Dashboard</Link>
          <Link to="/about" className="mapview__nav-link">
            Acerca de Nosotros
          </Link>
          <UserNavMenu />
        </nav>
        <div className="mapview__nav-actions">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/explorer')}>
            Volver al Explorador
          </Button>
        </div>
      </header>

      <div className="mapview__panels">
        <section className="mapview__panel fade-slide-in">
          <div className="mapview__panel-head">
            <div className="mapview__panel-toggle-row">
              <p className="eyebrow" style={{ margin: 0 }}>Estilo de mapa</p>
              <button onClick={() => setIsPanelOpen(!isPanelOpen)} type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <img src={isPanelOpen ? upIcon : downIcon} alt={isPanelOpen ? "Contraer" : "Desplegar"} />
              </button>
            </div>
            {isPanelOpen && (
              <>
                <h2>Elige cómo contar la historia de tus avistamientos.</h2>
                <p className="panel-lead">Cada vista está optimizada para un tipo de análisis. Selecciona una tarjeta para aplicarla de inmediato.</p>
              </>
            )}
          </div>
          {isPanelOpen && (
            <>
              <div className="tile-gallery" role="list">
                {Object.entries(TILE_PROVIDERS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    className={`tile-card ${providerKey === key ? 'is-active' : ''}`}
                    onClick={() => setProviderKey(key)}
                    style={{ background: TILE_SWATCHES[key] || TILE_SWATCHES.carto }}
                    aria-pressed={providerKey === key}
                    aria-label={`Cambiar a ${p.name}`}
                  >
                    <span className="tile-card__name">{p.name}</span>
                    <span className="tile-card__desc">{TILE_DESCRIPTIONS[key] || 'Vista cartográfica'}</span>
                  </button>
                ))}
              </div>
              <div className="panel-hint">Tip: alterna entre vistas de mapas segun tu elección.</div>
            </>
          )}
        </section>

        <section className="mapview__panel fade-slide-in delay-1">
          <div className="mapview__panel-head">
            <div className="mapview__panel-toggle-row">
              <p className="eyebrow" style={{ margin: 0 }}>Guía contextual</p>
              <button onClick={() => setIsGuideOpen(!isGuideOpen)} type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <img src={isGuideOpen ? upIcon : downIcon} alt={isGuideOpen ? "Contraer" : "Desplegar"} />
              </button>
            </div>
            {isGuideOpen && <h2>No pierdas de vista los pasos clave.</h2>}
          </div>
          {isGuideOpen && (
            <>
              <ol className="mapview__steps" aria-label="Instrucciones de uso">
                <li>Acerca o aleja con el trackpad o los botones.</li>
                <li>Haz click sobre un marcador para ver detalles de la especie.</li>
              </ol>
              <div className="status-grid">
                <article className="status-card">
                  <h3>Ubicación seleccionada</h3>
                  <p>Latitud <strong>{clickedLat.toFixed(4)}</strong></p>
                  <p>Longitud <strong>{clickedLng.toFixed(4)}</strong></p>
                  <span>Sincronizada desde el globo 3D.</span>
                </article>
                <article className="status-card">
                  <h3>Marcadores cargados</h3>
                  <p className="status-count">{markers.length}</p>
                  <span>{hasMarkers ? 'Filtra nuevamente en Explorer para actualizar.' : 'Aún no hay resultados para esta vista.'}</span>
                </article>
              </div>
            </>
          )}
        </section>

      </div>

      {(selectedSpecies || hasMarkers) && (
        <div className="mapview__floating">
          {selectedSpecies && (
            <div className="mapview__floating-card fade-slide-in is-visible">
              <div className="mapview__floating-head">
                <p>Ficha seleccionada</p>
                <span>Haz click en otro marcador para actualizar la especie.</span>
              </div>
              <SpeciesInfoCard species={selectedSpecies} onClose={handleCloseCard} />
            </div>
          )}
          {hasMarkers && (
            <div className="mapview__badge">Marcadores activos: {markers.length}</div>
          )}
        </div>
      )}

      <div className="mapview__cta-bottom fade-slide-in">
        <p className="mapview__analytics-title">¿Quieres ver los gráficos?</p>
        <span>Explora tendencias y comparativos en el panel de análisis.</span>
        <Button
          as={Link}
          to="/analisis"
          size="sm"
          variant="primary"
          className="mapview__analytics-btn"
        >
          Ir al área de análisis
        </Button>
      </div>
    </div>
  );
}

export default MapView;
