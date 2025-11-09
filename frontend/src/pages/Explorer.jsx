import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Globe from 'globe.gl';
import Filter from '../components/Filter';
import { fetchAvistamientosAdvanced } from '../services/api';

function Explorer() {
  const navigate = useNavigate();
  const globeEl = useRef();
  const globeRef = useRef(null);
  const [countries, setCountries] = useState(null);
  // Marcadores ya no se muestran en el globo; se pasan a MapView.
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Cuando se aplican filtros avanzados, consultar API y actualizar marcadores
  useEffect(() => {
    if (!advancedFilters) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { markers } = await fetchAvistamientosAdvanced(advancedFilters);
        if (!cancelled) {
          setMarkers(markers);
          // Persistimos en sessionStorage para evitar pérdida de state en navegación/recargas
          try { sessionStorage.setItem('biogeovis:mapMarkers', JSON.stringify(markers)); } catch {}
          // Navegar automáticamente al mapa con los marcadores (también pasamos un flag liviano)
          navigate('/map', { state: { markers } });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e.message || 'Error al obtener avistamientos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
        {loading && (
          <div style={{ fontSize: 12, color: '#fff' }}>Cargando avistamientos…</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: '#ffdddd' }}>Error: {error}</div>
        )}
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
          onChangeView={(v) => console.log('vista:', v)}
          onSearch={(q) => console.log('buscar:', q)}
          onApplyCoordinates={(c) => console.log('coords:', c)}
          onApplyAdvancedFilters={(f) => setAdvancedFilters(f)}
        />
      </div>
    </>
  );
}

export default Explorer;
