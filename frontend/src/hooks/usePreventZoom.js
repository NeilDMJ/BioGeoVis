import { useEffect } from 'react';

/**
 * Hook que previene el zoom del navegador con Ctrl+scroll y Ctrl+/-
 * Mantiene la escala de la página consistente en todos los dispositivos
 */
export function usePreventZoom() {
  useEffect(() => {
    // Prevenir zoom con Ctrl + scroll
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Prevenir zoom con Ctrl + / Ctrl -
    const handleKeydown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }
    };

    // Prevenir zoom táctil (pinch zoom) en dispositivos móviles
    const handleTouchMove = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Agregar listeners con passive: false para poder prevenir el comportamiento
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
}

export default usePreventZoom;
