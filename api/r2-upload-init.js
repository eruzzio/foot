import { createClient } from '@supabase/supabase-js';

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

  try {
    const missing = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'SUPABASE_SERVICE_KEY']
      .filter(k => !process.env[k]);
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) missing.push('SUPABASE_URL');
    if (missing.length) {
      return res.status(500).json({ error: 'Variables env manquantes: ' + missing.join(', ') });
    }

    if (!(await checkAuth(req))) return res.status(401).json({ error: 'Non authentifié' });

    const { key, contentType } = req.body || {};
    if (!key) return res.status(400).json({ error: 'Paramètre "key" manquant' });

    // Import + instanciation lazy pour capturer toute erreur du SDK dans ce try/catch
    const { S3Client, CreateMultipartUploadCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const result = await s3.send(new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'video/mp4',
    }));
    return res.status(200).json({ uploadId: result.UploadId, key });
  } catch (err) {
    console.error('[r2-upload-init]', err?.message, err?.stack);
    return res.status(500).json({ error: 'init: ' + (err?.message || 'erreur inconnue') });
  }
}
