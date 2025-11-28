import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Filter.css";
import { fetchLocationSuggestions } from "../services/api";
import { useTaxonomyOptions } from "../hooks/useTaxonomyOptions";
import { TAXONOMY_KEYS, TAXONOMY_SELECTS } from "../constants/taxonomy";

const VIEW_FALLBACK = ["Estandar", "Relieve", "Termico"];
const LOCATION_TYPE_LABELS = {
  ciudad: "Ciudad",
  estado: "Estado",
  municipio: "Municipio",
  localidad: "Localidad",
  pais: "País",
};

// ============ FUNCIONES DE VALIDACIÓN ============

/**
 * Valida si un texto es un término de búsqueda válido.
 * Permite nombres de especies, lugares, caracteres acentuados y ñ.
 * Rechaza cadenas sin sentido o solo caracteres especiales.
 */
const isValidSearchTerm = (text) => {
  if (!text || typeof text !== "string") return true; // Vacío es válido (opcional)
  const trimmed = text.trim();
  if (trimmed.length === 0) return true; // Vacío es válido
  if (trimmed.length < 2) return false; // Muy corto
  
  // Extraer solo caracteres alfabéticos (incluyendo acentos y ñ)
  const alphabetic = trimmed.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, "");
  if (alphabetic.length < 2) return false; // Debe tener al menos 2 letras
  
  // Detectar patrones sin sentido (solo consonantes o repeticiones excesivas)
  const vowels = alphabetic.match(/[aeiouáéíóúü]/gi) || [];
  if (alphabetic.length > 4 && vowels.length === 0) return false; // Sin vocales
  
  // Detectar repeticiones excesivas (ej: "aaaa", "xxxxx")
  if (/(.)\1{3,}/i.test(trimmed)) return false;
  
  return true;
};

/**
 * Verifica si hay al menos un filtro válido aplicado
 */
const hasValidFilter = (adv) => {
  const { nombreComun, nombreCientifico, especie, reino, filo, clase, orden, familia, genero, pais, fechaInicio, fechaFin } = adv;
  
  // Texto válido en campos de texto
  if (nombreComun?.trim() && isValidSearchTerm(nombreComun)) return true;
  if (nombreCientifico?.trim() && isValidSearchTerm(nombreCientifico)) return true;
  
  // Cualquier campo de taxonomía seleccionado
  if (especie?.trim()) return true;
  if (reino?.trim()) return true;
  if (filo?.trim()) return true;
  if (clase?.trim()) return true;
  if (orden?.trim()) return true;
  if (familia?.trim()) return true;
  if (genero?.trim()) return true;
  if (pais?.trim()) return true;
  
  // Rango de fechas completo
  if (fechaInicio && fechaFin) return true;
  
  return false;
};

// Estado inicial de los filtros
const INITIAL_ADV_STATE = {
  nombreComun: "",
  nombreCientifico: "",
  especie: "",
  reino: "",
  filo: "",
  clase: "",
  orden: "",
  familia: "",
  genero: "",
  pais: "",
  fechaInicio: "",
  fechaFin: "",
};

