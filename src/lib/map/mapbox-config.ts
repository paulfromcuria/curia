import Mapbox from '@rnmapbox/maps';

/**
 * Sets the real Mapbox access token at app startup. The token itself lives
 * in .env (gitignored, never committed) as EXPO_PUBLIC_MAPBOX_TOKEN — a
 * genuine credential gap per CLAUDE.md until the user supplied a real one.
 *
 * Android builds additionally need a SEPARATE secret "downloads" token
 * (Downloads:Read scope) configured at build time (EAS secrets /
 * ~/.gradle/gradle.properties as MAPBOX_DOWNLOADS_TOKEN), not this one —
 * see .env.example. That's still an open credential gap if Android builds
 * are needed; iOS does not require it.
 */
export function configureMapbox(): void {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn(
      'EXPO_PUBLIC_MAPBOX_TOKEN is not set — the real map will not render tiles. See .env.example.'
    );
    return;
  }
  Mapbox.setAccessToken(token);
}
