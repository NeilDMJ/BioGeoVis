import { ParentSize } from '@visx/responsive';
import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip,
  XYChart
} from '@visx/xychart';

const xAccessor = (d) => d.label;
const yAccessor = (d) => d.value ?? 0;

const theme = {
  backgroundColor: 'transparent',
  colors: ['#FFE8DB']
};

function AnalyticsLineChart({ data, color = '#FFE8DB' }) {
  return (
    <div className="chart-viz">
      <ParentSize>{({ width, height }) => {
        if (!width) return null;
        const chartHeight = Math.max(height || 260, 220);
        return (
          <XYChart
            height={chartHeight}
            width={width}
            xScale={{ type: 'band', paddingInner: 0.6 }}
            yScale={{ type: 'linear' }}
            theme={{ ...theme, colors: [color] }}
          >
            <AnimatedGrid columns={false} numTicks={4} />
            <AnimatedAxis orientation="bottom" tickLabelProps={() => ({
              fill: '#9ca3af',
              fontSize: 12,
              dy: 8,
              dx: 50,
              transform: 'rotate(-20deg)',
              textAnchor: 'end'
            })} />
            <AnimatedAxis orientation="left" hideAxisLine tickLabelProps={() => ({
              fill: '#9ca3af',
              fontSize: 12,
              dx: -10
            })} />
            <AnimatedLineSeries
              dataKey="temporal"
              data={data}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
            />
            <Tooltip
              snapTooltipToDatumX
              snapTooltipToDatumY
              applyPositionStyle
              showSeriesGlyphs
              renderTooltip={({ tooltipData }) => {
                const datum = tooltipData?.nearestDatum?.datum;
                if (!datum) return null;
                return (
                  <div className="chart-tooltip">
                    <strong>{datum.label}</strong>
                    <div>{datum.value?.toLocaleString?.('es-MX') ?? datum.value}</div>
                  </div>
                );
              }}
            />
          </XYChart>
        );
      }}</ParentSize>
    </div>
  );
}

export default AnalyticsLineChart;
