import { readdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Vercel's (and some other static hosts') deploy upload silently drops any
 * path containing a `node_modules` segment — a sane default for normal
 * projects, but `expo export --platform web` names its Google Fonts asset
 * files `assets/node_modules/@expo-google-fonts/...` (mirroring the actual
 * npm package path Metro resolved them from), so those font files never
 * reach the deployment and the app falls back to unstyled/system fonts.
 * Confirmed by diffing local `dist` size (11MB) against what the Vercel CLI
 * actually uploaded (4.1MB) — the missing ~6.4MB was exactly `assets/`.
 *
 * Fix: rename the on-disk folder to something without "node_modules" in it,
 * then rewrite the same string in the built JS bundle (the only file that
 * references these paths — plain string literals in Metro's asset
 * registry, safe to find/replace verbatim). Run this after every
 * `expo export --platform web`, before deploying `dist/`.
 */
const DIST = path.join(process.cwd(), 'dist');
const OLD_DIR = path.join(DIST, 'assets', 'node_modules');
const NEW_DIR = path.join(DIST, 'assets', 'vendor-fonts');
const OLD_PATH_STR = 'assets/node_modules/';
const NEW_PATH_STR = 'assets/vendor-fonts/';

if (existsSync(OLD_DIR)) {
  renameSync(OLD_DIR, NEW_DIR);
  console.log(`Renamed ${OLD_DIR} -> ${NEW_DIR}`);

  const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
  const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));

  let patched = 0;
  for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    const content = readFileSync(filePath, 'utf8');
    if (!content.includes(OLD_PATH_STR)) continue;
    writeFileSync(filePath, content.split(OLD_PATH_STR).join(NEW_PATH_STR));
    patched++;
    console.log(`Patched ${file}`);
  }

  if (patched === 0) {
    console.warn('Warning: renamed the folder but found no JS bundle referencing the old path — check manually.');
  }
} else {
  console.log('No assets/node_modules folder found — nothing to rename.');
}

// SPA fallback so deep links (e.g. /venue/refuge) work on a hard load, while
// still letting real static files (the JS bundle, fonts, favicon) win over
// the fallback — Vercel's `rewrites` config applies unconditionally to every
// path including real files, so this needs the older `routes` format with
// an explicit `handle: filesystem` phase marker instead.
writeFileSync(
  path.join(DIST, 'vercel.json'),
  JSON.stringify(
    {
      routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/index.html' }],
    },
    null,
    2
  )
);
console.log('Wrote dist/vercel.json (SPA fallback).');
