import { useCallback, useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import Filter from '../components/Filter';
import DashboardMap from '../components/DashboardMap';
import SpeciesInfoCard from '../components/SpeciesInfoCard';
import AnalyticsBarChart from '../components/charts/AnalyticsBarChart';
import AnalyticsLineChart from '../components/charts/AnalyticsLineChart';
import { ChartEmpty, ChartError, ChartSkeleton } from '../components/charts/ChartState';
import { useAnalyticsData, usePersistedExplorerFilters } from '../hooks/useAnalytics';
import { fetchAvistamientosAdvanced } from '../services/api';
import { ensureSpeciesInfo } from '../utils/mapConfig';

const DEFAULT_VIEW = 'Estandar';
const SEARCH_STRATEGIES = [
    { field: 'nombreCientifico', label: 'nombre científico' },
    { field: 'especie', label: 'especie' },
    { field: 'pais', label: 'país' },
    { field: 'ciudad', label: 'ciudad' },
    { field: 'estado', label: 'estado' }
];

const Dashboard = () => {
    const [mapView, setMapView] = useState(DEFAULT_VIEW);
    const [markers, setMarkers] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [manualMarker, setManualMarker] = useState(null);
    const [searchMarker, setSearchMarker] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchStatus, setSearchStatus] = useState({ message: '', tone: 'muted' });
    const [refreshedAt, setRefreshedAt] = useState(null);

    const {
        filters: persistedFilters,
        updateFilters,
        clear: clearFilters
    } = usePersistedExplorerFilters();

    const {
        data: analyticsData,
        loading: analyticsLoading,
        error: analyticsError
    } = useAnalyticsData(persistedFilters, 'family');

    const filtersCount = useMemo(() => {
        if (!persistedFilters) return 0;
        return Object.values(persistedFilters).filter((value) => value && value !== '*').length;
    }, [persistedFilters]);

    const loadMarkers = useCallback(async (filtersPayload) => {
        setMapLoading(true);
        setMapError(null);
        try {
            const { markers: result } = await fetchAvistamientosAdvanced(filtersPayload || {});
            setMarkers(result || []);
            setRefreshedAt(new Date());
        } catch (error) {
            console.error('[Dashboard] Error loading markers', error);
            setMapError(error.message || 'No fue posible cargar los marcadores');
        } finally {
            setMapLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMarkers(persistedFilters || {});
    }, [persistedFilters, loadMarkers]);

    const handleAdvancedFilters = useCallback((filters) => {
        const sanitized = Object.entries(filters || {}).reduce((acc, [key, value]) => {
            if (typeof value === 'string') {
                const trimmed = value.trim();
                acc[key] = trimmed.length ? trimmed : undefined;
            } else {
                acc[key] = value ?? undefined;
            }
            return acc;
        }, {});
        updateFilters(sanitized);
    }, [updateFilters]);

    const handleSearch = useCallback(async (term) => {
        const query = term?.trim();
        if (!query) {
            setSearchMarker(null);
            setSearchStatus({ message: '', tone: 'muted' });
            return;
        }
        setSearchLoading(true);
        setSearchStatus({ message: 'Buscando coincidencias...', tone: 'muted' });
        try {
            let found = null;
            for (const strategy of SEARCH_STRATEGIES) {
                const { markers: searchResults } = await fetchAvistamientosAdvanced({ [strategy.field]: query });
                if (searchResults?.length) {
                    found = ensureSpeciesInfo(searchResults[0]);
                    setSearchStatus({
                        message: `Mostrando resultado por ${strategy.label}`,
                        tone: 'success'
                    });
                    break;
                }
            }
            if (!found) {
                setSearchMarker(null);
                setSearchStatus({ message: `Sin resultados para "${query}"`, tone: 'error' });
                return;
            }
            setSearchMarker(found);
            setSelectedMarker(found);
        } catch (error) {
            console.error('[Dashboard] Search error', error);
            setSearchStatus({ message: error.message || 'No fue posible completar la búsqueda', tone: 'error' });
            setSearchMarker(null);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const handleManualCoordinates = useCallback(({ lat, lon }) => {
        const marker = ensureSpeciesInfo({
            lat,
            lng: lon,
            label: 'Coordenada manual',
            color: '#ffb347',
            speciesInfo: {
                scientificName: 'Punto definido manualmente',
                taxonomy: {},
                source: 'Entrada manual'
            }
        });
        setManualMarker(marker);
        setSelectedMarker(marker);
        setSearchStatus({ message: 'Marcador manual agregado al mapa', tone: 'success' });
    }, []);

    const kpis = useMemo(() => ([
        { id: 'markers', label: 'Marcadores activos', value: markers.length.toLocaleString('es-MX') },
        { id: 'filters', label: 'Filtros sincronizados', value: filtersCount },
        { id: 'view', label: 'Vista del mapa', value: mapView },
        {
            id: 'updated',
            label: 'Última actualización',
            value: refreshedAt ? refreshedAt.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
        }
    ]), [markers.length, filtersCount, mapView, refreshedAt]);

    const renderBarChart = useCallback((dataset, color) => {
        if (analyticsLoading) return <ChartSkeleton />;
        if (analyticsError) return <ChartError message={analyticsError} />;
        if (!dataset?.length) return <ChartEmpty />;
        return <AnalyticsBarChart data={dataset} color={color} />;
    }, [analyticsError, analyticsLoading]);

    const renderLineChart = useCallback((dataset, color) => {
        if (analyticsLoading) return <ChartSkeleton />;
        if (analyticsError) return <ChartError message={analyticsError} />;
        if (!dataset?.length) return <ChartEmpty />;
        return <AnalyticsLineChart data={dataset} color={color} />;
    }, [analyticsError, analyticsLoading]);

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-shell">
                <aside className="dashboard-filter-panel" aria-label="Panel de filtros">
                    <Filter
                        initialView={mapView}
                        onChangeView={setMapView}
                        onSearch={handleSearch}
                        onApplyCoordinates={handleManualCoordinates}
                        onApplyAdvancedFilters={handleAdvancedFilters}
                        searchLoading={searchLoading}
                        searchMessage={searchStatus.message}
                        searchMessageTone={searchStatus.tone}
                    />
                </aside>
                <main className="dashboard-main" aria-live="polite">
                    <section className="dashboard-hero">
                        <div>
                            <p className="dashboard-eyebrow">Visor táctico</p>
                            <h1>Dashboard de Explorer</h1>
                            <p>Revisa el estado del mapa, agrega vistas especializadas y mantén sincronizados los mismos filtros del módulo Explorer.</p>
                        </div>
                        <div className="dashboard-hero__actions">
                            <button type="button" className="ghost-button" onClick={() => loadMarkers(persistedFilters || {})}>
                                Refrescar datos
                            </button>
                            <button type="button" className="ghost-button" onClick={() => clearFilters()} disabled={!persistedFilters}>
                                Limpiar filtros
                            </button>
                        </div>
                    </section>

                    <section className="dashboard-kpis" aria-label="Indicadores clave">
                        {kpis.map((kpi) => (
                            <article key={kpi.id} className="dashboard-kpi-card">
                                <p className="kpi-label">{kpi.label}</p>
                                <p className="kpi-value">{kpi.value}</p>
                            </article>
                        ))}
                    </section>

                    <section className="dashboard-map-section">
                        <DashboardMap
                            viewMode={mapView}
                            markers={markers}
                            highlightMarker={searchMarker}
                            manualMarker={manualMarker}
                            loading={mapLoading}
                            error={mapError}
                            onMarkerSelect={setSelectedMarker}
                            selectedMarker={selectedMarker}
                        />
                        {selectedMarker && (
                            <div className="dashboard-map-section__card">
                                <SpeciesInfoCard species={selectedMarker} onClose={() => setSelectedMarker(null)} />
                            </div>
                        )}
                    </section>

                    <section className="dashboard-charts" aria-label="Gráficas analíticas">
                        <article className="dashboard-chart">
                            <div className="dashboard-chart__header">
                                <div>
                                    <h3>Top taxonómico</h3>
                                    <p>Ranking derivado de los filtros activos</p>
                                </div>
                            </div>
                            {renderBarChart(analyticsData?.dimensionRanking, '#739EC9')}
                        </article>
                        <article className="dashboard-chart">
                            <div className="dashboard-chart__header">
                                <div>
                                    <h3>Distribución temporal</h3>
                                    <p>Histórico de registros agregados</p>
                                </div>
                            </div>
                            {renderLineChart(analyticsData?.temporalSeries, '#FFE8DB')}
                        </article>
                        <article className="dashboard-chart">
                            <div className="dashboard-chart__header">
                                <div>
                                    <h3>Fauna por categoría</h3>
                                    <p>Clasificación de la muestra actual</p>
                                </div>
                            </div>
                            {renderBarChart(analyticsData?.faunaBreakdown, '#51cf66')}
                        </article>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
