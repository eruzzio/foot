import { supabase } from './supabase';

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function getCurrentUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}
  return FALLBACK_USER_ID;
}

export async function getCurrentUser(): Promise<{ id: string }> {
  const id = await getCurrentUserId();
  return { id };
}
