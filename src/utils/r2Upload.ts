import { supabase } from '../lib/supabase';

const PART_SIZE = 25 * 1024 * 1024; // 25 Mo par partie (réduit le nb de morceaux : 2 Go => ~80 parties)
const MAX_RETRIES = 4;
const CONCURRENCY = 4; // nombre de morceaux envoyés en parallèle

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

async function uploadPartWithRetry(
  key: string,
  uploadId: string,
  partNumber: number,
  blob: Blob,
  attempt = 1,
): Promise<string> {
  try {
    // On (re)génère une URL signée fraîche à chaque tentative pour éviter toute expiration
    const { url } = await callApi<{ url: string }>('/api/r2-upload-sign-part', {
      key,
      uploadId,
      partNumber,
    });
    const res = await fetch(url, { method: 'PUT', body: blob });
    if (!res.ok) throw new Error(`Échec upload partie ${partNumber} (${res.status})`);
    const etag = res.headers.get('ETag');
    if (!etag) {
      throw new Error(
        "ETag absent — vérifie que le CORS du bucket R2 expose bien le header 'ETag'"
      );
    }
    return etag;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return uploadPartWithRetry(key, uploadId, partNumber, blob, attempt + 1);
    }
    throw err;
  }
}

/**
 * Upload multipart (S3-compatible) vers Cloudflare R2, avec parties parallélisées.
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
  const parts: { etag: string; partNumber: number }[] = new Array(totalParts);
  let uploadedBytes = 0;

  try {
    // File d'attente des index de parties, consommée par CONCURRENCY workers en parallèle
    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= totalParts) return;
        const partNumber = i + 1;
        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const blob = file.slice(start, end);

        const etag = await uploadPartWithRetry(key, uploadId, partNumber, blob);
        parts[i] = { etag, partNumber };

        uploadedBytes += blob.size;
        if (onProgress) onProgress(Math.round((uploadedBytes / file.size) * 100));
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, totalParts) }, worker));

    await callApi('/api/r2-upload-complete', { key, uploadId, parts });
  } catch (err) {
    // Nettoyage : on annule l'upload multipart en cas d'échec pour ne pas laisser de déchets facturables
    await callApi('/api/r2-upload-complete', { key, uploadId, abort: true }).catch(() => {});
    throw err;
  }
}
