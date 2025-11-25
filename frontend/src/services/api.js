// Api centralizado para los endpoints de avistamientos del backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiGet(path, { signal } = {}) {
  const url = `${BASE_URL}${path}`;
  // Log para diagnosticar consultas
  console.debug('[API] GET', url);
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status} fetching ${path}: ${text}`);
  }
  return res.json();
}

async function apiPost(path, body, signal) {
  const url = `${BASE_URL}${path}`;
  console.debug('[API] POST', url, body);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status} posting ${path}: ${text}`);
  }
  return res.json();
}

// Funcion que construye la ruta del endpoint de taxonomía a partir de los filtros; usa wildcard '*' para vacíos.
function buildTaxonomiaPath({ reino, filo, clase, orden, familia, genero, especie }) {
  const sanitize = v => (v && v.trim()) ? encodeURIComponent(v.trim()) : '*';
  const seg = [reino, filo, clase, orden, familia, genero, especie].map(sanitize);
  return `/api/avistamientos/taxonomia/${seg.join('/')}`;
}

const TAXONOMY_QUERY_KEYS = ['reino', 'filo', 'clase', 'orden', 'familia', 'genero', 'especie', 'pais'];

const buildQueryString = (params = {}) => {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string' && !value.trim()) return;
    qp.append(key, typeof value === 'string' ? value.trim() : value);
  });
  const query = qp.toString();
  return query ? `?${query}` : '';
};

const trimOrNull = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return String(value);
};

const firstTruthyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const extractImageUrl = (doc) => {
  const candidates = [
    doc?.ImagenUrl,
    doc?.Imagen?.Url,
    doc?.Imagen?.URL,
    doc?.Imagen,
    doc?.Media?.ImagenPrincipal,
    doc?.Media?.Imagenes?.[0],
    doc?.Media?.Imagenes?.[0]?.Url,
    doc?.Media?.Imagenes?.[0]?.URL,
    doc?.Media?.Imagenes?.[0]?.url,
    doc?.Foto,
    doc?.foto,
    doc?.FotoUrl,
    doc?.imageUrl,
    doc?.Imagenes?.[0]
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (typeof candidate === 'object') {
      const objectUrl = firstTruthyString(candidate.Url, candidate.URL, candidate.url, candidate.src);
      if (objectUrl) return objectUrl;
    }
  }
  return null;
};

// Función que transforma un documento de avistamiento del backend en un objeto marcador para el globo.
function toMarker(doc) {
  let lat = doc?.Ubicacion?.Geolocalizacion?.Latitud;
  let lng = doc?.Ubicacion?.Geolocalizacion?.Longitud;
  if (lat == null || lng == null) {
    // Alternativa: Ubicacion.Latitud/Longitud
    lat = doc?.Ubicacion?.Latitud;
    lng = doc?.Ubicacion?.Longitud;
  }
  if (lat == null || lng == null) {
    // Alternativa genérica: lat/lng en raíz
    lat = doc?.lat ?? doc?.latitude ?? doc?.Latitude;
    lng = doc?.lng ?? doc?.longitude ?? doc?.Longitude;
  }
  // Parse robusto de string, soportando coma decimal
  const toNum = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const s = v.replace(',', '.');
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };
  const latNum = toNum(lat);
  const lngNum = toNum(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
    const label = doc?.NombreCientifico || doc?.Taxonomia?.Especie || doc?._id || 'Avistamiento';
    const reino = doc?.Taxonomia?.Reino?.toLowerCase?.() || '';
    const colorMap = {
        animalia: '#ff6b6b',
        plantae: '#51cf66',
        fungi: '#845ef7',
        protista: '#339af0',
        monera: '#ffa94d'
    };
    const color = colorMap[reino] || '#ff0000';
    const taxonomy = {
      kingdom: trimOrNull(doc?.Taxonomia?.Reino),
      phylum: trimOrNull(doc?.Taxonomia?.Filo),
      class: trimOrNull(doc?.Taxonomia?.Clase),
      order: trimOrNull(doc?.Taxonomia?.Orden),
      family: trimOrNull(doc?.Taxonomia?.Familia),
      genus: trimOrNull(doc?.Taxonomia?.Genero),
      species: trimOrNull(doc?.Taxonomia?.Especie)
    };
    const speciesInfo = {
      scientificName: trimOrNull(doc?.NombreCientifico) || taxonomy.species || label,
      taxonomy,
      imageUrl: extractImageUrl(doc),
      commonName: trimOrNull(doc?.NombreComun),
      source: trimOrNull(doc?.Fuente || doc?.FuenteDatos || doc?.Dataset)
    };
    return { lat: latNum, lng: lngNum, label, color, speciesInfo };
}
// Match taxonomia para filtros avanzados.
function matchTaxonomia(doc, { reino, filo, clase, orden, familia, genero, especie }) {
    const tax = doc?.Taxonomia || {};
    function matches(fieldValue, filterValue) {
        if (!filterValue || filterValue === '*') return true;
        if (!fieldValue) return false;
        return String(fieldValue).toLowerCase() === String(filterValue).toLowerCase();
    }
    return (
        matches(tax.Reino, reino) &&
        matches(tax.Filo, filo) &&
        matches(tax.Clase, clase) &&
        matches(tax.Orden, orden) &&
        matches(tax.Familia, familia) &&
        matches(tax.Genero, genero) &&
        matches(tax.Especie, especie)
    );
}

