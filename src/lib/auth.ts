import { supabase } from './supabase';

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{ id: string } | null> {
  const id = await getCurrentUserId();
  if (!id) return null;
  return { id };
}
