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

// Wikimedia Commons API - Gran colección de imágenes de especies
export const getSpeciesImageFromWikimedia = async (scientificName, options = {}) => {
  const { signal } = options;
  try {
    // Buscar en Wikimedia Commons usando la API de MediaWiki
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}&srnamespace=6&srlimit=1&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl, { signal });
    const searchData = await searchResponse.json();
    
    if (searchData.query?.search?.length > 0) {
      const fileName = searchData.query.search[0].title;
      // Obtener la URL de la imagen
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
      const imageResponse = await fetch(imageInfoUrl, { signal });
      const imageData = await imageResponse.json();
      
      const pages = imageData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        const imageInfo = page?.imageinfo?.[0];
        if (imageInfo?.url) {
          return {
            imageUrl: imageInfo.url,
            source: 'Wikimedia Commons',
            license: imageInfo.extmetadata?.LicenseShortName?.value || 'CC',
            creator: imageInfo.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || null
          };
        }
      }
    }
    return null;
  } catch (error) {
    return handleAbortableError(error, 'Wikimedia');
  }
};

// Encyclopedia of Life (EOL) API
export const getSpeciesImageFromEOL = async (scientificName, options = {}) => {
  const { signal } = options;
  try {
    // Primero buscar el ID de la especie
    const searchUrl = `https://eol.org/api/search/1.0.json?q=${encodeURIComponent(scientificName)}&page=1&exact=true`;
    const searchResponse = await fetch(searchUrl, { signal });
    const searchData = await searchResponse.json();
    
    if (searchData.results?.length > 0) {
      const eolId = searchData.results[0].id;
      // Obtener información detallada con imágenes
      const pageUrl = `https://eol.org/api/pages/1.0/${eolId}.json?images_per_page=1&details=true`;
      const pageResponse = await fetch(pageUrl, { signal });
      const pageData = await pageResponse.json();
      
      if (pageData.dataObjects?.length > 0) {
        const imageObj = pageData.dataObjects.find(obj => obj.mediaURL);
        if (imageObj) {
          return {
            imageUrl: imageObj.mediaURL || imageObj.eolMediaURL,
            source: 'Encyclopedia of Life',
            license: imageObj.license || 'CC',
            creator: imageObj.agents?.find(a => a.role === 'photographer')?.full_name || null
          };
        }
      }
    }
    return null;
  } catch (error) {
    return handleAbortableError(error, 'EOL');
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

  // Fallback a Wikimedia Commons
  result = await getSpeciesImageFromWikimedia(scientificName, options);
  if (result?.imageUrl) {
    if (cacheKey) IMAGE_CACHE.set(cacheKey, result);
    return result;
  }

  // Fallback a Encyclopedia of Life
  result = await getSpeciesImageFromEOL(scientificName, options);
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