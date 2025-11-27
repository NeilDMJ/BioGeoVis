import L from 'leaflet';

export const TILE_PROVIDERS = {
  carto: {
    name: 'Mapa Street',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  },
  osm: {
    name: 'Mapa Estandar  ',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  },
  opentopo: {
    name: 'Mapa con relieve',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  },
  wikimedia: {
    name: 'Mapa Cartografico',
    url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
    attribution: 'Wikimedia maps'
  },
  esri: {
    name: 'Mapa satelital',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  cartoDark: {
    name: 'Mapa termico',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

export const MAP_VIEW_PRESETS = {
  Estandar: { key: 'carto', tone: 'neutral' },
  Relieve: { key: 'opentopo', tone: 'relief' },
  Termico: { key: 'cartoDark', tone: 'thermal' }
};

export const MAP_MAX_BOUNDS = [[-85, -180], [85, 180]];

const TAXONOMY_TEMPLATE = {
  kingdom: null,
  phylum: null,
  class: null,
  order: null,
  family: null,
  genus: null,
  species: null
};

export const singlePointIcon = L.divIcon({
  html: '<div style="font-size: 20px; line-height:20px;">📍</div>',
  className: 'single-point-icon',
  iconSize: [24, 24]
});

const pinIconCache = new Map();

export function darkenHex(hex, amt = 0.15) {
  try {
    const c = hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * (1 - amt))));
    const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * (1 - amt))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * (1 - amt))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return hex;
  }
}

export function getPinIcon(color = '#F44336') {
  const key = color.toLowerCase();
  if (pinIconCache.has(key)) return pinIconCache.get(key);
  const shade = darkenHex(color, 0.25);
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='22' height='32' viewBox='0 0 26 38'>
      <defs>
        <linearGradient id='grad' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='${color}'/>
          <stop offset='100%' stop-color='${shade}'/>
        </linearGradient>
        <filter id='dropShadow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='1' result='blur'/>
          <feOffset in='blur' dx='0' dy='1' result='offset'/>
          <feMerge>
            <feMergeNode in='offset'/>
            <feMergeNode in='SourceGraphic'/>
          </feMerge>
        </filter>
      </defs>
      <path filter='url(#dropShadow)' fill='url(#grad)' d='M13 0C6 0 0.5 5.4 0.5 12.1c0 8.7 9.8 15.7 11.9 24 0.2 0.8 1.4 0.8 1.7 0 2.1-8.3 11.9-15.3 11.9-24C26 5.4 20 0 13 0z'/>
      <circle cx='13' cy='12' r='4.2' fill='#fff'/>
    </svg>`);
  const icon = L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [22, 32],
    iconAnchor: [11, 32],
    popupAnchor: [0, -26]
  });
  pinIconCache.set(key, icon);
  return icon;
}

export function ensureSpeciesInfo(marker) {
  if (!marker) return marker;
  const info = marker.speciesInfo || {};
  return {
    ...marker,
    speciesInfo: {
      scientificName: info.scientificName || marker.label || 'Especie sin nombre',
      taxonomy: { ...TAXONOMY_TEMPLATE, ...(info.taxonomy || {}) },
      imageUrl: info.imageUrl || null,
      commonName: info.commonName || null,
      source: info.source || null
    }
  };
}
