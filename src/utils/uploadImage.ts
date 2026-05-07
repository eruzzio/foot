import { supabase } from '../lib/supabase';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadValidation {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): UploadValidation {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Format non supporté. Utilisez JPG, PNG ou WebP.` };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `Fichier trop volumineux (max ${MAX_SIZE_MB}MB). Le vôtre fait ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }
  return { valid: true };
}

export async function uploadPlayerPhoto(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('player-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('player-photos')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deletePlayerPhoto(photoUrl: string): Promise<void> {
  const url = new URL(photoUrl);
  const pathParts = url.pathname.split('/');
  const bucketIndex = pathParts.indexOf('player-photos');

  if (bucketIndex === -1) return;

  const filePath = pathParts.slice(bucketIndex + 1).join('/');

  const { error } = await supabase.storage
    .from('player-photos')
    .remove([filePath]);

  if (error) {
    throw error;
  }
}
