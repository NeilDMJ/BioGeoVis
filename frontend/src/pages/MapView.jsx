import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation, useNavigate } from 'react-router-dom';

// Solución para los iconos de marcadores
const customIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🐸</div>',
  className: 'my-div-icon',
  iconSize: [30, 30]
});

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

function MapView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [providerKey, setProviderKey] = useState('carto');
  const provider = TILE_PROVIDERS[providerKey];
  
  // Obtener las coordenadas de la ubicación (si vienen del globo)
  const clickedLat = location.state?.lat || 40.7128;
  const clickedLng = location.state?.lng || -74.0060;
  const position = [clickedLat, clickedLng];

  // Limites del mundo: evita desplazarse fuera de la proyección del mapa
  const maxBounds = [[-85, -180], [85, 180]]; // [southWest, northEast]

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón de regreso */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 1000, 
        background: 'rgba(255,255,255,0.9)', 
        padding: 8, 
        borderRadius: 6,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={() => navigate('/explorer')}
          style={{ 
            fontSize: 14, 
            padding: '8px 16px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ← Volver al Globo
        </button>
      </div>

      {/* Selector de tiles en la esquina superior derecha */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000, 
        background: 'rgba(255,255,255,0.9)', 
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
        {provider && provider.url && provider.url.includes('YOUR') && (
          <div style={{ marginTop: 6, color: '#b03636', fontSize: 11 }}>
            Este proveedor requiere reemplazar YOUR_API_KEY o YOUR_MAPBOX_TOKEN
          </div>
        )}
      </div>

      {/* Información de coordenadas */}
      <div style={{ 
        position: 'absolute', 
        bottom: 10, 
        left: 10, 
        zIndex: 1000, 
        background: 'rgba(255,255,255,0.9)', 
        padding: 10, 
        borderRadius: 6,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontSize: 12
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>📍 Ubicación seleccionada</div>
        <div>Latitud: {clickedLat.toFixed(4)}</div>
        <div>Longitud: {clickedLng.toFixed(4)}</div>
      </div>

      <MapContainer
        center={position}
        zoom={6}
        minZoom={1.5}      // no permitir zoom menor a 1.5
        zoomSnap={0}      // permitir zoom fraccional (no solo enteros)
        style={{ height: "100vh", width: "100vw" }}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution={provider.attribution}
          url={provider.url}
        />
        <Marker position={position} icon={customIcon}>
          <Popup>
            <div style={{ fontSize: 13 }}>
              <strong>Punto seleccionado</strong><br />
              Lat: {clickedLat.toFixed(4)}<br />
              Lng: {clickedLng.toFixed(4)}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;
