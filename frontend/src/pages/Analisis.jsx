import { useState } from 'react';
import './Analisis.css';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const scopeOptions = ['Especie', 'Familia', 'Orden', 'Ubicación'];

const kpiCards = [
    { id: 'unique-species', label: 'Especies monitorizadas', value: '—', icon: '🧬' },
    { id: 'taxa-covered', label: 'Taxones evaluados', value: '—', icon: '🦋' },
    { id: 'regions', label: 'Regiones filtradas', value: '—', icon: '🗺️' },
];

const chartCards = [
    {
        id: 'fauna-breakdown',
        title: 'Fauna por categoría',
        subtitle: 'Comparativa de registros por gran grupo taxonómico',
        wide: false,
    },
    {
        id: 'type-distribution',
        title: 'Tipo de avistamiento',
        subtitle: 'Hábitos, estados y comportamientos reportados',
        wide: false,
    },
    {
        id: 'family-classification',
        title: 'Clasificación por familia',
        subtitle: 'Ranking de familias predominantes en el filtro',
        wide: true,
    },
    {
        id: 'temporal-distribution',
        title: 'Distribución temporal',
        subtitle: 'Tendencia histórica de registros por periodo',
        wide: false,
    },
    {
        id: 'geo-density',
        title: 'Densidad geográfica',
        subtitle: 'Mapa de calor de ubicaciones resultantes',
        wide: false,
    },
];

const activeFilters = [
    { id: 'region', label: 'Región', value: 'Amazonas' },
    { id: 'habitat', label: 'Hábitat', value: 'Bosque húmedo' },
    { id: 'season', label: 'Temporada', value: 'Q2 2025' },
    { id: 'taxon', label: 'Taxón', value: 'Aves' },
];

const Analisis = () => {
    const [selectedScope, setSelectedScope] = useState(scopeOptions[0]);

    return (
        <div className="analisis">
            <Navbar />
            <div className="analisis-shell">
                <main className="analisis-content" aria-label="Panel principal de analytics">
                    
                    <section className="analisis-hero">
                        <div className="analisis-title">
                            <p className="analisis-eyebrow">Insights derivados de Explorer</p>
                            <h1>Analytics</h1>
                            <p>Explora cómo se comportan los resultados filtrados por diferentes dimensiones taxonómicas.</p>
                        </div>

                        <div className="analisis-selector">
                            <label htmlFor="scope-select">Dimensión principal</label>
                            <div className="pill-select">
                                <select
                                    id="scope-select"
                                    value={selectedScope}
                                    onChange={(event) => setSelectedScope(event.target.value)}
                                >
                                    {scopeOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="analisis-kpis" aria-label="Indicadores principales">
                        {kpiCards.map((card) => (
                            <article className="kpi-panel" key={card.id}>
                                <span className="kpi-icon" aria-hidden="true">
                                    {card.icon}
                                </span>
                                <div>
                                    <p className="kpi-label">{card.label}</p>
                                    <p className="kpi-value" aria-live="polite">
                                        {card.value}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </section>

                    <section className="analisis-layout">
                        <div className="analisis-charts" aria-label="Tarjetas de gráficas">
                            {chartCards.map((chart) => (
                                <article
                                    key={chart.id}
                                    className={`chart-card ${chart.wide ? 'chart-card--wide' : ''}`}
                                >
                                    <div className="chart-card__header">
                                        <div>
                                            <h2>{chart.title}</h2>
                                            <p>{chart.subtitle}</p>
                                        </div>
                                        <button type="button" className="ghost-button">
                                            Ver detalles
                                        </button>
                                    </div>
                                    <div className="chart-placeholder" aria-live="polite">
                                        <span>Placeholder gráfico</span>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <aside className="analisis-filters" aria-label="Filtros activos">
                            <div className="analisis-filters__header">
                                <h3>Filtros activos</h3>
                                <button type="button" className="link-button">
                                    Limpiar
                                </button>
                            </div>
                            <ul>
                                {activeFilters.map((filter) => (
                                    <li key={filter.id}>
                                        <span>{filter.label}</span>
                                        <strong>{filter.value}</strong>
                                    </li>
                                ))}
                            </ul>
                            <p className="analisis-filters__hint">
                                Los filtros provienen del módulo Explorer. Aquí solo se visualizan resultados agregados.
                            </p>
                        </aside>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Analisis;
