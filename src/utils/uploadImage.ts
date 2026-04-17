import { supabase } from '../lib/supabase';

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
