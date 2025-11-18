import './SpeciesInfoCard.css';

const FALLBACK_IMAGE = 'https://placehold.co/400x260/1f2937/FFFFFF?text=BioGeoVis';

function SpeciesInfoCard({ species, onClose }) {
  if (!species) return null;
  const info = species.speciesInfo || {};
  const taxonomy = info.taxonomy || {};

  const taxonomyRows = [
    { label: 'Reino', value: taxonomy.kingdom },
    { label: 'Filo', value: taxonomy.phylum },
    { label: 'Clase', value: taxonomy.class },
    { label: 'Orden', value: taxonomy.order },
    { label: 'Familia', value: taxonomy.family },
    { label: 'Genero', value: taxonomy.genus },
    { label: 'Especie', value: taxonomy.species }
  ];

  const metadata = [
    info.commonName && { label: 'Nombre comun', value: info.commonName },
    info.source && { label: 'Fuente', value: info.source }
  ].filter(Boolean);

  const handleImageError = (event) => {
    if (event?.target?.src !== FALLBACK_IMAGE) {
      event.target.src = FALLBACK_IMAGE;
    }
  };

  return (
    <div className="species-card" role="dialog" aria-label="Detalle de especie">
      <button type="button" className="species-card__close" onClick={onClose} aria-label="Cerrar ficha">
        x
      </button>
      <div className="species-card__body">
        <div className="species-card__media">
          <img
            src={info.imageUrl || FALLBACK_IMAGE}
            alt={info.scientificName || species.label || 'Especie'}
            onError={handleImageError}
            loading="lazy"
          />
        </div>
        <div className="species-card__content">
          <p className="species-card__eyebrow">Especie registrada</p>
          <h3 className="species-card__title">{info.scientificName || species.label || 'Especie sin nombre'}</h3>
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
        </div>
      </div>
    </div>
  );
}

export default SpeciesInfoCard;
