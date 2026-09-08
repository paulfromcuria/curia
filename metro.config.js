// Metro's package.json "exports" resolution has known rough edges with
// @supabase/supabase-js's dependency chain (postgrest-js, ws, isows) — a
// well-documented Expo/Supabase compatibility gap, not a broken install:
// Metro resolves the exports map to an absolute `dist/index.mjs` path and
// then incorrectly re-appends its platform-extension search pattern on top
// of that already-resolved filename, so it goes looking for a literal
// `index.mjs.web.ts` etc. and fails. Supabase's own React Native/Expo setup
// guide recommends the same fix used here: fall back to Metro's traditional
// main-field/file-based resolution instead of package exports.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
