import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { IncomingForm } from 'formidable';
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const id = randomUUID();
  const inputPath = join(tmpdir(), `orion-input-${id}`);
  const outputPath = join(tmpdir(), `orion-output-${id}.mp4`);

  try {
    // Parser le FormData
    const form = new IncomingForm({ maxFileSize: 500 * 1024 * 1024 }); // 500MB max
    const [fields, files] = await form.parse(req);

    const start = parseFloat(fields.start?.[0] || '0');
    const duration = parseFloat(fields.duration?.[0] || '10');
    const file = files.video?.[0];

    if (!file) return res.status(400).json({ error: 'No video file' });

    // Copier le fichier uploadé vers un path temporaire
    await new Promise((resolve, reject) => {
      const rs = createReadStream(file.filepath);
      const ws = createWriteStream(inputPath);
      rs.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });

    // Convertir avec FFmpeg en MP4 H.264
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 18',          // Qualité quasi-lossless (0=parfait, 51=pire)
          '-c:a aac',
          '-b:a 192k',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Lire le fichier MP4 et l'envoyer
    const { readFileSync } = await import('fs');
    const mp4Buffer = readFileSync(outputPath);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
    res.setHeader('Content-Length', mp4Buffer.length);
    res.send(mp4Buffer);

  } catch (err) {
    console.error('Clip error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Nettoyage
    if (existsSync(inputPath)) unlinkSync(inputPath);
    if (existsSync(outputPath)) unlinkSync(outputPath);
  }
}
