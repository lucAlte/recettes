import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const BUCKET = 'recipe-images';

export function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function avatarUrl(path) {
  if (!path) return null;
  return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/** Lève une erreur lisible si Supabase renvoie une erreur */
export function check({ data, error }) {
  if (error) throw new Error(error.message || 'Erreur Supabase');
  return data;
}
