import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Globe from 'globe.gl';
import Filter from '../components/Filter';

function Explorer() {
  const navigate = useNavigate();
  const globeEl = useRef();
  const globeRef = useRef(null);
  const [countries, setCountries] = useState(null);
  const [markers, setMarkers] = useState([]);

  // filtros aplicados (avanzados)
  const [advancedFilters, setAdvancedFilters] = useState(null);

  useEffect(() => {
    const globe = Globe()
      (globeEl.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(window.innerWidth)
      .height(window.innerHeight)
      .showAtmosphere(true);

    globeRef.current = globe;
    globe.controls().autoRotate = false;

    globe.onGlobeClick(({ lat, lng }) => {
      navigate('/map', { state: { lat, lng } });
    });

    const handleResize = () => {
      globe.width(window.innerWidth).height(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      try { globe.controls().dispose(); } catch {}
    };
  }, [navigate]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !countries) return;
    globe
      .polygonsData(countries)
      .polygonCapColor(() => 'rgba(200,200,200,0.6)')
      .polygonSideColor(() => 'rgba(50,50,50,0.15)')
      .polygonStrokeColor(() => '#111')
      .polygonAltitude(0.002)
      .polygonLabel(({ properties }) => `<b>${properties.name}</b>`);
  }, [countries]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe
      .pointsData(markers)
      .pointLat(d => d.lat)
      .pointLng(d => d.lng)
      .pointAltitude(0.02)
      .pointRadius(0.2)
      .pointColor(d => d.color || '#ff0000')
      .pointLabel(d => d.label)
      .pointsMerge(true);
  }, [markers]);

  // Simulación: cuando se aplican filtros avanzados podrías hacer fetch
  useEffect(() => {
    if (!advancedFilters) return;
    console.log("Aplicar filtros avanzados:", advancedFilters);
    // TODO: fetch con advancedFilters y actualizar markers
  }, [advancedFilters]);

  return (
    <>
      <div
        ref={globeEl}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
          overflow: 'hidden'
        }}
      />

      {/* Overlay info existente */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 360, // deja espacio al panel
        zIndex: 1000,
        background: '#5682B1',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        maxWidth: '300px'
      }}>
        <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
          Explorador de Avistamientos
        </div>
        <div style={{ fontSize: 12, marginBottom: 6, color: '#FFE8DB' }}>
          Haz click en cualquier parte del globo para ver el mapa detallado.
        </div>
        <div style={{
          fontSize: 11,
          color: '#9ca3af',
          marginTop: 8,
          fontStyle: 'italic'
        }}>
          Usa el mouse para rotar y hacer zoom
        </div>
      </div>

      {/* Botón regreso */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 1000,
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <Button
          onClick={() => navigate('/')}
          variant="primary"
          size="sm"
        >
          ← Inicio
        </Button>
      </div>

      {/* Panel de filtros lado derecho */}
      <div className="explorer-filters-wrapper">
        <Filter
          onChangeView={(v) => console.log("vista:", v)}
          onSearch={(q) => console.log("buscar:", q)}
          onApplyCoordinates={(c) => console.log("coords:", c)}
          onApplyAdvancedFilters={(f) => setAdvancedFilters(f)}
        />
      </div>
    </>
  );
}

export default Explorer;
