export function ChartSkeleton() {
  return (
    <div className="chart-state chart-state--skeleton">
      <div className="shimmer-row" />
      <div className="shimmer-row" />
      <div className="shimmer-row" />
    </div>
  );
}

export function ChartEmpty({ message = 'Sin datos suficientes para graficar' }) {
  return (
    <div className="chart-state">
      <p>{message}</p>
    </div>
  );
}

export function ChartError({ message }) {
  return (
    <div className="chart-state chart-state--error">
      <p>{message || 'No fue posible cargar la gráfica'}</p>
    </div>
  );
}
