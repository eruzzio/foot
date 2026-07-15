import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

// Plusieurs sources de core en fallback (single-thread, pas besoin de COOP/COEP)
const CORE_SOURCES = [
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
];

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let lastErr: any = null;
    for (const base of CORE_SOURCES) {
      try {
        const instance = new FFmpeg();
        const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
        await instance.load({ coreURL, wasmURL });
        ffmpeg = instance;
        return instance;
      } catch (e) {
        lastErr = e;
        // essaie la source suivante
      }
    }
    loadingPromise = null;
    throw new Error('Chargement du moteur vidéo impossible : ' + (lastErr?.message || lastErr));
  })();

  return loadingPromise;
}

export async function createClipSession(videoFile: File) {
  const ff = await getFFmpeg();
  const inName = 'src_' + Math.random().toString(36).slice(2) + '.mp4';
  await ff.writeFile(inName, await fetchFile(videoFile));

  return {
    async clip(start: number, end: number, onProgress?: (r: number) => void): Promise<Blob> {
      const outName = 'clip_' + Math.random().toString(36).slice(2) + '.mp4';
      const dur = Math.max(0.5, end - start);
      const handler = ({ progress }: { progress: number }) => onProgress?.(Math.min(1, Math.max(0, progress)));
      if (onProgress) ff.on('progress', handler);
      await ff.exec([
        '-ss', String(start),
        '-i', inName,
        '-t', String(dur),
        '-vf', 'scale=-2:720',
        '-r', '30',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        outName,
      ]);
      if (onProgress) ff.off('progress', handler);
      const data = await ff.readFile(outName);
      try { await ff.deleteFile(outName); } catch {}
      return new Blob([data], { type: 'video/mp4' });
    },
    async cleanup() {
      try { await ff.deleteFile(inName); } catch {}
    },
  };
}
