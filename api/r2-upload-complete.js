import { S3Client, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function checkAuth(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;
  const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data?.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAuth(req))) return res.status(401).json({ error: 'Non authentifié' });

  const { key, uploadId, parts, abort } = req.body || {};
  if (!key || !uploadId) return res.status(400).json({ error: 'Paramètres manquants (key, uploadId)' });

  try {
    if (abort) {
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      }));
      return res.status(200).json({ aborted: true });
    }

    if (!Array.isArray(parts) || !parts.length) {
      return res.status(400).json({ error: 'Paramètre "parts" manquant ou vide' });
    }

    await s3.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(p => ({ ETag: p.etag, PartNumber: p.partNumber })),
      },
    }));
    return res.status(200).json({ done: true, key });
  } catch (err) {
    console.error('[r2-upload-complete]', err?.message);
    return res.status(500).json({ error: err?.message || 'Erreur finalisation' });
  }
}
