import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Clustering 
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import SpeciesInfoCard from '../components/SpeciesInfoCard';

// Icono fallback para un único punto 
const singlePointIcon = L.divIcon({
  html: '<div style="font-size: 20px; line-height:20px;">📍</div>',
  className: 'single-point-icon',
  iconSize: [24, 24]
});

// Cache de íconos tipo pin por color para evitar recrearlos 
const pinIconCache = new Map();
function darkenHex(hex, amt = 0.15) {
  try {
    const c = hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * (1 - amt))));
    const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * (1 - amt))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * (1 - amt))));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  } catch { return hex; }
}
function getPinIcon(color = '#F44336') {
  const key = color.toLowerCase();
  if (pinIconCache.has(key)) return pinIconCache.get(key);
  const shade = darkenHex(color, 0.25);
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='22' height='32' viewBox='0 0 26 38'>
      <defs>
        <linearGradient id='grad' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='${color}'/>
          <stop offset='100%' stop-color='${shade}'/>
        </linearGradient>
        <filter id='dropShadow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='1' result='blur'/>
          <feOffset in='blur' dx='0' dy='1' result='offset'/>
          <feMerge>
            <feMergeNode in='offset'/>
            <feMergeNode in='SourceGraphic'/>
          </feMerge>
        </filter>
      </defs>
      <path filter='url(#dropShadow)' fill='url(#grad)' d='M13 0C6 0 0.5 5.4 0.5 12.1c0 8.7 9.8 15.7 11.9 24 0.2 0.8 1.4 0.8 1.7 0 2.1-8.3 11.9-15.3 11.9-24C26 5.4 20 0 13 0z'/>
      <circle cx='13' cy='12' r='4.2' fill='#fff'/>
    </svg>`);
  const icon = L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [22, 32],
    iconAnchor: [11, 32],
    popupAnchor: [0, -26]
  });
  pinIconCache.set(key, icon);
  return icon;
}

// Proveedores de tiles 
const TILE_PROVIDERS = {
  carto: {
    name: 'CARTO Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  },
  opentopo: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  },
  wikimedia: {
    name: 'Wikimedia',
    url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
    attribution: 'Wikimedia maps'
  },
  esri: {
    name: 'Esri WorldImagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
};

const TAXONOMY_TEMPLATE = {
  kingdom: null,
  phylum: null,
  class: null,
  order: null,
  family: null,
  genus: null,
  species: null
};

const ensureSpeciesInfo = (marker) => {
  if (!marker) return marker;
  const info = marker.speciesInfo || {};
  return {
    ...marker,
    speciesInfo: {
      scientificName: info.scientificName || marker.label || 'Especie sin nombre',
      taxonomy: { ...TAXONOMY_TEMPLATE, ...(info.taxonomy || {}) },
      imageUrl: info.imageUrl || null,
      commonName: info.commonName || null,
      source: info.source || null
    }
  };
};

function MapView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [providerKey, setProviderKey] = useState('carto');
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

  const maxBounds = [[-85, -180], [85, 180]]; 
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
    } catch {}
  }, [markers]);

  useEffect(() => {
    if (!hasMarkers) setSelectedSpecies(null);
  }, [hasMarkers]);

  const handleMarkerSelect = useCallback((markerPayload) => {
    setSelectedSpecies(markerPayload ? ensureSpeciesInfo(markerPayload) : null);
  }, []);

  const handleCloseCard = useCallback(() => setSelectedSpecies(null), []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón de regreso */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 1000,   
        borderRadius: 6,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <Button 
          onClick={() => navigate('/explorer')}
          variant="primary"
        >
          ← Volver al Globo
        </Button>
      </div>

      {/* Selector de tiles en la esquina superior derecha */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000, 
        background: '#5682B1', 
        padding: 8, 
        borderRadius: 6,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <label style={{ marginRight: 8, fontSize: 12, fontWeight: 600 }}>Estilo de Mapa:</label>
        <select 
          value={providerKey} 
          onChange={(e) => setProviderKey(e.target.value)} 
          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4 }}
        >
          {Object.entries(TILE_PROVIDERS).map(([key, p]) => (
            <option key={key} value={key}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Información de coordenadas */}
      <div style={{ 
        position: 'absolute', 
        bottom: 10, 
        left: 10, 
        zIndex: 1000, 
        background: '#5682B1', 
        padding: 10, 
        borderRadius: 6,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontSize: 12
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Ubicación seleccionada</div>
        <div>Latitud: {clickedLat.toFixed(4)}</div>
        <div>Longitud: {clickedLng.toFixed(4)}</div>
      </div>

      <MapContainer
        center={position}
        zoom={hasMarkers ? 3 : 6}
        minZoom={1.5}      
        zoomSnap={0}      // permitir zoom fraccional 
        style={{ height: "100vh", width: "100vw" }}
        maxBounds={maxBounds}
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
            markers.map((m,i) => (
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
      {(selectedSpecies || hasMarkers) && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end',
          width: 'min(420px, calc(100vw - 20px))'
        }}>
          {selectedSpecies && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <SpeciesInfoCard species={selectedSpecies} onClose={handleCloseCard} />
            </div>
          )}
          {hasMarkers && (
            <div style={{
              background: '#1f2937',
              color: '#f9fafb',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}>
              Marcadores: {markers.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapView;
