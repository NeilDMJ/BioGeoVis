import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ChartEmpty, ChartError, ChartSkeleton } from '../charts/ChartState';
import { fetchAnalyticsDetail } from '../../services/api';

const MAX_SAMPLES_INLINE = 3;

const formatSamples = (samples = []) => {
  if (!samples.length) return 'Sin ejemplos';
  if (samples.length <= MAX_SAMPLES_INLINE) {
    return samples.join(' · ');
  }
  return `${samples.slice(0, MAX_SAMPLES_INLINE).join(' · ')} +${samples.length - MAX_SAMPLES_INLINE}`;
};

function downloadCsv(filename, rows) {
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const AnalyticsDetailDrawer = ({ target, filters, dimension, onClose, onExplore }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!target) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);

    fetchAnalyticsDetail(
      {
        chartId: target.chartId,
        filters,
        dimension,
        limit: 12
      },
      { signal: controller.signal }
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message || 'No fue posible obtener los detalles');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [target, filters, dimension]);

  const rows = data?.buckets ?? [];
  const bucketLabel = data?.bucketLabel ?? 'Categoría';
  const canExplore = Boolean(onExplore && data?.filterKey);

  const handleExport = () => {
    if (!rows.length) return;
    const header = 'Etiqueta,Valor,Muestras';
    const csvRows = rows.map((bucket) => {
      const samples = (bucket.samples || []).join(' | ');
      const safeLabel = bucket.label?.replaceAll('"', '""') ?? '';
      const safeSamples = samples.replaceAll('"', '""');
      return `"${safeLabel}",${bucket.value},"${safeSamples}"`;
    });
    downloadCsv(`${target.chartId}-detalle.csv`, `${header}\n${csvRows.join('\n')}`);
  };

  const handleExplore = (label) => {
    if (!canExplore || !label) return;
    onExplore(data.filterKey, label);
  };

  const overlayClasses = useMemo(
    () => `analytics-drawer ${target ? 'analytics-drawer--open' : ''}`,
    [target]
  );

  if (!target) {
    return null;
  }

  return (
    <div className={overlayClasses} role="dialog" aria-modal="true" aria-label="Detalle de analytics">
      <div className="analytics-drawer__backdrop" onClick={onClose} />
      <aside className="analytics-drawer__panel">
        <header className="analytics-drawer__header">
          <div>
            <p className="analytics-drawer__eyebrow">Detalle de gráfica</p>
            <h2>{target.title}</h2>
            {target.subtitle ? <p>{target.subtitle}</p> : null}
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="analytics-drawer__actions">
          <button type="button" className="ghost-button" onClick={handleExport} disabled={!rows.length}>
            Exportar CSV
          </button>
          <button type="button" className="ghost-button" onClick={() => handleExplore(rows[0]?.label)} disabled={!canExplore || !rows.length}>
            Explorar en Explorer
          </button>
        </div>

        <section className="analytics-drawer__body" aria-live="polite">
          {loading && <ChartSkeleton />}
          {!loading && error && <ChartError message={error} />}
          {!loading && !error && !rows.length && <ChartEmpty message="Sin datos disponibles para este filtro" />}
          {!loading && !error && rows.length > 0 && (
            <ul className="analytics-drawer__list">
              {rows.map((bucket) => (
                <li key={bucket.label}>
                  <div>
                    <p className="drawer-list__label">{bucket.label || 'Sin dato'}</p>
                    <p className="drawer-list__meta">{bucketLabel}</p>
                    <p className="drawer-list__samples">{formatSamples(bucket.samples)}</p>
                  </div>
                  <div className="drawer-list__value">
                    <strong>{bucket.value}</strong>
                    {canExplore && (
                      <button type="button" onClick={() => handleExplore(bucket.label)}>
                        Explorar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
};

AnalyticsDetailDrawer.propTypes = {
  target: PropTypes.shape({
    chartId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
  }),
  filters: PropTypes.object,
  dimension: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onExplore: PropTypes.func
};

AnalyticsDetailDrawer.defaultProps = {
  target: null,
  filters: null,
  dimension: 'family',
  onExplore: null
};

export default AnalyticsDetailDrawer;
