import Svg, { Circle, Line, Path } from 'react-native-svg';
import { VENUE_ICON_PRIMITIVES, type VenueIconKey } from '../../lib/map/venue-icons';

interface VenueTypeIconProps {
  icon: VenueIconKey;
  size?: number;
  color: string;
}

/**
 * Native renderer for the shared icon primitives (src/lib/map/venue-icons.ts)
 * — used by map.tsx's subtle "every venue at this zoom" markers. map.web.tsx
 * renders the exact same shapes a different way (iconSvgMarkup, a raw <svg>
 * string) since its markers are imperative DOM nodes, not a React tree —
 * see that module's own top comment for why there are two renderers.
 */
export function VenueTypeIcon({ icon, size = 14, color }: VenueTypeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {VENUE_ICON_PRIMITIVES[icon].map((p, i) => {
        const filled = p.shape !== 'line' && p.fill;
        const common = {
          stroke: color,
          strokeWidth: 1.6,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fill: filled ? color : 'none',
        };
        if (p.shape === 'path') return <Path key={i} d={p.d} {...common} />;
        if (p.shape === 'circle') return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
        return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...common} />;
      })}
    </Svg>
  );
}
