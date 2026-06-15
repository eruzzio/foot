// Vercel Serverless Function - ping Supabase toutes les 48h
export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    // Simple requête légère pour garder Supabase actif
    const response = await fetch(`${supabaseUrl}/rest/v1/orion_users?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    const ok = response.ok;
    const timestamp = new Date().toISOString();

    return res.status(200).json({
      status: ok ? 'alive' : 'error',
      timestamp,
      supabase_status: response.status,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
