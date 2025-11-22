import { ParentSize } from '@visx/responsive';
import {
  AnimatedAxis,
  AnimatedBarSeries,
  AnimatedGrid,
  Tooltip,
  XYChart
} from '@visx/xychart';

const xAccessor = (d) => d.label;
const yAccessor = (d) => d.value ?? 0;

const chartTheme = {
  backgroundColor: 'transparent',
  colors: ['#739EC9'],
  tickLength: 4,
  fontFamily: '"Inter", sans-serif'
};

function AnalyticsBarChart({ data, color = '#739EC9' }) {
  return (
    <div className="chart-viz">
      <ParentSize>{({ width, height }) => {
        if (!width) return null;
        const chartHeight = Math.max(height || 260, 220);
        return (
          <XYChart
            height={chartHeight}
            width={width}
            xScale={{ type: 'band', paddingInner: 0.3 }}
            yScale={{ type: 'linear' }}
            theme={{ ...chartTheme, colors: [color] }}
          >
            <AnimatedGrid rows={false} numTicks={4} />
            <AnimatedAxis orientation="bottom" labelColor="#9ca3af" tickLabelProps={() => ({
              fill: '#9ca3af',
              fontSize: 12,
              dy: 8
            })} />
            <AnimatedAxis orientation="left" hideAxisLine tickLabelProps={() => ({
              fill: '#9ca3af',
              fontSize: 12,
              dx: -30
            })} />
            <AnimatedBarSeries
              dataKey="series"
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

export default AnalyticsBarChart;
