import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { IncomingForm } from 'formidable';
import { createWriteStream, createReadStream, unlinkSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '60mb',
  },
  maxDuration: 60, // secondes (max plan Hobby)
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `orion-in-${id}.webm`);
  const outputPath = join(tmpdir(), `orion-out-${id}.mp4`);

  try {
    // 1. Parser le FormData (le WebM est déjà découpé côté navigateur)
    const form = new IncomingForm({ maxFileSize: 200 * 1024 * 1024 });
    const [, files] = await form.parse(req);

    const fileArr = files.video;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier vidéo reçu' });
    }

    // 2. Copier le fichier uploadé vers un chemin temporaire
    await new Promise((resolve, reject) => {
      const rs = createReadStream(file.filepath);
      const ws = createWriteStream(inputPath);
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws);
    });

    // 3. Transcoder WebM -> MP4 H.264 (PAS de re-découpage : le clip est déjà coupé)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',   // rapide pour tenir dans les 60s
          '-crf 20',            // bonne qualité, fichier raisonnable
          '-c:a aac',
          '-b:a 160k',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => reject(new Error('FFmpeg: ' + err.message)))
        .run();
    });

    // 4. Renvoyer le MP4
    if (!existsSync(outputPath)) {
      return res.status(500).json({ error: 'Conversion échouée (fichier absent)' });
    }
    const mp4 = readFileSync(outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
    res.setHeader('Content-Length', mp4.length);
    return res.status(200).send(mp4);

  } catch (err) {
    console.error('clip-video error:', err);
    return res.status(500).json({ error: err?.message || 'Erreur serveur' });
  } finally {
    try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch {}
    try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch {}
  }
}
