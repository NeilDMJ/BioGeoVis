import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Globe from 'globe.gl';

function Explorer() {
  const navigate = useNavigate();
  const globeEl = useRef();
  const globeRef = useRef(null);
  const [countries, setCountries] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Cargar GeoJSON de países
  useEffect(() => {
    const url = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
    fetch(url)
      .then((r) => r.json())
      .then((geo) => {
        setCountries(geo.features);
      })
      .catch((err) => {
        console.error('No se pudo cargar GeoJSON de países:', err);
      });
  }, []);

  useEffect(() => {
    // Inicializar el globo
    const globe = Globe()
      (globeEl.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(window.innerWidth)
      .height(window.innerHeight)
      .showAtmosphere(true);

    globeRef.current = globe;

    // Configurar controles
    globe.controls().autoRotate = false;

    // Añadir comportamiento para navegar al mapa con click en el globo
    globe.onGlobeClick(({ lat, lng }) => {
      // Navegar a la vista de mapa con las coordenadas
      navigate('/map', { state: { lat, lng } });
    });

    // Ajustar tamaño cuando cambia el tamaño de la ventana
    const handleResize = () => {
      globe
        .width(window.innerWidth)
        .height(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        globe.controls().dispose();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambian los países, asignar polygonsData
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !countries) return;

    globe
      .polygonsData(countries)
      .polygonCapColor(() => 'rgba(200, 200, 200, 0.6)')
      .polygonSideColor(() => 'rgba(50, 50, 50, 0.15)')
      .polygonStrokeColor(() => '#111')
      .polygonAltitude(0.002)
      .polygonLabel(({ properties }) => `<b>${properties.name}</b>`);
  }, [countries]);

  // Cuando cambian los marcadores, actualizar puntosData
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .pointsData(markers)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointAltitude(0.02)
      .pointRadius(0.2)
      .pointColor((d) => d.color || '#ff0000')
      .pointLabel((d) => d.label)
      .pointsMerge(true);
  }, [markers]);

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

      {/* UI overlay */}
      <div style={{ 
        position: 'absolute', 
        top: 12, 
        right: 12, 
        zIndex: 1000, 
        background: 'rgba(255,255,255,0.9)', 
        padding: 12, 
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        maxWidth: '300px'
      }}>
        <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
           Explorador de Avistamientos
        </div>
        <div style={{ fontSize: 12, marginBottom: 6, color: '#555' }}>
          Haz click en cualquier parte del globo para ver el mapa detallado de esa ubicación.
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8, fontStyle: 'italic' }}>
           Usa el mouse para rotar y hacer zoom en el globo
        </div>
      </div>
      
      {/* Botón de regreso al inicio */}
      <div style={{ 
        position: 'absolute', 
        top: 12, 
        left: 12, 
        zIndex: 1000, 
        background: 'rgba(255,255,255,0.9)', 
        padding: 8, 
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            fontSize: 12, 
            padding: '8px 12px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ← Inicio
        </button>
      </div>
    </>
  );
}

export default Explorer;