// Funcion principal para obtener avistamientos según filtros avanzados.
export async function fetchAvistamientosAdvanced(filters) {
  const {
    nombreCientifico,
    especie,
    reino,
    filo,
    familia,
    clase,
    orden,
    genero,
    pais,
    ciudad,
    estado,
    fechaInicio,
    fechaFin,
  } = filters;
  const filoValue = filo || '';

  const hasTax = [reino, filoValue, clase, orden, familia, genero, especie].some(v => v && v.trim());
  const hasDateRange = fechaInicio && fechaFin;

  let data = [];

  if (hasDateRange && hasTax) {
    // Estrategia: primero fecha para reducir volumen y luego filtrar taxonomía en cliente.
    try {
      const fechaData = await apiGet(`/api/avistamientos/fecha/${encodeURIComponent(fechaInicio)}/${encodeURIComponent(fechaFin)}`);
      data = fechaData.filter(d => matchTaxonomia(d, { reino, filo: filoValue, clase, orden, familia, genero, especie }));
    } catch (e) {
      console.error('Error fetching by fecha+taxonomia:', e);
      throw e;
    }
  } else if (hasDateRange) {
    try {
      data = await apiGet(`/api/avistamientos/fecha/${encodeURIComponent(fechaInicio)}/${encodeURIComponent(fechaFin)}`);
    } catch (e) {
      console.error('Error fetching by fecha:', e);
      throw e;
    }
  } else if (hasTax) {
    try {
      data = await apiGet(buildTaxonomiaPath({ reino, filo: filoValue, clase, orden, familia, genero, especie }));
    } catch (e) {
      console.error('Error fetching by taxonomia:', e);
      throw e;
    }
  } else if (nombreCientifico && nombreCientifico.trim()) {
    try {
      data = await apiGet(`/api/avistamientos/nombre_cientifico/${encodeURIComponent(nombreCientifico.trim())}`);
    } catch (e) {
      console.error('Error fetching by nombre científico:', e);
      throw e;
    }
  } else if (pais && pais.trim()) {
    try {
      data = await apiGet(`/api/avistamientos/pais/${encodeURIComponent(pais.trim())}`);
    } catch (e) {
      console.error('Error fetching by país:', e);
      throw e;
    }
  } else if (ciudad && ciudad.trim()) {
    try {
      data = await apiGet(`/api/avistamientos/ciudad/${encodeURIComponent(ciudad.trim())}`);
    } catch (e) {
      console.error('Error fetching by ciudad:', e);
      throw e;
    }
  } else if (estado && estado.trim()) {
    try {
      data = await apiGet(`/api/avistamientos/estado/${encodeURIComponent(estado.trim())}`);
    } catch (e) {
      console.error('Error fetching by estado:', e);
      throw e;
    }
  } else if (especie && especie.trim()) {
    // Use taxonomia endpoint with only especie specified to leverage server logic; others wildcards.
    try {
      data = await apiGet(buildTaxonomiaPath({ reino: '', filo: '', clase: '', orden: '', familia: '', genero: '', especie }));
    } catch (e) {
      console.error('Error fetching by especie:', e);
      throw e;
    }
  } else {
    try {
      data = await apiGet('/api/avistamientos?limit=200');
    } catch (e) {
      console.error('Error fetching default avistamientos:', e);
      throw e;
    }
  }

 // Aqui se mapean a marcadores, filtrando entradas con coordenadas inválidas.
  const markers = data.map(toMarker).filter(Boolean);
  if (data.length && !markers.length) {
    console.debug('[API] Ningún marcador válido; ejemplo de documentos:', data.slice(0, 3));
  }
  console.debug('[API] Avistamientos recibidos:', data.length, 'Marcadores válidos:', markers.length);
  return { raw: data, markers };
}

export { toMarker };

export async function fetchTaxonomyOptions(filters = {}) {
  const params = {};
  TAXONOMY_QUERY_KEYS.forEach((key) => {
    const value = filters[key];
    if (typeof value === 'string' && value.trim()) {
      params[key] = value.trim();
    }
  });
  const query = buildQueryString(params);
  return apiGet(`/api/metadata/taxonomia/opciones${query}`);
}

export async function fetchLocationSuggestions(term, { signal, limit = 8 } = {}) {
  if (!term || term.trim().length < 2) {
    return [];
  }
  const query = buildQueryString({ q: term.trim(), limit });
  const payload = await apiGet(`/api/metadata/ubicaciones/sugerencias${query}`, { signal });
  return Array.isArray(payload?.results) ? payload.results : [];
}

export async function fetchAnalytics({ filters = {}, dimension = 'family', limit = 2000 } = {}, { signal } = {}) {
  return apiPost('/api/analytics/summary', {
    filters: filters || {},
    dimension,
    limit
  }, signal);
}

export async function fetchAnalyticsDetail({ chartId, filters = {}, dimension = 'family', limit = 12 } = {}, { signal } = {}) {
  if (!chartId) {
    throw new Error('chartId es requerido para obtener el detalle');
  }
  return apiPost('/api/analytics/detail', {
    chartId,
    filters: filters || {},
    dimension,
    limit
  }, signal);
}

export const ADVANCED_FILTERS_STORAGE_KEY = 'biogeovis:advancedFilters';

export function persistAdvancedFilters(filters) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADVANCED_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('No se pudo persistir filtros:', error);
  }
}

export function readPersistedFilters() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(ADVANCED_FILTERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('No se pudieron leer los filtros persistidos:', error);
    return null;
  }
}

export function clearPersistedFilters() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADVANCED_FILTERS_STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo limpiar filtros persistidos:', error);
  }
}
