import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

  const { key, action } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Paramètre "key" manquant' });

  try {
    if (action === 'delete') {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      return res.status(200).json({ deleted: true });
    }

    const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    // 2h de validité, comme l'ancienne URL signée Supabase, largement suffisant pour découper toute la playlist
    const url = await getSignedUrl(s3, cmd, { expiresIn: 7200 });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[r2-get-signed-url]', err?.message);
    return res.status(500).json({ error: err?.message || 'Erreur' });
  }
}
