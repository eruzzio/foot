import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

const ORIGIN = window.location.origin;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('[ffmpeg] 1. création instance');
      const instance = new FFmpeg();
      instance.on('log', ({ message }) => console.log('[ffmpeg-core]', message));

      const coreURL = `${ORIGIN}/ffmpeg/ffmpeg-core.js`;
      const wasmURL = `${ORIGIN}/ffmpeg/ffmpeg-core.wasm`;
      const classWorkerURL = `${ORIGIN}/ffmpeg/814.ffmpeg.js`;

      console.log('[ffmpeg] 2. load() core=', coreURL);
      await instance.load({ coreURL, wasmURL, classWorkerURL });
      console.log('[ffmpeg] 3. chargé OK ✓');
      ffmpeg = instance;
      return instance;
    } catch (e: any) {
      loadingPromise = null;
      console.error('[ffmpeg] ÉCHEC détaillé:', e);
      throw new Error('Chargement du moteur vidéo impossible : ' + (e?.message || e));
    }
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
        '-ss', String(start), '-i', inName, '-t', String(dur),
        '-vf', 'scale=-2:720', '-r', '30',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
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
