declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Mapbox public access token, loaded from .env (gitignored) via Expo's
     * built-in EXPO_PUBLIC_ env var support. See CLAUDE.md "Tech stack" and
     * "Still genuinely open" — this was a genuine credential gap until the
     * user supplied a real token.
     */
    EXPO_PUBLIC_MAPBOX_TOKEN?: string;
  }
}
