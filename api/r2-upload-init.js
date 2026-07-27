import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Vérifie que l'appelant est bien authentifié côté Supabase avant d'autoriser un upload
async function checkAuth(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data?.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkAuth(req))) return res.status(401).json({ error: 'Non authentifié' });

  const { key, contentType } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Paramètre "key" manquant' });

  try {
    const cmd = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'video/mp4',
    });
    const result = await s3.send(cmd);
    return res.status(200).json({ uploadId: result.UploadId, key });
  } catch (err) {
    console.error('[r2-upload-init]', err?.message);
    return res.status(500).json({ error: err?.message || 'Erreur init upload' });
  }
}
