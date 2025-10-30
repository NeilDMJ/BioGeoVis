import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

function HomeGlobe() {
  const globeEl = useRef();

  useEffect(() => {
    // Inicializar el globo
    const globe = Globe()
      (globeEl.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(globeEl.current.clientWidth)
      .height(globeEl.current.clientHeight)
      .showAtmosphere(true);

    // Configurar rotación automática para la página de inicio
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.8;
    globe.controls().enableZoom = true;

    // Ajustar tamaño cuando cambia el tamaño de la ventana
    const handleResize = () => {
      if (globeEl.current) {
        globe
          .width(globeEl.current.clientWidth)
          .height(globeEl.current.clientHeight);
      }
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
  }, []);

  return (
    <div 
      ref={globeEl} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }}
    />
  );
}

export default HomeGlobe;
