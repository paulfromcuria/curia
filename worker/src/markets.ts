import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface NewMetro {
  id: string;
  name: string;
  region: string;
  searchLanguageHint?: string;
}

interface Phase {
  name: string;
  metros?: string[];
  newMetros?: NewMetro[];
}

export interface MarketsConfig {
  minVenueFloor: number;
  phases: Phase[];
}

let cached: MarketsConfig | null = null;

export function loadMarkets(): MarketsConfig {
  if (cached) return cached;
  const raw = readFileSync(path.join(__dirname, '..', 'markets.yaml'), 'utf8');
  cached = parse(raw) as MarketsConfig;
  return cached;
}