export default function Filter({
  onChangeView,
  onSearch,
  onApplyCoordinates,
  onApplyAdvancedFilters,
  initialView = "Termico",
  viewOptions,
  searchLoading = false,
  searchMessage,
  searchMessageTone = "muted",
  showViewSection = true, // Explorer lo desactiva para ocultar la barra de vista
}) {
  const viewModes = useMemo(() => {
    if (Array.isArray(viewOptions) && viewOptions.length) return viewOptions;
    return VIEW_FALLBACK;
  }, [viewOptions]);

  const [view, setView] = useState(initialView);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState({ lat: "", lon: "" });
  const [open, setOpen] = useState(false);
  const [adv, setAdv] = useState(INITIAL_ADV_STATE);
  const [validationErrors, setValidationErrors] = useState({});
  const [filterError, setFilterError] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const searchWrapperRef = useRef(null);

  const taxonomyFilters = useMemo(
    () =>
      TAXONOMY_KEYS.reduce((acc, key) => {
        // No incluir nombreComun en los filtros de taxonomía porque es texto libre
        if (key === "nombreComun") return acc;
        acc[key] = adv[key];
        return acc;
      }, {}),
    [adv.reino, adv.filo, adv.clase, adv.orden, adv.familia, adv.genero, adv.especie, adv.pais]
  );

  const { options: taxonomyOptions, loading: taxonomyLoading, error: taxonomyError } =
    useTaxonomyOptions(taxonomyFilters);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);


  // Solo resetear los campos SELECT cuando sus opciones cambian
  // nombreComun es texto libre, no debe resetearse
  const selectKeys = useMemo(() => TAXONOMY_SELECTS.map(s => s.key), []);
  
  useEffect(() => {
    setAdv((prev) => {
      let next = prev;
      let changed = false;
      selectKeys.forEach((key) => {
        const current = prev[key];
        if (!current) return;
        const available = taxonomyOptions[key] || [];
        const exists = available.some((option) => {
          if (typeof option !== "string") return false;
          return option.toLowerCase() === current.toLowerCase();
        });
        if (!exists && available.length) {
          if (!changed) next = { ...prev };
          next[key] = "";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [taxonomyOptions, selectKeys]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handler = (event) => {
      if (!searchWrapperRef.current) return;
      if (!searchWrapperRef.current.contains(event.target)) {
        setLocationSuggestions([]);
        setSuggestionError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setLocationSuggestions([]);
      setSuggestionError(null);
      setSuggestionLoading(false);
      return undefined;
    }
    
    // Validar que sea un término válido antes de buscar
    if (!isValidSearchTerm(term)) {
      setLocationSuggestions([]);
      setSuggestionError("Ingresa un término válido");
      setSuggestionLoading(false);
      return undefined;
    }
    
    const controller = new AbortController();
    const debounce = setTimeout(() => {
      setSuggestionLoading(true);
      setSuggestionError(null);
      
      // Usar OpenStreetMap Nominatim para búsqueda predictiva de ubicaciones
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=5&addressdetails=1`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'es' }
      })
        .then(res => res.json())
        .then(data => {
          const suggestions = data.map(item => {
            // Determinar el tipo de ubicación
            let type = 'localidad';
            if (item.type === 'country' || item.class === 'boundary' && item.addresstype === 'country') {
              type = 'pais';
            } else if (item.type === 'state' || item.type === 'province' || item.addresstype === 'state') {
              type = 'estado';
            } else if (item.type === 'city' || item.type === 'town' || item.addresstype === 'city') {
              type = 'ciudad';
            } else if (item.type === 'municipality') {
              type = 'municipio';
            }
            
            return {
              label: item.display_name.split(',').slice(0, 3).join(','),
              type,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon)
            };
          });
          setLocationSuggestions(suggestions);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("[Filter] Location suggestions error", error);
          setSuggestionError("Sin coincidencias");
          setLocationSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [search]);

  const selectView = (v) => {
    setView(v);
    onChangeView?.(v);
  };

  const triggerSearch = (customTerm) => {
    const term = (customTerm ?? search).trim();
    if (!term) return;
    
    // Verificar que hay al menos un filtro avanzado antes de buscar
    if (!hasValidFilter(adv)) {
      setFilterError("Selecciona al menos un filtro avanzado antes de buscar por ubicación");
      // Abrir el panel de filtros avanzados para que el usuario vea el error
      setOpen(true);
      return;
    }
    
    onSearch?.(term);
  };

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion.label);
    setLocationSuggestions([]);
    
    // Verificar que hay al menos un filtro avanzado antes de navegar
    if (!hasValidFilter(adv)) {
      setFilterError("Selecciona al menos un filtro avanzado antes de buscar por ubicación");
      // Abrir el panel de filtros avanzados para que el usuario vea el error
      setOpen(true);
      return;
    }
    
    // Si tiene coordenadas, navegar al mapa con esas coordenadas
    if (suggestion.lat && suggestion.lon) {
      onApplyCoordinates?.({ lat: suggestion.lat, lon: suggestion.lon, label: suggestion.label });
    } else {
      triggerSearch(suggestion.label);
    }
  };

  const applyCoords = (e) => {
    e.preventDefault();
    
    // Verificar que hay al menos un filtro avanzado antes de aplicar coordenadas
    if (!hasValidFilter(adv)) {
      setFilterError("Selecciona al menos un filtro avanzado antes de aplicar coordenadas");
      // Abrir el panel de filtros avanzados para que el usuario vea el error
      setOpen(true);
      return;
    }
    
    const lat = parseFloat(coords.lat);
    const lon = parseFloat(coords.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      onApplyCoordinates?.({ lat, lon });
    } else {
      alert("Introduce latitud y longitud válidas.");
    }
  };

  const updateAdv = (k) => (e) => {
    const value = e.target.value;
    setAdv((f) => ({ ...f, [k]: value }));
    // Limpiar error de validación cuando el usuario modifica el campo
    if (validationErrors[k]) {
      setValidationErrors((prev) => ({ ...prev, [k]: "" }));
    }
    // Limpiar error general de filtros
    if (filterError) {
      setFilterError("");
    }
  };

  // Función para limpiar todos los filtros
  const clearAllFilters = useCallback(() => {
    setAdv(INITIAL_ADV_STATE);
    setCoords({ lat: "", lon: "" });
    setSearch("");
    setValidationErrors({});
    setFilterError("");
    setLocationSuggestions([]);
  }, []);

  const applyAdv = (e) => {
    e.preventDefault();
    
    // Limpiar errores previos
    const errors = {};
    let hasError = false;
    
    // 1. Validar campos de texto
    if (adv.nombreComun?.trim() && !isValidSearchTerm(adv.nombreComun)) {
      errors.nombreComun = "Ingresa un término válido";
      hasError = true;
    }
    if (adv.nombreCientifico?.trim() && !isValidSearchTerm(adv.nombreCientifico)) {
      errors.nombreCientifico = "Ingresa un término válido";
      hasError = true;
    }
    
    // 2. Intercambiar fechas si están invertidas (sin mostrar error)
    let finalAdv = { ...adv };
    if (adv.fechaInicio && adv.fechaFin) {
      const inicio = new Date(adv.fechaInicio);
      const fin = new Date(adv.fechaFin);
      if (inicio > fin) {
        finalAdv = {
          ...adv,
          fechaInicio: adv.fechaFin,
          fechaFin: adv.fechaInicio,
        };
        setAdv(finalAdv); // Actualizar UI con fechas intercambiadas
      }
    }
    
    // 3. Verificar que hay al menos un filtro válido
    if (!hasValidFilter(finalAdv)) {
      setFilterError("Selecciona al menos un filtro para buscar");
      hasError = true;
    }
    
    if (hasError) {
      setValidationErrors(errors);
      return;
    }
    
    // Limpiar errores y aplicar
    setValidationErrors({});
    setFilterError("");
    onApplyAdvancedFilters?.(finalAdv);
  };

  return (
    <aside className={`filter-panel ${open ? "open" : ""}`}>
      <header
        className="panel-header clickable"
        onClick={() => setOpen((o) => !o)}
        title="Mostrar / ocultar filtros avanzados"
      >
        <span>Filtros</span>
        <span className="icon">{open ? "▾" : "▸"}</span>
      </header>

      <div className="panel-body">
        {open && (
          <section className="card advanced">
            <div className="section-header">
              <span>Filtros avanzados</span>
              {taxonomyLoading && <small className="taxonomy-status">Actualizando opciones…</small>}
            </div>
            {taxonomyError && (
              <p className="taxonomy-status error" role="alert">
                {taxonomyError}
              </p>
            )}
            {filterError && (
              <p className="filter-error" role="alert">
                 {filterError}
              </p>
            )}
            <form onSubmit={applyAdv}>
              <div className="grid-2">
                {[
                  ["nombreComun", "Nombre común", "Ej. Jaguar, Águila..."],
                  ["nombreCientifico", "Nombre científico", "Ej. Panthera onca"],
                ].map(([k, label, ph]) => (
                  <div className={`field ${validationErrors[k] ? "has-error" : ""}`} key={k}>
                    <label>{label}</label>
                    <input
                      type="text"
                      placeholder={ph}
                      value={adv[k]}
                      onChange={updateAdv(k)}
                      className={validationErrors[k] ? "input-error" : ""}
                    />
                    {validationErrors[k] && (
                      <span className="field-error">{validationErrors[k]}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="taxonomy-grid">
                {TAXONOMY_SELECTS.map(({ key, label, placeholder }) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <div className="select-control">
                      <select value={adv[key]} onChange={updateAdv(key)}>
                        <option value="">{placeholder}</option>
                        {(taxonomyOptions[key] || []).map((option) => (
                          <option key={`${key}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <details className="details">
                <summary>Rango de fechas</summary>
                <div className="dates">
                  <div className="field">
                    <label>Desde</label>
                    <input
                      type="date"
                      value={adv.fechaInicio}
                      onChange={updateAdv("fechaInicio")}
                    />
                  </div>
                  <div className="field">
                    <label>Hasta</label>
                    <input
                      type="date"
                      value={adv.fechaFin}
                      onChange={updateAdv("fechaFin")}
                    />
                  </div>
                </div>
              </details>

              <div className="filter-actions">
                <button className="primary-btn" type="submit">
                   Buscar
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={clearAllFilters}
                  title="Limpiar todos los filtros"
                >
                   Limpiar todo
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <div className="section-header">
            <span>Búsqueda predictiva</span>
          </div>
          <div className="field mt">
            <label>Término</label>
            <div className="search" ref={searchWrapperRef}>
              <input
                type="text"
                placeholder="Buscar país, ciudad o especie"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Si hay sugerencias con coordenadas, usar la primera
                    if (locationSuggestions.length > 0 && locationSuggestions[0].lat && locationSuggestions[0].lon) {
                      handleSuggestionSelect(locationSuggestions[0]);
                    } else {
                      triggerSearch();
                    }
                  }
                }}
                aria-autocomplete="list"
                aria-expanded={locationSuggestions.length > 0}
              />
              <button
                className="icon-btn search-btn"
                title="Buscar"
                type="button"
                disabled={searchLoading}
                onClick={() => triggerSearch()}
              >
                {searchLoading ? "..." : "Ir"}
              </button>

              {(locationSuggestions.length > 0 || suggestionLoading || suggestionError) && (
                <div className="search-suggestions" role="listbox">
                  {suggestionLoading && (
                    <p className="search-suggestions__status">Buscando coincidencias…</p>
                  )}
                  {suggestionError && !suggestionLoading && (
                    <p className="search-suggestions__status error">{suggestionError}</p>
                  )}
                  {locationSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={`${suggestion.type}-${suggestion.label}`}
                      className="search-suggestions__item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSuggestionSelect(suggestion);
                      }}
                    >
                      <span>{suggestion.label}</span>
                      <span className="pill">{LOCATION_TYPE_LABELS[suggestion.type] || suggestion.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {searchMessage && (
              <p className={`search-feedback ${searchMessageTone}`} aria-live="polite">
                {searchMessage}
              </p>
            )}
          </div>
        </section>

        {showViewSection && (
          <section className="card">
            <div className="section-header">
              <span>Vista</span>
              <button
                className="icon-btn"
                title="Ajustar a extensión"
                onClick={() => console.log("ajustar vista")}
              >
                ⤢
              </button>
            </div>

            <div className="segmented">
              {viewModes.map((v) => (
                <button
                  key={v}
                  className={`segmented-item ${view === v ? "active" : ""}`}
                  onClick={() => selectView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div className="section-header">
            <span>Coordenadas manuales</span>
          </div>

          <form onSubmit={applyCoords}>
            <div className="field">
              <label>Latitud</label>
              <input
                type="number"
                step="any"
                placeholder="Ej. 19.4326"
                value={coords.lat}
                onChange={(e) =>
                  setCoords((c) => ({ ...c, lat: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label>Longitud</label>
              <input
                type="number"
                step="any"
                placeholder="Ej. -99.1332"
                value={coords.lon}
                onChange={(e) =>
                  setCoords((c) => ({ ...c, lon: e.target.value }))
                }
              />
            </div>

            <button type="submit" className="primary-btn mt">
              Aplicar
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}
