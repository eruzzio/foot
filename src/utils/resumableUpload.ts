import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_ID = SUPABASE_URL.replace('https://', '').split('.')[0];

/**
 * Upload resumable (TUS) vers Supabase Storage.
 * Contourne la limite de 50 Mo des uploads standards du plan gratuit.
 */
export async function uploadResumable(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Non authentifié');

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // 6 Mo par morceau (requis par Supabase)
      onError: (err) => reject(new Error('Upload : ' + err.message)),
      onProgress: (sent, total) => {
        if (onProgress) onProgress(Math.round((sent / total) * 100));
      },
      onSuccess: () => resolve(),
    });

    // Reprendre un upload précédent si possible
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}
