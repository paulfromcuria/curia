import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';
import { MAX_RADIUS_MILES, MIN_RADIUS_MILES, clampRadiusMiles } from '../../lib/map/geo';
import { color } from '../../theme';

const RADIUS_STEP = 0.25;

/** Mirrors the prototype's own `miles()` formatter exactly (Curia.dc.html). */
export function formatRadiusMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

/**
 * Real drag-to-set radius slider, over the full MIN_RADIUS_MILES (0.25mi) —
 * MAX_RADIUS_MILES (30mi, "anywhere in the region") range Map/List's own
 * radius already shares (src/lib/map/geo.ts). Extracted from List
 * (2026-09-29, at explicit user request: Moments' own area filter should
 * offer "a distance slider from yourself," not just preset pills) so both
 * screens use one real, tactile slider rather than two — List's own usage
 * is unchanged, just importing this instead of a local copy.
 */
export function RadiusSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const trackRef = useRef<View>(null);
  const [layout, setLayout] = useState({ pageX: 0, width: 1 });

  const measure = useCallback(() => {
    const node = trackRef.current;
    node?.measure((_x, _y, width, _height, pageX) => {
      setLayout({ pageX, width: Math.max(1, width) });
    });
  }, []);

  const valueFromPageX = useCallback(
    (pageX: number) => {
      const ratio = Math.min(1, Math.max(0, (pageX - layout.pageX) / layout.width));
      return clampRadiusMiles(MIN_RADIUS_MILES + ratio * (MAX_RADIUS_MILES - MIN_RADIUS_MILES));
    },
    [layout]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => onChange(valueFromPageX(evt.nativeEvent.pageX)),
        onPanResponderMove: (evt: GestureResponderEvent) => onChange(valueFromPageX(evt.nativeEvent.pageX)),
      }),
    [onChange, valueFromPageX]
  );

  const ratio = (value - MIN_RADIUS_MILES) / (MAX_RADIUS_MILES - MIN_RADIUS_MILES);

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') onChange(clampRadiusMiles(value + RADIUS_STEP));
      if (event.nativeEvent.actionName === 'decrement') onChange(clampRadiusMiles(value - RADIUS_STEP));
    },
    [onChange, value]
  );

  return (
    <View
      ref={trackRef}
      onLayout={measure}
      {...panResponder.panHandlers}
      style={styles.sliderTrack}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Search radius"
      accessibilityValue={{ min: MIN_RADIUS_MILES, max: MAX_RADIUS_MILES, now: value, text: formatRadiusMiles(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <View style={styles.sliderRail} />
      <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sliderTrack: {
    height: 24,
    justifyContent: 'center',
    marginTop: 12,
  },
  sliderRail: {
    height: 2,
    borderRadius: 1,
    backgroundColor: color.hairlineMax,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: color.gold,
  },
  sliderThumb: {
    position: 'absolute',
    top: 3,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.goldLight,
    borderWidth: 1,
    borderColor: color.gold,
  },
});
