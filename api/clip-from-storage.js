import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { readFileSync, existsSync, unlinkSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

let FFMPEG_PATH = ffmpegInstaller.path;
try { chmodSync(FFMPEG_PATH, 0o755); } catch (e) { console.error('chmod:', e?.message); }
ffmpeg.setFfmpegPath(FFMPEG_PATH);

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { videoUrl, start, duration } = req.body || {};
  if (!videoUrl || start == null || !duration) {
    return res.status(400).json({ error: 'Paramètres manquants (videoUrl, start, duration)' });
  }

  const id = randomUUID();
  const outputPath = join(tmpdir(), `clip-${id}.mp4`);
  const log = (...a) => console.log('[clip-from-storage]', ...a);

  try {
    log('découpe:', { start, duration, videoUrl: videoUrl.slice(0, 80) });

    await new Promise((resolve, reject) => {
      ffmpeg(videoUrl)
        // -ss AVANT l'input = seek rapide : FFmpeg ne lit que la portion nécessaire (pas tout le fichier)
        .inputOptions([`-ss ${start}`])
        .outputOptions([
          `-t ${duration}`,
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-vf scale=-2:720',
          '-r 30',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('start', cmd => log('ffmpeg:', cmd))
        .on('end', () => { log('done'); resolve(); })
        .on('error', (err, stdout, stderr) => {
          log('error:', err?.message, 'stderr:', stderr);
          reject(new Error('FFmpeg: ' + (err?.message || 'unknown')));
        })
        .run();
    });

    if (!existsSync(outputPath)) return res.status(500).json({ error: 'Clip non généré' });
    const mp4 = readFileSync(outputPath);
    log('clip:', mp4.length, 'octets');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', mp4.length);
    return res.status(200).send(mp4);
  } catch (err) {
    console.error('[clip-from-storage] fatal:', err?.message);
    return res.status(500).json({ error: err?.message || 'Erreur serveur' });
  } finally {
    try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch {}
  }
}
