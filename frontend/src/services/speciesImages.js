// Servicio para obtener imágenes de especies por nombre científico

// iNaturalist API
export const getSpeciesImageFromINaturalist = async (scientificName) => {
  try {
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`
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
    console.error('Error fetching from iNaturalist:', error);
    return null;
  }
};

export const getSpeciesImageFromGBIF = async (scientificName) => {
  try {
    const matchResponse = await fetch(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`
    );
    const matchData = await matchResponse.json();
    
    if (matchData.usageKey) {
      const mediaResponse = await fetch(
        `https://api.gbif.org/v1/species/${matchData.usageKey}/media`
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
    console.error('Error fetching from GBIF:', error);
    return null;
  }
};


// Función principal con fallback (intenta múltiples fuentes)
export const getSpeciesImage = async (scientificName) => {
  if (!scientificName) return null;
  
  // Intentar iNaturalist primero (mejor para biodiversidad)
  let result = await getSpeciesImageFromINaturalist(scientificName);
  if (result?.imageUrl) return result;
  
  // Fallback a GBIF
  result = await getSpeciesImageFromGBIF(scientificName);
  if (result?.imageUrl) return result;
  
  return null;
};

// Función para obtener múltiples imágenes de una especie
export const getSpeciesGallery = async (scientificName, limit = 5) => {
  try {
    const response = await fetch(
      `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(scientificName)}&quality_grade=research&has[]=photos&per_page=${limit}&order=desc&order_by=votes`
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
    console.error('Error fetching gallery:', error);
    return [];
  }
};
