import { Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { color, font } from '../../theme';
import type { ChartBar } from '../../lib/admin/dashboard-insights';

interface BarChartProps {
  bars: ChartBar[];
  height?: number;
  /** Width per bar (including its gap) — controls how wide the whole chart
   * renders; charts with many bars (e.g. 14 days of signups) scroll
   * horizontally inside their own Card rather than squeezing bars unreadably
   * thin. */
  barWidth?: number;
}

/**
 * A plain, honest SVG bar chart — no charting library, react-native-svg was
 * already a dependency (Mapbox needs it). Built for the admin dashboard's
 * "click a metric, see a real chart" KPI section (2026-09-18, at explicit
 * user request: "big readable metrics, which can be clicked through into
 * graphs, like a tableau dashboard"). Every bar's real value is drawn as a
 * label above the bar — no hidden/invented scale, no tooltip-only numbers.
 */
export function BarChart({ bars, height = 140, barWidth = 44 }: BarChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const chartHeight = height - 36; // leaves room for the value label + axis label
  const width = Math.max(bars.length * barWidth, 240);

  if (bars.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.sans, fontSize: 12, color: color.textTertiary }}>No data yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke={color.hairlineMax} strokeWidth={1} />
        {bars.map((b, i) => {
          const barHeight = max === 0 ? 0 : (b.value / max) * chartHeight;
          const x = i * barWidth + barWidth * 0.2;
          const barW = barWidth * 0.6;
          const y = height - 20 - barHeight;
          return (
            <G key={b.label}>
              <Rect x={x} y={y} width={barW} height={Math.max(barHeight, b.value > 0 ? 2 : 0)} rx={3} fill={color.gold} />
              <SvgText
                x={x + barW / 2}
                y={y - 6}
                fontSize={11}
                fill={color.textSecondary}
                textAnchor="middle"
                fontFamily={font.sans}
              >
                {b.value}
              </SvgText>
              <SvgText
                x={x + barW / 2}
                y={height - 6}
                fontSize={9.5}
                fill={color.textTertiary}
                textAnchor="middle"
                fontFamily={font.sans}
              >
                {b.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
