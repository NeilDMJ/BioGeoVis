import './Dashboard.css';
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-container">
                <Sidebar />
                <div className="dashboard-content">
                    {/* Tarjetas de Métricas (KPIs) */}
                    <div className="dashboard-kpis">
                        <div className="kpi-card">
                            <div className="kpi-info">
                                <span className="kpi-value">1,245</span>
                                <span className="kpi-label">Especies Únicas</span>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-info">
                                <span className="kpi-value">87</span>
                                <span className="kpi-label">Países</span>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-info">
                                <span className="kpi-value">Nov 7, 2025</span>
                                <span className="kpi-label">Último Registro</span>
                            </div>
                        </div>
                    </div>

                    {/* Contenedor del Mapa */}
                    <div className="dashboard-map-container">
                        <h3>Mapa de Calor - Distribución de Avistamientos</h3>
                        <div className="map-placeholder">
                            {/* Aquí irá el mapa */}
                            <p>Mapa interactivo con clusters</p>
                        </div>
                    </div>

                    {/* Contenedores de Gráficas */}
                    <div className="dashboard-charts">
                        <div className="chart-container">
                            <h3>Top 10 Especies Más Avistadas</h3>
                            <div className="chart-placeholder">
                                {/* Aquí irá la gráfica de barras */}
                                <p>Gráfica de barras horizontales</p>
                            </div>
                        </div>

                        <div className="chart-container">
                            <h3>Avistamientos en el Tiempo</h3>
                            <div className="chart-placeholder">
                                {/* Aquí irá la gráfica de línea/área */}
                                <p>Gráfica de área temporal</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de últimos avistamientos */}
                    <div className="dashboard-table-container">
                        <h3>Últimos Avistamientos Registrados</h3>
                        <div className="table-placeholder">
                            {/* Aquí irá la tabla */}
                            <p>Tabla con paginación y ordenamiento</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
