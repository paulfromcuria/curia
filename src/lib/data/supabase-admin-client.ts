import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see .env.example.'
  );
}

/**
 * A SEPARATE client instance for the admin surface — same project and same
 * public anon key as supabase-client.ts (access control is still Row Level
 * Security, not a different credential), but with its own auth storage key.
 * Without this, signing into /admin and signing into the member app in the
 * same browser would share one localStorage-backed session and stomp on
 * each other, breaking the isolation src/lib/admin/admin-session.tsx's own
 * doc comment already promises ("neither reads nor writes member session
 * state"). See that file for the real admin-auth logic built on top of
 * this client.
 */
export const supabaseAdmin = createClient(url, anonKey, {
  auth: {
    storageKey: 'sb-curia-admin-auth-token',
  },
});
