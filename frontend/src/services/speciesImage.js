// Servicio para obtener imágenes de especies por nombre científico

const IMAGE_CACHE = new Map();
const buildCacheKey = (scientificName) =>
  typeof scientificName === 'string' ? scientificName.trim().toLowerCase() : null;

const handleAbortableError = (error, label) => {
  if (error?.name === 'AbortError') {
    throw error;
  }
  console.error(`Error fetching from ${label}:`, error);
  return null;
};

// iNaturalist API
export const getSpeciesImageFromINaturalist = async (scientificName, options = {}) => {
  const { signal } = options;
  try {
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`,
      { signal }
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const taxon = data.results[0];
      return {
        imageUrl: taxon.default_photo?.medium_url || taxon.default_photo?.url,
        largeImageUrl: taxon.default_photo?.large_url,
        thumbUrl: taxon.default_photo?.square_url,
        commonName: taxon.preferred_common_name,
        wikipediaUrl: taxon.wikipedia_url,
        source: 'iNaturalist',
        license: 'CC BY-NC',
        taxonId: taxon.id
      };
    }
    return null;
  } catch (error) {
    return handleAbortableError(error, 'iNaturalist');
  }
};

export const getSpeciesImageFromGBIF = async (scientificName, options = {}) => {
  const { signal } = options;
  try {
    const matchResponse = await fetch(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`,
      { signal }
    );
    const matchData = await matchResponse.json();
    
    if (matchData.usageKey) {
      const mediaResponse = await fetch(
        `https://api.gbif.org/v1/species/${matchData.usageKey}/media`,
        { signal }
      );
      const mediaData = await mediaResponse.json();
      
      if (mediaData.results && mediaData.results.length > 0) {
        const firstMedia = mediaData.results[0];
        return {
          imageUrl: firstMedia.identifier,
          source: 'GBIF',
          license: firstMedia.license,
          creator: firstMedia.creator,
          usageKey: matchData.usageKey
        };
      }
    }
    return null;
  } catch (error) {
    return handleAbortableError(error, 'GBIF');
  }
};


// Función principal con fallback (intenta múltiples fuentes)
export const getSpeciesImage = async (scientificName, options = {}) => {
  if (!scientificName) return null;
  const cacheKey = buildCacheKey(scientificName);
  if (cacheKey && IMAGE_CACHE.has(cacheKey)) {
    return IMAGE_CACHE.get(cacheKey);
  }
  
  // Intentar iNaturalist primero (mejor para biodiversidad)
  let result = await getSpeciesImageFromINaturalist(scientificName, options);
  if (result?.imageUrl) {
    if (cacheKey) IMAGE_CACHE.set(cacheKey, result);
    return result;
  }
  
  // Fallback a GBIF
  result = await getSpeciesImageFromGBIF(scientificName, options);
  if (result?.imageUrl) {
    if (cacheKey) IMAGE_CACHE.set(cacheKey, result);
    return result;
  }
  
  return null;
};

// Función para obtener múltiples imágenes de una especie
export const getSpeciesGallery = async (scientificName, limit = 5, options = {}) => {
  const { signal } = options;
  try {
    const response = await fetch(
      `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(scientificName)}&quality_grade=research&has[]=photos&per_page=${limit}&order=desc&order_by=votes`,
      { signal }
    );
    const data = await response.json();
    
    if (data.results) {
      return data.results.map(obs => ({
        imageUrl: obs.photos[0]?.url.replace('square', 'medium'),
        largeUrl: obs.photos[0]?.url.replace('square', 'large'),
        location: obs.place_guess,
        date: obs.observed_on,
        user: obs.user?.login,
        license: obs.license_code
      }));
    }
    return [];
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching gallery:', error);
    return [];
  }
};