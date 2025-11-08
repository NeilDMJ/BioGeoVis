import React, { useState } from "react";
import "./Filter.css";

export default function Filter({
  onChangeView,
  onSearch,
  onApplyCoordinates,
  onApplyAdvancedFilters,
}) {
  const [view, setView] = useState("Termico");
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState({ lat: "", lon: "" });
  const [open, setOpen] = useState(false); // despliegue filtros avanzados
  const [adv, setAdv] = useState({
    nombreCientifico: "",
    especie: "",
    reino: "",
    familia: "",
    clase: "",
    orden: "",
    genero: "",
    pais: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const selectView = (v) => {
    setView(v);
    onChangeView?.(v);
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

      {/* Filtros avanzados ahora aparecen inmediatamente después del header */}
      {open && (
        <section className="card advanced">
          <div className="section-header">
            <span>Filtros avanzados</span>
          </div>
          <form onSubmit={applyAdv}>
            <div className="grid-2">
              {[
                ["nombreCientifico", "Nombre científico", "Ej. Panthera onca"],
                ["especie", "Especie", "Ej. Panthera onca"],
                ["reino", "Reino", "Ej. Animalia"],
                ["familia", "Familia", "Ej. Felidae"],
                ["clase", "Clase", "Ej. Mammalia"],
                ["orden", "Orden", "Ej. Carnivora"],
                ["genero", "Género", "Ej. Panthera"],
                ["pais", "País", "Ej. México"],
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

      {/* Contenido básico siempre visible */}
      <div className="panel-body">
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
            {["Relieve", "Termico", "Estandar"].map((v) => (
              <button
                key={v}
                className={`segmented-item ${view === v ? "active" : ""}`}
                onClick={() => selectView(v)}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="field mt">
            <label>Busqueda</label>
            <div className="search">
              <input
                type="text"
                placeholder="Buscar ubicación o lugar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch?.(search)}
              />
              <button
                className="icon-btn"
                title="Buscar"
                onClick={() => onSearch?.(search)}
              >
                
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span>Coordenadas Manuales</span>
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
