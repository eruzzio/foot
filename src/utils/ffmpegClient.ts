import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

// Core single-thread (ne nécessite PAS les headers COOP/COEP)
const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const instance = new FFmpeg();
    await instance.load({
      coreURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpeg = instance;
    return instance;
  })();
  return loadingPromise;
}

/**
 * Session de découpe : écrit le fichier source UNE SEULE FOIS,
 * puis permet de découper plusieurs segments efficacement.
 */
export async function createClipSession(videoFile: File) {
  const ff = await getFFmpeg();
  const inName = 'src_' + Math.random().toString(36).slice(2) + '.mp4';
  await ff.writeFile(inName, await fetchFile(videoFile));

  return {
    // Découpe un segment [start,end] -> clip MP4 720p
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
    // À appeler à la fin pour libérer la mémoire du fichier source
    async cleanup() {
      try { await ff.deleteFile(inName); } catch {}
    },
  };
}
