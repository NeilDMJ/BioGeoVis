export const TAXONOMY_KEYS = [
  "nombreComun",
  "reino",
  "filo",
  "clase",
  "orden",
  "familia",
  "genero",
  "especie",
  "pais",
];

// Solo los campos que aparecen como SELECT dropdown (no nombreComun que es input de texto)
export const TAXONOMY_SELECTS = [
  { key: "reino", label: "Reino", placeholder: "Todos los reinos" },
  { key: "filo", label: "Filo", placeholder: "Filtrar por filo" },
  { key: "clase", label: "Clase", placeholder: "Filtrar por clase" },
  { key: "orden", label: "Orden", placeholder: "Filtrar por orden" },
  { key: "familia", label: "Familia", placeholder: "Filtrar por familia" },
  { key: "genero", label: "Género", placeholder: "Filtrar por género" },
  { key: "especie", label: "Especie", placeholder: "Filtrar por especie" },
  { key: "pais", label: "País", placeholder: "Selecciona un país" },
];

export const EMPTY_TAXONOMY_OPTIONS = TAXONOMY_KEYS.reduce((acc, key) => {
  acc[key] = [];
  return acc;
}, {});
