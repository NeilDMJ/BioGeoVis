import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

function HomeGlobe({ className }) {
  const globeEl = useRef();
  const animationRef = useRef();
  const globeRef = useRef();

  useEffect(() => {
    // Inicializar el globo
    const globe = Globe()
      (globeEl.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(globeEl.current.clientWidth)
      .height(globeEl.current.clientHeight)
      .showAtmosphere(true);

    globeRef.current = globe;

    // Configurar rotación automática optimizada
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;
    globe.controls().enableRotate = false;
    globe.controls().enableZoom = false;
    globe.controls().enablePan = false;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.08;
    globe.pointOfView({ altitude: 1.5 }, 0);

    const smoothRotate = () => {
      animationRef.current = requestAnimationFrame(smoothRotate);
      globe.controls().update?.();
    };
    smoothRotate();

    const handleVisibilityChange = () => {
      const controls = globe.controls();
      if (document.hidden) {
        controls.autoRotate = false;
      } else {
        controls.autoRotate = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      cancelAnimationFrame(animationRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      className={className}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }}
    />
  );
}

HomeGlobe.defaultProps = {
  className: ''
};

export default HomeGlobe;
