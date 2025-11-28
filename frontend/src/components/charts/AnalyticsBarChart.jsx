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
  gridColor: 'rgba(255, 255, 255, 0.08)',
  gridColorDark: 'rgba(255, 255, 255, 0.12)',
  axisStyles: {
    x: {
      axisLine: { stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 },
      tickLine: { stroke: 'rgba(255, 255, 255, 0.1)' },
    },
    y: {
      axisLine: { stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 },
      tickLine: { stroke: 'rgba(255, 255, 255, 0.1)' },
    }
  }
};

function AnalyticsBarChart({ data, color = '#739EC9' }) {
  return (
    <div className="chart-viz">
      <ParentSize>{({ width, height }) => {
        if (!width) return null;
        const chartHeight = Math.max(height || 220, 200);
        const margin = { top: 20, right: 20, bottom: 70, left: 60 };
        return (
          <XYChart
            height={chartHeight}
            width={width}
            margin={margin}
            xScale={{ type: 'band', paddingInner: 0.35, paddingOuter: 0.2 }}
            yScale={{ type: 'linear', nice: true }}
            theme={{ ...chartTheme, colors: [color] }}
          >
            <AnimatedGrid 
              columns={false}
              numTicks={5}
              lineStyle={{ 
                stroke: 'rgba(255, 255, 255, 0.08)', 
                strokeDasharray: '3,3' 
              }} 
            />
            <AnimatedAxis 
              orientation="bottom"
              tickLength={4}
              strokeWidth={1}
              stroke="rgba(255, 255, 255, 0.2)"
              tickStroke="rgba(255, 255, 255, 0.15)"
              tickLabelProps={() => ({
                fill: '#a1a1aa',
                fontSize: 11,
                fontWeight: 500,
                textAnchor: 'end',
                angle: -45,
                dy: 2,
                dx: -4
              })} 
            />
            <AnimatedAxis 
              orientation="left"
              numTicks={5}
              tickLength={4}
              strokeWidth={1}
              stroke="rgba(255, 255, 255, 0.2)"
              tickStroke="rgba(255, 255, 255, 0.15)"
              tickLabelProps={() => ({
                fill: '#a1a1aa',
                fontSize: 11,
                fontWeight: 500,
                dx: -8,
                dy: 3,
                textAnchor: 'end'
              })} 
            />
            <AnimatedBarSeries
              dataKey="series"
              data={data}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
              radiusTop={4}
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
