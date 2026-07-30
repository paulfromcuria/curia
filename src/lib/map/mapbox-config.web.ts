/**
 * Web platform stub. @rnmapbox/maps is a native-only module (no web target)
 * — Metro/Expo pick this file over mapbox-config.ts automatically on web via
 * the .web.ts extension convention, so the native module is never imported
 * (and never bundled) for the web preview. The web build has no real map
 * rendering; that's expected, not a bug — see src/app/(tabs)/map.web.tsx
 * (or whatever fallback the map screen itself uses on web).
 */
export function configureMapbox(): void {
  // no-op on web
}
