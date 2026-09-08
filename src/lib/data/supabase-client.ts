/**
 * The one Supabase client the app should ever construct — every other
 * module reaches the real backend through this, matching CLAUDE.md's own
 * "one real source of truth" pattern already used for session.searchOrigin.
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (see
 * .env.example) — both safe to bundle client-side, since access control is
 * Row Level Security (supabase/migrations/0001_init.sql), not secrecy of
 * these values. Never import the service role key here or anywhere in
 * src/ — that key bypasses RLS entirely and belongs only in
 * scripts/seed-supabase.mjs, run locally, never bundled into the app.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see .env.example.'
  );
}

export const supabase = createClient(url, anonKey);
