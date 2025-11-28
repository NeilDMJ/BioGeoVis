import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserNavMenu from '../components/UserNavMenu';
import './Analisis.css';
import AnalyticsBarChart from '../components/charts/AnalyticsBarChart';
import AnalyticsLineChart from '../components/charts/AnalyticsLineChart';
import { ChartEmpty, ChartError, ChartSkeleton } from '../components/charts/ChartState';
import { useAnalyticsData, usePersistedExplorerFilters } from '../hooks/useAnalytics';
import AnalyticsDetailDrawer from '../components/analytics/AnalyticsDetailDrawer';

const scopeOptions = [
    { label: 'Especie', value: 'species', filterKey: 'especie' },
    { label: 'Familia', value: 'family', filterKey: 'familia' },
    { label: 'Orden', value: 'order', filterKey: 'orden' },
    { label: 'Ubicación', value: 'location', filterKey: 'pais' }
];

const kpiSkeleton = [
    { id: 'total-records', label: 'Registros', value: '—' },
    { id: 'dimension', label: 'Dimensión activa', value: '—' },
    { id: 'unique-species', label: 'Especies únicas', value: '—' },
    { id: 'date-range', label: 'Rango temporal', value: '—' }
];

const KPI_ICONS = {
    'total-records': (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M5 16h2v-5H5v5zm6 0h2V8h-2v8zm6 0h2V4h-2v12z" fill="currentColor" />
        </svg>
    ),
    'unique-species': (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M12 3c-3 0-5 3-5 5s2 5 5 5 5 3 5 5-2 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 3v20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    ),
    dimension: (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M4 18l4-7 4 3 4-6 4 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="6" r="2" fill="currentColor" />
            <circle cx="16" cy="5" r="1.5" fill="currentColor" />
        </svg>
    ),
    'date-range': (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <rect x="4" y="7" width="16" height="13" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 3v4M16 3v4M4 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
};

const filterLabelMap = {
    nombreCientifico: 'Nombre científico',
    especie: 'Especie',
    reino: 'Reino',
    filo: 'Filo',
    clase: 'Clase',
    orden: 'Orden',
    familia: 'Familia',
    genero: 'Género',
    pais: 'País',
    fechaInicio: 'Fecha inicio',
    fechaFin: 'Fecha fin'
};


const Analisis = () => {
    const navigate = useNavigate();
    const [selectedScope, setSelectedScope] = useState(scopeOptions[0].value);
    const [detailTarget, setDetailTarget] = useState(null);
    const [activeSection, setActiveSection] = useState('hero');
    const {
        filters: persistedFilters,
        refresh: refreshFilters,
        updateFilters,
        removeFilter,
        clear: clearFilters
    } = usePersistedExplorerFilters();
    const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useAnalyticsData(persistedFilters, selectedScope);

    const activeScope = scopeOptions.find((option) => option.value === selectedScope) || scopeOptions[0];
    const dimensionLabel = analyticsData?.dimensionLabel || activeScope.label;

    const chartCards = useMemo(() => ([
        {
            id: 'fauna-breakdown',
            title: 'Fauna por categoría',
            subtitle: 'Comparativa de registros por gran grupo taxonómico',
            wide: false,
            type: 'bar',
            color: '#8BC5F5',
            selector: (analytics) => analytics?.faunaBreakdown ?? []
        },
        {
            id: 'type-distribution',
            title: 'Tipo de avistamiento',
            subtitle: 'Hábitos, estados y comportamientos reportados',
            wide: false,
            type: 'bar',
            color: '#FFE8DB',
            selector: (analytics) => analytics?.typeDistribution ?? []
        },
        {
            id: 'family-classification',
            title: `Clasificación por ${dimensionLabel.toLowerCase()}`,
            subtitle: `Ranking de ${dimensionLabel.toLowerCase()} predominantes`,
            wide: true,
            type: 'bar',
            color: '#FFB347',
            selector: (analytics) => analytics?.dimensionRanking ?? []
        },
        {
            id: 'temporal-distribution',
            title: 'Distribución temporal',
            subtitle: 'Tendencia histórica de registros por periodo',
            wide: false,
            type: 'line',
            color: '#FFE8DB',
            selector: (analytics) => analytics?.temporalSeries ?? []
        },
        {
            id: 'geo-density',
            title: 'Densidad geográfica',
            subtitle: 'Concentración por país en los resultados',
            wide: false,
            type: 'bar',
            color: '#51cf66',
            selector: (analytics) => analytics?.geoDensity ?? []
        }
    ]), [dimensionLabel]);
    const kpis = analyticsData?.kpis?.length ? analyticsData.kpis : kpiSkeleton;
    const filtersList = useMemo(() => {
        if (!persistedFilters) return [];
        return Object.entries(persistedFilters)
            .filter(([, value]) => value && value !== '*')
            .map(([key, value]) => ({
                id: key,
                label: filterLabelMap[key] || key,
                value
            }));
    }, [persistedFilters]);

    const handleClearFilters = () => {
        clearFilters();
        refreshFilters();
        setSelectedScope(scopeOptions[0].value);
    };

    const handleRemoveFilter = (key) => {
        removeFilter(key);
        refreshFilters();
    };

    const handleViewDetails = (chart) => {
        setDetailTarget(chart);
    };

    const handleExploreFromDetail = (filterKey, value) => {
        if (filterKey && value) {
            updateFilters({ [filterKey]: value });
        }
        const params = new URLSearchParams();
        params.set('ref', 'analytics');
        if (detailTarget?.chartId) {
            params.set('chart', detailTarget.chartId);
        }
        if (filterKey && value) {
            params.set(filterKey, value);
        }
        navigate(`/explorer?${params.toString()}`);
        setDetailTarget(null);
    };

    useEffect(() => {
        const sections = document.querySelectorAll('[data-section]');
        const animatedBlocks = document.querySelectorAll('.scroll-animate');
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.dataset.section);
                }
            });
        }, { threshold: 0.4 });

        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.25 });

        sections.forEach((section) => sectionObserver.observe(section));
        animatedBlocks.forEach((block) => animationObserver.observe(block));

        return () => {
            sectionObserver.disconnect();
            animationObserver.disconnect();
        };
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const renderChart = (chart) => {
        if (analyticsLoading) return <ChartSkeleton />;
        if (analyticsError) return <ChartError message={analyticsError} />;
        const dataset = chart.selector?.(analyticsData) ?? [];
        if (!dataset.length) return <ChartEmpty />;
        if (chart.type === 'line') {
            return <AnalyticsLineChart data={dataset} color={chart.color} />;
        }
        return <AnalyticsBarChart data={dataset} color={chart.color} />;
    };

    return (
        <div className="analisis">
            {/* Barra superior replica About para consistencia visual */}
            <header className="home__nav about__nav analytics__nav" aria-label="Navegación principal de analytics">
                <div className="home__logo">BioGeoVis</div>
                <nav className="home__nav-links">
                    <Link to="/home" className="home__nav-link external">Inicio</Link>
                    <Link to="/explorer" className="home__nav-link external">Explorer</Link>
                    <Link to="/dashboard" className="home__nav-link external">Dashboard</Link>
                    <Link to="/about" className="home__nav-link external">Acerca de Nosotros</Link>
                    <UserNavMenu />
                </nav>
            </header>
            <div className="analisis-shell">
                <main className="analisis-content" aria-label="Panel principal de analytics">
                    <section id="hero" data-section="hero" className="analisis-hero scroll-animate">
                        <div className="analisis-title">
                            <p className="analisis-eyebrow">Insights derivados de Explorer</p>
                            <h1>Análisis gráfico</h1>
                            <p>Explora cómo se comportan los resultados filtrados por diferentes dimensiones taxonómicas.</p>
                            <ul className="hero-prompts">
                                <li>1. Revisa las gráficas para validar que analizas la información correcta.</li>
                                <li>2. Cambia la dimensión principal y observa cómo se reorganizan las gráficas.</li>
                                <li>3. Usa "Ver detalles" para saltar al Explorer con filtros ya aplicados.</li>
                            </ul>
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
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section
                        id="kpis"
                        data-section="kpis"
                        className="analisis-kpis scroll-animate"
                        aria-label="Indicadores principales"
                    >
                        {kpis.map((card) => (
                            <article className="kpi-panel" key={card.id}>
                                <span className="kpi-icon" aria-hidden="true">
                                    {KPI_ICONS[card.id] || KPI_ICONS['total-records']}
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

                    <section
                        id="charts"
                        data-section="charts"
                        className="analisis-layout scroll-animate"
                    >
                        <div className="analisis-charts" aria-label="Tarjetas de gráficas">
                            {chartCards.map((chart) => (
                                <article key={chart.id} className={`chart-card ${chart.wide ? 'chart-card--wide' : ''}`}>
                                    <div className="chart-card__header">
                                        <div>
                                            <h2>{chart.title}</h2>
                                            <p>{chart.subtitle}</p>
                                            
                                        </div>
                                        <button type="button" className="ghost-button" onClick={() => handleViewDetails(chart)}>
                                            Ver detalles
                                        </button>
                                    </div>
                                    {renderChart(chart)}
                                </article>
                            ))}
                        </div>

                        <aside
                            id="filters"
                            data-section="filters"
                            className="analisis-filters"
                            aria-label="Filtros activos"
                        >
                            <div className="analisis-filters__header">
                                <h3>Filtros activos</h3>
                                <button
                                    type="button"
                                    className="link-button"
                                    onClick={handleClearFilters}
                                    disabled={!filtersList.length}
                                >
                                    Restablecer
                                </button>
                            </div>
                            {filtersList.length ? (
                                <ul className="filter-chip-list">
                                    {filtersList.map((filter) => (
                                        <li key={filter.id} className="filter-chip">
                                            <span>{filter.label}:</span>
                                            <strong>{filter.value}</strong>
                                            <button type="button" aria-label={`Eliminar filtro ${filter.label}`} onClick={() => handleRemoveFilter(filter.id)}>
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="analisis-filters__empty">Sin filtros activos</p>
                            )}
                            <p className="analisis-filters__hint">
                                Los filtros provienen del módulo Explorer. Aquí solo se visualizan resultados agregados.
                            </p>
                            <span className="microcopy">Nota: al limpiar filtros aquí no se modifica el historial del Explorer.</span>
                        </aside>
                    </section>
                </main>
            </div>
            <AnalyticsDetailDrawer
                target={detailTarget}
                filters={persistedFilters}
                dimension={selectedScope}
                onClose={() => setDetailTarget(null)}
                onExplore={handleExploreFromDetail}
            />
        </div>
    );
};

export default Analisis;
