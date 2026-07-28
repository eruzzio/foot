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
    if (!(await checkAuth(req))) return res.status(401).json({ error: 'Non authentifié' });

    const { key, uploadId, partNumber } = req.body || {};
    if (!key || !uploadId || !partNumber) {
      return res.status(400).json({ error: 'Paramètres manquants (key, uploadId, partNumber)' });
    }

    const { S3Client, UploadPartCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      // R2 ne supporte pas les checksums CRC32 que le SDK AWS v3 ajoute par défaut.
      // Ces deux options restaurent le comportement compatible (pas de checksum auto).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    const url = await getSignedUrl(
      s3,
      new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: 900 }
    );
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[r2-upload-sign-part]', err?.message, err?.stack);
    return res.status(500).json({ error: 'sign: ' + (err?.message || 'erreur inconnue') });
  }
}
