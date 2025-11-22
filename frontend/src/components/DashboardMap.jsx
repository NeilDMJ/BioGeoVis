import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ensureSpeciesInfo,
  getPinIcon,
  MAP_MAX_BOUNDS,
  MAP_VIEW_PRESETS,
  TILE_PROVIDERS,
  singlePointIcon
} from '../utils/mapConfig';

const DEFAULT_CENTER = [0.4326, -10.1332];

function DashboardMap({
  viewMode = 'Estandar',
  markers = [],
  highlightMarker,
  manualMarker,
  loading,
  error,
  onMarkerSelect,
  selectedMarker
}) {
  const mapRef = useRef(null);

  const providerKey = MAP_VIEW_PRESETS[viewMode]?.key || MAP_VIEW_PRESETS.Estandar.key;
  const provider = TILE_PROVIDERS[providerKey];

  const datasetMarkers = useMemo(() => (markers || []).map(ensureSpeciesInfo), [markers]);

  const manual = useMemo(() => (manualMarker ? ensureSpeciesInfo(manualMarker) : null), [manualMarker]);
  const search = useMemo(() => (highlightMarker ? ensureSpeciesInfo(highlightMarker) : null), [highlightMarker]);

  const combinedMarkers = useMemo(() => {
    const base = datasetMarkers.map((marker) => ({ ...marker, __origin: 'dataset' }));
    if (manual) base.push({ ...manual, __origin: 'manual' });
    if (search) base.push({ ...search, __origin: 'search' });
    return base;
  }, [datasetMarkers, manual, search]);

  const hasMarkers = combinedMarkers.length > 0;

  useEffect(() => {
    if (!mapRef.current || !hasMarkers) return;
    if (combinedMarkers.length === 1) {
      const marker = combinedMarkers[0];
      mapRef.current.setView([marker.lat, marker.lng], 6, { animate: true });
      return;
    }
    const latitudes = combinedMarkers.map((m) => m.lat);
    const longitudes = combinedMarkers.map((m) => m.lng);
    const bounds = [
      [Math.min(...latitudes), Math.min(...longitudes)],
      [Math.max(...latitudes), Math.max(...longitudes)]
    ];
    mapRef.current.fitBounds(bounds, { padding: [30, 30], animate: true });
  }, [combinedMarkers, hasMarkers]);

  const center = useMemo(() => {
    if (!hasMarkers) return DEFAULT_CENTER;
    if (combinedMarkers.length === 1) {
      const { lat, lng } = combinedMarkers[0];
      return [lat, lng];
    }
    const sum = combinedMarkers.reduce(
      (acc, marker) => ({ lat: acc.lat + marker.lat, lng: acc.lng + marker.lng }),
      { lat: 0, lng: 0 }
    );
    return [sum.lat / combinedMarkers.length, sum.lng / combinedMarkers.length];
  }, [combinedMarkers, hasMarkers]);

  const renderPopup = (marker) => (
    <div style={{ fontSize: 13 }}>
      <strong>{marker.label || 'Avistamiento'}</strong>
      <br />
      Lat: {marker.lat.toFixed(4)}
      <br />
      Lng: {marker.lng.toFixed(4)}
    </div>
  );

  return (
    <div className={`dashboard-map ${MAP_VIEW_PRESETS[viewMode]?.tone || 'neutral'}-tone`}>
      <div className="dashboard-map__status-bar">
        <span>{provider?.name || 'Mapa base'}</span>
        <span>{combinedMarkers.length} puntos renderizados</span>
      </div>
      <div className="dashboard-map__canvas">
        <MapContainer
          center={center}
          zoom={hasMarkers ? 4 : 3}
          minZoom={2}
          zoomSnap={0}
          maxBounds={MAP_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom
          whenCreated={(instance) => {
            mapRef.current = instance;
          }}
          style={{ height: '100%', width: '100%' }}
        >
          {provider && <TileLayer attribution={provider.attribution} url={provider.url} />}
          {!hasMarkers && (
            <Marker position={DEFAULT_CENTER} icon={singlePointIcon}>
              <Popup>Sin puntos coincidentes aún</Popup>
            </Marker>
          )}
          {hasMarkers &&
            combinedMarkers.map((marker, index) => (
              <Marker
                key={`${marker.lat}-${marker.lng}-${marker.__origin}-${index}`}
                position={[marker.lat, marker.lng]}
                eventHandlers={{ click: () => onMarkerSelect?.(marker) }}
                icon={getPinIcon(marker.__origin === 'manual' ? '#ffb347' : marker.__origin === 'search' ? '#34d399' : marker.color || '#ff6b6b')}
              >
                <Popup>{renderPopup(marker)}</Popup>
              </Marker>
            ))}
        </MapContainer>
        {loading && (
          <div className="dashboard-map__overlay" aria-live="polite">
            <span>Cargando mapa...</span>
          </div>
        )}
        {error && !loading && (
          <div className="dashboard-map__overlay error" aria-live="polite">
            <span>{error}</span>
          </div>
        )}
      </div>
      {selectedMarker && (
        <div className="dashboard-map__selected">
          <span>En foco:</span>
          <strong>{selectedMarker.label || selectedMarker?.speciesInfo?.scientificName}</strong>
        </div>
      )}
    </div>
  );
}

export default DashboardMap;
