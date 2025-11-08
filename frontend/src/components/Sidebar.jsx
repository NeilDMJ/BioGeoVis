import { useState } from 'react';
import './Sidebar.css';
import { Button } from 'react-bootstrap';

const Sidebar = () => {
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        country: '',
        species: ''
    });

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const applyFilters = () => {
        console.log('Aplicar filtros:', filters);
        // Aquí llamarás a tu API con los filtros
    };

    const clearFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            country: '',
            species: ''
        });
    };

    return (
        <div className="sidebar">
            <h3>Filtros</h3>
            
            <div className="filter-section">
                <label>Rango de Fechas</label>
                <input
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    placeholder="Desde"
                />
                <input
                    type="date"
                    name="dateTo"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    placeholder="Hasta"
                />
            </div>

            <div className="filter-section">
                <label>País</label>
                <select
                    name="country"
                    value={filters.country}
                    onChange={handleFilterChange}
                >
                    <option value="">Todos los países</option>
                    <option value="CR">Costa Rica</option>
                    <option value="MX">México</option>
                    <option value="DE">Alemania</option>
                    {/* Agregar más países dinámicamente */}
                </select>
            </div>

            <div className="filter-section">
                <label>Especie</label>
                <input
                    type="text"
                    name="species"
                    value={filters.species}
                    onChange={handleFilterChange}
                    placeholder="Nombre científico"
                />
            </div>

            <div className="sidebar-actions">
                <Button variant="primary" onClick={applyFilters} className="w-100 mb-2">
                    Aplicar Filtros
                </Button>
                <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                    Limpiar
                </Button>
            </div>

            <hr />

            <h3>Acciones</h3>
            <div className="sidebar-actions">
                <Button variant="outline-light" className="w-100 mb-2">
                    Exportar CSV
                </Button>
                <Button variant="outline-light" className="w-100 mb-2">
                    Refrescar
                </Button>
            </div>

            <hr />

            <div className="stats-mini">
                <h3>Resumen</h3>
                <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">1,111,972</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Filtrados:</span>
                    <span className="stat-value">---</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
