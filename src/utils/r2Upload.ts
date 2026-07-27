import { supabase } from '../lib/supabase';

const PART_SIZE = 8 * 1024 * 1024; // 8 Mo par partie (min S3 = 5 Mo sauf dernière partie)
const MAX_RETRIES = 3;

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Non authentifié');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function callApi<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${path} (${res.status})`);
  }
  return res.json();
}

async function uploadPartWithRetry(url: string, blob: Blob, attempt = 1): Promise<string> {
  try {
    const res = await fetch(url, { method: 'PUT', body: blob });
    if (!res.ok) throw new Error(`Échec upload partie (${res.status})`);
    const etag = res.headers.get('ETag');
    if (!etag) {
      throw new Error(
        "ETag absent de la réponse — vérifie que le CORS du bucket R2 expose bien le header 'ETag'"
      );
    }
    return etag;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return uploadPartWithRetry(url, blob, attempt + 1);
    }
    throw err;
  }
}

/**
 * Upload multipart (S3-compatible) vers Cloudflare R2.
 * Remplace l'ancien upload TUS vers Supabase Storage (limité à 50 Mo sur le plan gratuit).
 */
export async function uploadToR2(
  key: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { uploadId } = await callApi<{ uploadId: string; key: string }>('/api/r2-upload-init', {
    key,
    contentType: file.type || 'video/mp4',
  });

  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts: { etag: string; partNumber: number }[] = [];
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);

      const { url } = await callApi<{ url: string }>('/api/r2-upload-sign-part', {
        key,
        uploadId,
        partNumber,
      });

      const etag = await uploadPartWithRetry(url, blob);
      parts.push({ etag, partNumber });

      uploadedBytes += blob.size;
      if (onProgress) onProgress(Math.round((uploadedBytes / file.size) * 100));
    }

    await callApi('/api/r2-upload-complete', { key, uploadId, parts });
  } catch (err) {
    // Nettoyage : on annule l'upload multipart en cas d'échec pour ne pas laisser de déchets facturables
    await callApi('/api/r2-upload-complete', { key, uploadId, abort: true }).catch(() => {});
    throw err;
  }
}
