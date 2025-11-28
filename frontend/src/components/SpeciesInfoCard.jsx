import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SpeciesInfoCard.css';
import { getSpeciesImage } from '../services/speciesImage';

const FALLBACK_IMAGE = 'https://placehold.co/400x260/1f2937/FFFFFF?text=BioGeoVis';

const buildBaseState = (species) => {
  const info = species?.speciesInfo || {};
  const baseImage = info.imageUrl || null;
  return {
    url: baseImage,
    loading: false,
    meta: baseImage
      ? {
          source: info.source || null,
          license: info.license || null
        }
      : null,
    error: null
  };
};

function SpeciesInfoCard({ species, onClose }) {
  const navigate = useNavigate();
  if (!species) return null;
  const info = species.speciesInfo || {};
  const taxonomy = info.taxonomy || {};
  const scientificName = info.scientificName || species.label || '';

  const [imageState, setImageState] = useState(() => buildBaseState(species));

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const baseImage = info.imageUrl || null;

    if (!scientificName) {
      setImageState({ url: baseImage, loading: false, meta: null, error: null });
      return () => controller.abort();
    }

    if (baseImage) {
      setImageState(buildBaseState(species));
      return () => controller.abort();
    }

    setImageState({ url: null, loading: true, meta: null, error: null });
    (async () => {
      try {
        const payload = await getSpeciesImage(scientificName, { signal: controller.signal });
        if (!isMounted) return;
        if (payload?.imageUrl) {
          setImageState({
            url: payload.imageUrl,
            loading: false,
            meta: {
              source: payload.source || 'iNaturalist',
              license: payload.license || null
            },
            error: null
          });
        } else {
          setImageState({ url: null, loading: false, meta: null, error: 'Sin imagen disponible' });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setImageState({ url: null, loading: false, meta: null, error: 'No se pudo cargar la imagen' });
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [species, info.imageUrl, scientificName]);

  const taxonomyRows = useMemo(() => ([
    { label: 'Reino', value: taxonomy.kingdom },
    { label: 'Filo', value: taxonomy.phylum },
    { label: 'Clase', value: taxonomy.class },
    { label: 'Orden', value: taxonomy.order },
    { label: 'Familia', value: taxonomy.family },
    { label: 'Genero', value: taxonomy.genus },
    { label: 'Especie', value: taxonomy.species }
  ]), [taxonomy]);

  const metadata = useMemo(() => (
    [
      info.commonName && { label: 'Nombre comun', value: info.commonName },
      info.source && { label: 'Fuente', value: info.source }
    ].filter(Boolean)
  ), [info.commonName, info.source]);

  const handleImageError = (event) => {
    if (event?.target?.src === FALLBACK_IMAGE) return;
    setImageState((prev) => ({ ...prev, url: null, error: 'Sin imagen disponible' }));
    event.target.src = FALLBACK_IMAGE;
  };

  const handleReadMore = () => {
    navigate('/species-detail', { state: { species } });
  };

  const resolvedImage = imageState.url || FALLBACK_IMAGE;

  return (
    <div className="species-card" role="dialog" aria-label="Detalle de especie">
      <button type="button" className="species-card__close" onClick={onClose} aria-label="Cerrar ficha">
        x
      </button>
      <div className="species-card__body">
        <div className={`species-card__media ${imageState.loading ? 'is-loading' : ''}`}>
          {imageState.loading && <div className="species-card__media-status">Cargando imagen...</div>}
          {!imageState.loading && imageState.error && (
            <div className="species-card__media-status error">{imageState.error}</div>
          )}
          <img
            src={resolvedImage}
            alt={info.scientificName || species.label || 'Especie'}
            onError={handleImageError}
            loading="lazy"
          />
          {imageState.meta?.source && (
            <span className="species-card__media-badge">Fuente: {imageState.meta.source}</span>
          )}
        </div>
        <div className="species-card__content">
          <p className="species-card__eyebrow">Especie registrada</p>
          <h3 className="species-card__title">{info.scientificName || species.label || 'Especie sin nombre'}</h3>
          {info.commonName && (
            <p className="species-card__common-name">
              <span className="species-card__common-name-label">Nombre común:</span> {info.commonName}
            </p>
          )}
          <div className="species-card__taxonomy">
            {taxonomyRows.map(({ label, value }) => (
              <div key={label} className="species-card__taxonomy-row">
                <span>{label}</span>
                <strong>{value || 'No registrado'}</strong>
              </div>
            ))}
          </div>
          {metadata.length > 0 && (
            <div className="species-card__meta">
              {metadata.map((meta) => (
                <div key={meta.label} className="species-card__meta-item">
                  <span>{meta.label}</span>
                  <strong>{meta.value}</strong>
                </div>
              ))}
            </div>
          )}
          <button 
            type="button" 
            className="species-card__read-more"
            onClick={handleReadMore}
          >
            
            Leer más sobre esta especie
          
          </button>
        </div>
      </div>
    </div>
  );
}

export default SpeciesInfoCard;
