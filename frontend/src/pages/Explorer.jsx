import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Globe from 'globe.gl';
import Filter from '../components/Filter';
import LoadingModal from '../components/LoadingModal';
import { fetchAvistamientosAdvanced, persistAdvancedFilters } from '../services/api';
import './Explorer.css';

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
          if (markers && markers.length > 0) {
            setMarkers(markers);
            // Persistimos en sessionStorage para evitar pérdida de state en navegación/recargas
            try { sessionStorage.setItem('biogeovis:mapMarkers', JSON.stringify(markers)); } catch {}
            // Pequeño delay para mostrar el último paso del modal
            setTimeout(() => {
              if (!cancelled) {
                setLoading(false);
                // Navegar automáticamente al mapa con los marcadores
                navigate('/map', { state: { markers } });
              }
            }, 800);
          } else {
            setError('No se encontraron avistamientos con los filtros seleccionados');
            setLoading(false);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(e.message || 'Error al obtener avistamientos');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [advancedFilters, navigate]);

  const handleApplyAdvancedFilters = (filters) => {
    setAdvancedFilters(filters);
    persistAdvancedFilters(filters);
  };

  // Manejar navegación por coordenadas (desde búsqueda predictiva o coordenadas manuales)
  const handleApplyCoordinates = (coords) => {
    if (coords && coords.lat != null && coords.lon != null) {
      navigate('/map', { 
        state: { 
          lat: coords.lat, 
          lng: coords.lon,
          label: coords.label || 'Ubicación seleccionada'
        } 
      });
    }
  };

  const handleCloseError = () => {
    setError(null);
    setAdvancedFilters(null);
  };

  return (
    <>
      <LoadingModal 
        isOpen={loading} 
        error={null}
      />
      
      {error && !loading && (
        <div className="explorer-error-overlay" onClick={handleCloseError}>
          <div className="explorer-error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explorer-error-icon">⚠️</div>
            <h3>Sin resultados</h3>
            <p>{error}</p>
            <button className="explorer-error-btn" onClick={handleCloseError}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
      
      <div ref={globeEl} className="explorer-globe-canvas" />

      <header className="explorer-command-bar">
        <div className="explorer-brand">
          Explorador de Avistamientos
        </div>

        <div className="explorer-hints">
          <p>1. Gira y acerca el globo para ubicarte.</p>
          <p>2. Haz click en una región para abrir el mapa detallado.</p>
        </div>

        <div className="explorer-actions">
          <Button
            onClick={() => navigate('/')}
            variant="primary"
            size="sm"
            className="explorer-primary-btn"
          >
            Volver al inicio
          </Button>
        </div>
      </header>

      <aside className="explorer-filters-panel">
        <div className="explorer-panel-head">
          <h2>Filtrar avistamientos</h2>
          <p>Aplica búsquedas o coordenadas; mantendremos tus resultados al visitar el mapa.</p>
        </div>
        <div className="explorer-panel-body">
          <Filter
            onChangeView={(v) => console.log('vista:', v)}
            onSearch={(q) => console.log('buscar:', q)}
            onApplyCoordinates={handleApplyCoordinates}
            onApplyAdvancedFilters={handleApplyAdvancedFilters}
            showViewSection={false}
          />
        </div>
      </aside>
    </>
  );
}

export default Explorer;
