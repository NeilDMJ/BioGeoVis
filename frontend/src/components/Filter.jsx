import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [adv, setAdv] = useState({
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
  });
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
    const controller = new AbortController();
    const debounce = setTimeout(() => {
      setSuggestionLoading(true);
      setSuggestionError(null);
      fetchLocationSuggestions(term, { signal: controller.signal })
        .then((results) => setLocationSuggestions(results))
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("[Filter] Location suggestions error", error);
          setSuggestionError(error.message || "Sin coincidencias");
          setLocationSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionLoading(false);
        });
    }, 250);
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
    onSearch?.(term);
  };

  const handleSuggestionSelect = (value) => {
    setSearch(value);
    setLocationSuggestions([]);
    triggerSearch(value);
  };

  const applyCoords = (e) => {
    e.preventDefault();
    const lat = parseFloat(coords.lat);
    const lon = parseFloat(coords.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      onApplyCoordinates?.({ lat, lon });
    } else {
      alert("Introduce latitud y longitud válidas.");
    }
  };

  const updateAdv = (k) => (e) =>
    setAdv((f) => ({ ...f, [k]: e.target.value }));

  const applyAdv = (e) => {
    e.preventDefault();
    if (adv.fechaInicio && adv.fechaFin && adv.fechaInicio > adv.fechaFin) {
      alert("La fecha de inicio no puede ser mayor que la fecha fin.");
      return;
    }
    onApplyAdvancedFilters?.(adv);
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
            <form onSubmit={applyAdv}>
              <div className="grid-2">
                {[
                  ["nombreComun", "Nombre común", "Ej. Jaguar, Águila..."],
                  ["nombreCientifico", "Nombre científico", "Ej. Panthera onca"],
                ].map(([k, label, ph]) => (
                  <div className="field" key={k}>
                    <label>{label}</label>
                    <input
                      type="text"
                      placeholder={ph}
                      value={adv[k]}
                      onChange={updateAdv(k)}
                    />
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

              <button className="primary-btn mt" type="submit">
                Aplicar filtros
              </button>
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
                    triggerSearch();
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
                  {locationSuggestions.map(({ label, type }) => (
                    <button
                      type="button"
                      key={`${type}-${label}`}
                      className="search-suggestions__item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSuggestionSelect(label);
                      }}
                    >
                      <span>{label}</span>
                      <span className="pill">{LOCATION_TYPE_LABELS[type] || type}</span>
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
