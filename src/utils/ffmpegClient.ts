// Client ffmpeg.wasm autonome : pilote directement le worker 814.ffmpeg.js
// en type "classic" (obligatoire pour importScripts du core UMD).
// N'utilise PAS la classe FFmpeg de la lib (qui force type:"module" -> incompatible).

import { fetchFile } from '@ffmpeg/util';

const ORIGIN = window.location.origin;
const WORKER_URL = `${ORIGIN}/ffmpeg/814.ffmpeg.js`;
const CORE_URL = `${ORIGIN}/ffmpeg/ffmpeg-core.js`;
const WASM_URL = `${ORIGIN}/ffmpeg/ffmpeg-core.wasm`;

const T = {
  LOAD: 'LOAD', EXEC: 'EXEC', WRITE_FILE: 'WRITE_FILE', READ_FILE: 'READ_FILE',
  DELETE_FILE: 'DELETE_FILE', ERROR: 'ERROR', PROGRESS: 'PROGRESS', LOG: 'LOG',
};

class FFmpegClient {
  private worker: Worker | null = null;
  private loaded = false;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private progressCb: ((r: number) => void) | null = null;

  async load(): Promise<void> {
    if (this.loaded) return;
    // Worker en type "classic" -> importScripts autorisé
    this.worker = new Worker(WORKER_URL, { type: 'classic' });

    this.worker.onmessage = ({ data: { id, type, data } }: any) => {
      if (type === T.LOG) {
        if (data?.message) console.log('[ffmpeg-core]', data.message);
        return;
      }
      if (type === T.PROGRESS) {
        if (this.progressCb && typeof data?.progress === 'number') this.progressCb(data.progress);
        return;
      }
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (type === T.ERROR) p.reject(new Error(typeof data === 'string' ? data : 'ffmpeg error'));
      else p.resolve(data);
    };
    this.worker.onerror = (e) => console.error('[ffmpeg] worker onerror:', e.message, e);

    await this.send(T.LOAD, { coreURL: CORE_URL, wasmURL: WASM_URL });
    this.loaded = true;
  }

  private send(type: string, data: any, transfer: Transferable[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.seq++;
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, data }, transfer);
    });
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    await this.send(T.WRITE_FILE, { path: name, data }, [data.buffer]);
  }
  async readFile(name: string): Promise<Uint8Array> {
    return this.send(T.READ_FILE, { path: name, encoding: 'binary' });
  }
  async deleteFile(name: string): Promise<void> {
    try { await this.send(T.DELETE_FILE, { path: name }); } catch {}
  }
  async exec(args: string[], onProgress?: (r: number) => void): Promise<void> {
    this.progressCb = onProgress || null;
    await this.send(T.EXEC, { args, timeout: -1 });
    this.progressCb = null;
  }
}

let client: FFmpegClient | null = null;
let loadingPromise: Promise<FFmpegClient> | null = null;

export async function getFFmpeg(): Promise<FFmpegClient> {
  if (client) return client;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      console.log('[ffmpeg] chargement worker classic…');
      const c = new FFmpegClient();
      await c.load();
      console.log('[ffmpeg] chargé OK');
      client = c;
      return c;
    } catch (e: any) {
      loadingPromise = null;
      console.error('[ffmpeg] ÉCHEC:', e);
      throw new Error('Chargement du moteur vidéo impossible : ' + (e?.message || e));
    }
  })();
  return loadingPromise;
}

export async function createClipSession(videoFile: File) {
  const ff = await getFFmpeg();
  const inName = 'src_' + Math.random().toString(36).slice(2) + '.mp4';
  await ff.writeFile(inName, await fetchFile(videoFile) as Uint8Array);

  return {
    async clip(start: number, end: number, onProgress?: (r: number) => void): Promise<Blob> {
      const outName = 'clip_' + Math.random().toString(36).slice(2) + '.mp4';
      const dur = Math.max(0.5, end - start);
      await ff.exec([
        '-ss', String(start), '-i', inName, '-t', String(dur),
        '-vf', 'scale=-2:720', '-r', '30',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
        outName,
      ], onProgress);
      const data = await ff.readFile(outName);
      await ff.deleteFile(outName);
      return new Blob([data], { type: 'video/mp4' });
    },
    async cleanup() {
      await ff.deleteFile(inName);
    },
  };
}
