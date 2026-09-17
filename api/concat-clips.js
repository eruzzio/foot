import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

let FFMPEG_PATH = ffmpegInstaller.path;
try { chmodSync(FFMPEG_PATH, 0o755); } catch (e) { console.error('chmod:', e?.message); }
ffmpeg.setFfmpegPath(FFMPEG_PATH);

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 60,
};

const log = (...a) => console.log('[concat-clips]', ...a);

async function isAuthenticated(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;
  const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data?.user;
}

function isAllowedVideoUrl(u) {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    return host.endsWith('.r2.cloudflarestorage.com') || host.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

// Découpe une séquence [start, start+duration] de la vidéo source vers un fichier local
function cutSegment(videoUrl, start, duration, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoUrl)
      .setStartTime(start)
      .duration(duration)
      .outputOptions([
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-vf', 'scale=-2:720', '-r', '30',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
      ])
      .on('end', () => resolve(outPath))
      .on('error', reject)
      .save(outPath);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await isAuthenticated(req))) return res.status(401).json({ error: 'Non authentifié' });

  const { videoUrl, segments } = req.body || {};
  if (!videoUrl || !Array.isArray(segments) || !segments.length) {
    return res.status(400).json({ error: 'Paramètres manquants (videoUrl, segments)' });
  }
  if (!isAllowedVideoUrl(videoUrl)) {
    return res.status(400).json({ error: 'URL vidéo non autorisée' });
  }

  const tmp = tmpdir();
  const jobId = randomUUID();
  const partFiles = [];
  const listFile = join(tmp, `list-${jobId}.txt`);
  const outFile = join(tmp, `montage-${jobId}.mp4`);

  try {
    // 1. Découper chaque segment séparément
    for (let i = 0; i < segments.length; i++) {
      const { start, duration } = segments[i];
      if (start == null || !duration) continue;
      const part = join(tmp, `part-${jobId}-${i}.mp4`);
      await cutSegment(videoUrl, start, duration, part);
      partFiles.push(part);
      log(`segment ${i + 1}/${segments.length} découpé`);
    }
    if (!partFiles.length) return res.status(400).json({ error: 'Aucun segment valide' });

    // 2. Concaténer via le demuxer concat de ffmpeg (ré-encodage pour uniformité)
    const listContent = partFiles.map(p => `file '${p}'`).join('\n');
    writeFileSync(listFile, listContent);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
          '-r', '30', '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outFile);
    });
    log('montage terminé');

    const buffer = readFileSync(outFile);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[concat-clips]', err?.message);
    return res.status(500).json({ error: 'concat: ' + (err?.message || 'erreur inconnue') });
  } finally {
    // Nettoyage
    for (const p of partFiles) { try { if (existsSync(p)) unlinkSync(p); } catch {} }
    try { if (existsSync(listFile)) unlinkSync(listFile); } catch {}
    try { if (existsSync(outFile)) unlinkSync(outFile); } catch {}
  }
}
