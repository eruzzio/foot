import { createClient } from '@supabase/supabase-js';

// Retourne l'utilisateur authentifié (ou null), pour pouvoir vérifier
// qu'il n'accède qu'à ses propres fichiers.
async function getAuthUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Non authentifié' });

    const { key, action } = req.body || {};
    if (!key) return res.status(400).json({ error: 'Paramètre "key" manquant' });

    // Sécurité : la clé doit appartenir à l'utilisateur (préfixe {user.id}/).
    // Empêche un utilisateur connecté d'accéder aux fichiers d'un autre.
    if (!key.startsWith(`${user.id}/`)) {
      return res.status(403).json({ error: 'Accès refusé à cette ressource' });
    }

    const { S3Client, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({
      region: 'auto',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    if (action === 'delete') {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      return res.status(200).json({ deleted: true });
    }

    const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 7200 });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[r2-get-signed-url]', err?.message, err?.stack);
    return res.status(500).json({ error: 'get-signed-url: ' + (err?.message || 'erreur inconnue') });
  }
}
