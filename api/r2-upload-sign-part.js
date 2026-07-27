import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

  const { key, uploadId, partNumber } = req.body || {};
  if (!key || !uploadId || !partNumber) {
    return res.status(400).json({ error: 'Paramètres manquants (key, uploadId, partNumber)' });
  }

  try {
    const cmd = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    // URL valable 15 min, largement suffisant pour envoyer un morceau de 8 Mo
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[r2-upload-sign-part]', err?.message);
    return res.status(500).json({ error: err?.message || 'Erreur signature' });
  }
}
