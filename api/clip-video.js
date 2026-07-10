import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { IncomingForm } from 'formidable';
import { createWriteStream, createReadStream, unlinkSync, existsSync, readFileSync, chmodSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Résoudre le chemin du binaire ffmpeg et forcer les permissions d'exécution
let FFMPEG_PATH = ffmpegInstaller.path;
try {
  // Sur Vercel, le binaire peut perdre son bit exécutable
  chmodSync(FFMPEG_PATH, 0o755);
} catch (e) {
  console.error('chmod ffmpeg failed:', e?.message);
}
ffmpeg.setFfmpegPath(FFMPEG_PATH);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '80mb',
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `orion-in-${id}.webm`);
  const outputPath = join(tmpdir(), `orion-out-${id}.mp4`);

  const log = (...a) => console.log('[clip-video]', ...a);

  try {
    log('ffmpeg path:', FFMPEG_PATH, 'exists:', existsSync(FFMPEG_PATH));

    // 1. Parser le FormData
    const form = new IncomingForm({ maxFileSize: 200 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    const fileArr = files.video;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) {
      log('no file received');
      return res.status(400).json({ error: 'Aucun fichier vidéo reçu' });
    }
    log('received file:', file.originalFilename, file.size, 'bytes');

    // 2. Copier vers un chemin temporaire
    await new Promise((resolve, reject) => {
      const rs = createReadStream(file.filepath);
      const ws = createWriteStream(inputPath);
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws);
    });
    log('copied to', inputPath, statSync(inputPath).size, 'bytes');

    // 3. Transcoder WebM -> MP4 H.264
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('start', (cmd) => log('ffmpeg start:', cmd))
        .on('end', () => { log('ffmpeg done'); resolve(); })
        .on('error', (err, stdout, stderr) => {
          log('ffmpeg error:', err?.message, 'stderr:', stderr);
          reject(new Error('FFmpeg: ' + (err?.message || 'unknown')));
        })
        .run();
    });

    if (!existsSync(outputPath)) {
      return res.status(500).json({ error: 'Conversion échouée (fichier de sortie absent)' });
    }

    const mp4 = readFileSync(outputPath);
    log('output mp4:', mp4.length, 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
    res.setHeader('Content-Length', mp4.length);
    return res.status(200).send(mp4);

  } catch (err) {
    console.error('[clip-video] fatal:', err?.message, err?.stack);
    return res.status(500).json({ error: err?.message || 'Erreur serveur' });
  } finally {
    try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch {}
    try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch {}
  }
}
