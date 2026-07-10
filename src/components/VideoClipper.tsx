import { useRef, useState, useEffect } from 'react';
import { Upload, Download, X, Play, Pause, Film, Scissors, Clock, Loader, Check, ListVideo, Package, Film as FilmIcon } from 'lucide-react';
import JSZip from 'jszip';

interface ClipRequest { timestamp: number; label: string; team: string; }
interface PlaylistItem { id: string; timestamp: number; label: string; team: string; }
interface Props {
  matchDuration: number;
  onClose: () => void;
  pendingClip?: ClipRequest | null;
  playlist?: PlaylistItem[];
  initialVideoFile?: File | null;
  initialVideoOffset?: number;
}

export default function VideoClipper({ onClose, pendingClip, playlist, initialVideoFile, initialVideoOffset = 0 }: Props) {
  const isPlaylistMode = !!playlist && playlist.length > 0;
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(initialVideoFile || null);
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoFile ? URL.createObjectURL(initialVideoFile) : '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(10);
  const [beforeSecs, setBeforeSecs] = useState(5);
  const [afterSecs, setAfterSecs] = useState(5);
  const [videoOffset, setVideoOffset] = useState(initialVideoOffset);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clipUrl, setClipUrl] = useState('');
  const [error, setError] = useState('');
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4');
  const [converting, setConverting] = useState(false);

  // Playlist
  const [plBefore, setPlBefore] = useState(5);
  const [plAfter, setPlAfter] = useState(5);
  const [plMode, setPlMode] = useState<'single' | 'zip'>('single');
  const [plCurrentIdx, setPlCurrentIdx] = useState(0);
  const [plDone, setPlDone] = useState(false);
  const [plResultUrl, setPlResultUrl] = useState('');
  const [plResultName, setPlResultName] = useState('');

  const exportPlaylist = async () => {
    if (!videoRef.current || !videoFile || !playlist) return;
    setProcessing(true); setError(''); setPlDone(false); setPlResultUrl('');

    try {
      // 1. Capturer chaque séquence en WebM
      const segments: { blob: Blob; label: string }[] = [];
      for (let i = 0; i < playlist.length; i++) {
        setPlCurrentIdx(i);
        setProgress(0);
        const item = playlist[i];
        const vTs = item.timestamp + videoOffset;
        const s = Math.max(0, vTs - plBefore);
        const e = Math.min(duration, vTs + plAfter);
        const webm = await captureSegment(s, e, setProgress);
        segments.push({ blob: webm, label: item.label });
      }

      setConverting(true);

      if (plMode === 'zip') {
        // 2a. Convertir chacun en MP4 puis zipper
        const zip = new JSZip();
        let anyWebm = false;
        for (let i = 0; i < segments.length; i++) {
          setPlCurrentIdx(i);
          const { blob, format } = await convertToMp4(segments[i].blob);
          if (format === 'webm') anyWebm = true;
          const safe = segments[i].label.replace(/[^a-z0-9]/gi, '_');
          zip.file(`${String(i + 1).padStart(2, '0')}_${safe}.${format}`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setPlResultUrl(URL.createObjectURL(zipBlob));
        setPlResultName('playlist_clips.zip');
        setOutputFormat(anyWebm ? 'webm' : 'mp4');
        if (anyWebm) setError('Certains clips sont en WebM (conversion MP4 partielle).');
      } else {
        // 2b. Concaténer les WebM en un seul fichier, puis convertir en MP4
        const merged = new Blob(segments.map(s => s.blob), { type: 'video/webm' });
        const { blob, format, error: convErr } = await convertToMp4(merged);
        setPlResultUrl(URL.createObjectURL(blob));
        setPlResultName(`playlist_montage.${format}`);
        setOutputFormat(format);
        if (convErr) setError(`Conversion MP4 indisponible (${convErr}). Montage disponible en WebM.`);
      }

      setConverting(false);
      setPlDone(true);
    } catch (e: any) {
      setError('Erreur playlist : ' + (e?.message || String(e)));
    }
    setProcessing(false);
  };

  const downloadPlaylistResult = () => {
    if (!plResultUrl) return;
    const a = document.createElement('a');
    a.href = plResultUrl;
    a.download = plResultName;
    a.click();
  };

  useEffect(() => {
    if (pendingClip && videoFile && duration > 0) {
      const videoTs = pendingClip.timestamp + videoOffset;
      setClipStart(parseFloat(Math.max(0, videoTs - beforeSecs).toFixed(1)));
      setClipEnd(parseFloat(Math.min(duration, videoTs + afterSecs).toFixed(1)));
      if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoTs - beforeSecs);
    }
  }, [pendingClip, duration, videoOffset]);

  const handleFileSelect = (file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setClipUrl('');
    setError('');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // Capture une séquence [start,end] du lecteur en WebM (MediaRecorder)
  const captureSegment = (start: number, end: number, onProg?: (p: number) => void): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) { reject(new Error('Pas de vidéo')); return; }
      const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
      if (!stream) { reject(new Error('captureStream non supporté (utilisez Chrome)')); return; }
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const dur = end - start;
      recorder.onstop = () => {
        video.muted = false;
        video.style.width = ''; video.style.height = ''; video.style.maxHeight = '240px';
        video.style.position = ''; video.style.opacity = ''; video.style.pointerEvents = ''; video.style.zIndex = '';
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
      recorder.onerror = () => reject(new Error('Erreur enregistrement'));
      video.currentTime = start;
      video.muted = true;
      video.style.width = video.videoWidth + 'px';
      video.style.height = video.videoHeight + 'px';
      video.style.maxHeight = 'none'; video.style.position = 'fixed';
      video.style.opacity = '0'; video.style.pointerEvents = 'none'; video.style.zIndex = '-1';
      video.onseeked = () => {
        video.onseeked = null;
        recorder.start(100);
        video.play();
        const iv = setInterval(() => {
          if (onProg) onProg(Math.min(99, Math.round(((video.currentTime - start) / dur) * 100)));
          if (video.currentTime >= end) { clearInterval(iv); video.pause(); recorder.stop(); }
        }, 100);
      };
    });
  };

  // Convertit un WebM en MP4 via le serveur. Renvoie {blob, format}
  const convertToMp4 = async (webmBlob: Blob): Promise<{ blob: Blob; format: 'mp4' | 'webm'; error?: string }> => {
    try {
      const fd = new FormData();
      fd.append('video', webmBlob, 'clip.webm');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 90000);
      const resp = await fetch('/api/clip-video', { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(tid);
      const ctype = resp.headers.get('content-type') || '';
      if (resp.ok && ctype.includes('video')) {
        const mp4 = await resp.blob();
        if (mp4.size > 1000) return { blob: mp4, format: 'mp4' };
        return { blob: webmBlob, format: 'webm', error: 'MP4 vide' };
      }
      let detail = String(resp.status);
      try { const j = await resp.json(); if (j?.error) detail = j.error; }
      catch { try { const t = await resp.text(); if (t) detail = t.slice(0, 120); } catch {} }
      return { blob: webmBlob, format: 'webm', error: detail };
    } catch (e: any) {
      return { blob: webmBlob, format: 'webm', error: e?.name === 'AbortError' ? 'timeout' : 'serveur injoignable' };
    }
  };

  const exportClip = async () => {
    if (!videoRef.current || !videoFile) return;
    setProcessing(true); setProgress(0); setClipUrl(''); setError('');
    try {
      const webmBlob = await captureSegment(clipStart, clipEnd, setProgress);
      setProgress(100); setConverting(true);
      const { blob, format, error: convErr } = await convertToMp4(webmBlob);
      setClipUrl(URL.createObjectURL(blob));
      setOutputFormat(format);
      if (convErr) setError(`Conversion MP4 indisponible (${convErr}). Clip disponible en WebM.`);
      setConverting(false);
    } catch (e: any) { setError('Erreur : ' + (e?.message || String(e))); }
    setProcessing(false);
  };

  const downloadClip = () => {
    if (!clipUrl) return;
    const a = document.createElement('a');
    a.href = clipUrl;
    a.download = `clip_${(pendingClip?.label || 'sequence').replace(/\s/g, '_')}_${formatTime(clipStart)}.${outputFormat}`;
    a.click();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--orion-surface)', borderRadius:14, width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1.5px solid var(--orion-line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isPlaylistMode ? <ListVideo size={17} style={{ color:'var(--orion-accent)' }} /> : <Film size={17} style={{ color:'var(--orion-accent)' }} />}
            <span style={{ fontSize:15, fontWeight:800, color:'var(--orion-text)' }}>{isPlaylistMode ? `Export Playlist · ${playlist!.length} séquences` : 'Export Clip Vidéo'}</span>
          </div>
          <button onClick={onClose} style={{ padding:6, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', cursor:'pointer', color:'var(--orion-text-mute)' }}><X size={15} /></button>
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          {pendingClip && (
            <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(61,128,224,0.08)', border:'1.5px solid rgba(61,128,224,0.25)', display:'flex', alignItems:'center', gap:10 }}>
              <Scissors size={13} style={{ color:'var(--orion-accent)' }} />
              <span style={{ fontSize:13, fontWeight:700, color:'var(--orion-text)' }}>{pendingClip.label}</span>
              <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>· {formatTime(pendingClip.timestamp)} · Éq. {pendingClip.team}</span>
            </div>
          )}

          {!videoFile ? (
            <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) handleFileSelect(f); }}
              onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
              style={{ border:'2px dashed var(--orion-line-strong)', borderRadius:10, padding:'32px 24px', textAlign:'center', cursor:'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='var(--orion-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='var(--orion-line-strong)')}>
              <Upload size={28} style={{ color:'var(--orion-text-faint)', marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginBottom:5 }}>Charger la vidéo du match</div>
              <div style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Glisser-déposer ou cliquer</div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>
          ) : (
            <>
              <div style={{ borderRadius:10, overflow:'hidden', background:'#000' }}>
                <video ref={videoRef} src={videoUrl} style={{ width:'100%', maxHeight:240, display:'block' }}
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => { const d = videoRef.current?.duration || 0; setDuration(d); if (!pendingClip) setClipEnd(Math.min(10, d)); }}
                  onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={() => { if (!videoRef.current) return; isPlaying ? videoRef.current.pause() : videoRef.current.play(); }}
                  style={{ width:32, height:32, borderRadius:'50%', background:'var(--orion-accent)', border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div style={{ flex:1, position:'relative', height:6, background:'var(--orion-surface-3)', borderRadius:3, cursor:'pointer' }}
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (videoRef.current && duration) videoRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration; }}>
                  {duration > 0 && <>
                    <div style={{ position:'absolute', left:`${(clipStart/duration)*100}%`, width:`${((clipEnd-clipStart)/duration)*100}%`, height:'100%', background:'rgba(61,128,224,0.3)', borderRadius:3 }} />
                    <div style={{ position:'absolute', left:`${(currentTime/duration)*100}%`, top:-3, width:12, height:12, borderRadius:'50%', background:'var(--orion-accent)', transform:'translateX(-50%)', pointerEvents:'none' }} />
                  </>}
                </div>
                <span style={{ fontSize:11, fontFamily:'var(--orion-font-mono)', color:'var(--orion-text-mute)', flexShrink:0 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              <div style={{ padding:'10px 14px', background:'var(--orion-surface-2)', borderRadius:8, border:'1px solid var(--orion-line)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <Clock size={13} style={{ color:'var(--orion-text-mute)' }} />
                <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Coup d'envoi à</span>
                <input type="number" value={videoOffset} onChange={e => setVideoOffset(Number(e.target.value))} min={0} step={1}
                  style={{ width:60, padding:'4px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none' }} />
                <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>s dans la vidéo</span>
                <button onClick={() => setVideoOffset(Math.round(currentTime))}
                  style={{ padding:'4px 10px', borderRadius:6, border:'1.5px solid var(--orion-accent)', background:'rgba(61,128,224,0.08)', color:'var(--orion-accent)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  ← Position actuelle
                </button>
              </div>

              {!isPlaylistMode && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Début (s)', val:clipStart, fn:(v:number) => setClipStart(v) },
                  { label:'Fin (s)', val:clipEnd, fn:(v:number) => setClipEnd(v) },
                  { label:'Avant (s)', val:beforeSecs, fn:(v:number) => { setBeforeSecs(v); if (pendingClip) setClipStart(Math.max(0, pendingClip.timestamp + videoOffset - v)); } },
                  { label:'Après (s)', val:afterSecs, fn:(v:number) => { setAfterSecs(v); if (pendingClip) setClipEnd(Math.min(duration, pendingClip.timestamp + videoOffset + v)); } },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>{f.label}</div>
                    <input type="number" value={f.val} onChange={e => f.fn(Number(e.target.value))} step={0.5} min={0}
                      style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                  </div>
                ))}
              </div>
              )}

              {/* ─── MODE PLAYLIST ─── */}
              {isPlaylistMode && (
                <>
                  {/* Liste des séquences */}
                  <div style={{ maxHeight:130, overflowY:'auto', border:'1.5px solid var(--orion-line)', borderRadius:8, padding:8, display:'flex', flexDirection:'column', gap:4 }}>
                    {playlist!.map((p, i) => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', background: plCurrentIdx === i && processing ? 'rgba(61,128,224,0.1)' : 'var(--orion-surface-2)', borderRadius:5, fontSize:12 }}>
                        <span style={{ color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', minWidth:20 }}>{i+1}.</span>
                        <span style={{ color:'var(--orion-text)', fontWeight:600, flex:1 }}>{p.label}</span>
                        <span style={{ color:'var(--orion-text-mute)' }}>{formatTime(p.timestamp)}</span>
                        {plCurrentIdx === i && processing && <Loader size={12} style={{ color:'var(--orion-accent)' }} />}
                      </div>
                    ))}
                  </div>

                  {/* Réglages avant/après globaux */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes avant chaque action</div>
                      <input type="number" value={plBefore} onChange={e => setPlBefore(Number(e.target.value))} step={0.5} min={0}
                        style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes après chaque action</div>
                      <input type="number" value={plAfter} onChange={e => setPlAfter(Number(e.target.value))} step={0.5} min={0}
                        style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                    </div>
                  </div>

                  {/* Choix du format de sortie */}
                  <div>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:6, fontWeight:600 }}>Format de sortie</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setPlMode('single')}
                        style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, cursor:'pointer', border:`1.5px solid ${plMode==='single'?'var(--orion-accent)':'var(--orion-line)'}`, background: plMode==='single'?'rgba(61,128,224,0.06)':'var(--orion-surface)' }}>
                        <FilmIcon size={16} style={{ color: plMode==='single'?'var(--orion-accent)':'var(--orion-text-mute)' }} />
                        <div style={{ textAlign:'left' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--orion-text)' }}>Un seul fichier</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)' }}>Montage bout à bout</div>
                        </div>
                      </button>
                      <button onClick={() => setPlMode('zip')}
                        style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, cursor:'pointer', border:`1.5px solid ${plMode==='zip'?'var(--orion-accent)':'var(--orion-line)'}`, background: plMode==='zip'?'rgba(61,128,224,0.06)':'var(--orion-surface)' }}>
                        <Package size={16} style={{ color: plMode==='zip'?'var(--orion-accent)':'var(--orion-text-mute)' }} />
                        <div style={{ textAlign:'left' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--orion-text)' }}>Fichiers séparés</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)' }}>Un .zip de clips</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Bouton export playlist / téléchargement */}
                  <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                    {!plDone ? (
                      <button onClick={exportPlaylist} disabled={processing}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.7 : 1 }}>
                        {processing
                          ? <><Loader size={13} /> {converting ? `Conversion ${plCurrentIdx+1}/${playlist!.length}…` : `Capture ${plCurrentIdx+1}/${playlist!.length} (${progress}%)`}</>
                          : <><Download size={13} /> Générer la playlist</>}
                      </button>
                    ) : (
                      <button onClick={downloadPlaylistResult}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'var(--orion-green)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                        <Download size={13} /> Télécharger ({plResultName.endsWith('zip') ? 'ZIP' : outputFormat.toUpperCase()})
                      </button>
                    )}
                  </div>

                  {processing && (
                    <div style={{ height:5, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${converting ? ((plCurrentIdx+1)/playlist!.length)*100 : progress}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                    </div>
                  )}

                  {plDone && !processing && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--orion-green)', fontWeight:600 }}>
                      <Check size={14} /> Playlist prête · {playlist!.length} séquences
                    </div>
                  )}
                </>
              )}

              {!isPlaylistMode && (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = clipStart; }}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text)', cursor:'pointer' }}>
                  <Play size={13} /> Prévisualiser
                </button>
                <button onClick={exportClip} disabled={processing || clipEnd <= clipStart}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: processing ? 'wait' : 'pointer', opacity: (processing || clipEnd <= clipStart) ? 0.7 : 1 }}>
                  {processing ? <><Loader size={13} /> {converting ? 'Conversion…' : `${progress}%`}</> : <><Scissors size={13} /> Exporter le clip</>}
                </button>
                {clipUrl && (
                  <button onClick={downloadClip}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-green)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                    <Download size={13} /> Télécharger {outputFormat.toUpperCase()}
                  </button>
                )}
              </div>
              )}

              {!isPlaylistMode && processing && (
                <div>
                  <div style={{ height:5, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${converting ? 100 : progress}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>
                    {converting
                      ? 'Conversion MP4 sur le serveur… (peut prendre jusqu\'à une minute)'
                      : `Capture de la séquence en cours (${progress}%)…`}
                  </div>
                </div>
              )}

              {!isPlaylistMode && clipUrl && !processing && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--orion-text)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                    <Check size={13} style={{ color:'var(--orion-green)' }} /> Clip prêt · {formatTime(clipEnd - clipStart)} · Format {outputFormat.toUpperCase()}
                  </div>
                  <video src={clipUrl} controls style={{ width:'100%', borderRadius:8, background:'#000' }} />
                </div>
              )}

              {error && (
                clipUrl
                  ? <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.3)', fontSize:12.5, color:'#b45309' }}>⚠ {error}</div>
                  : <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(224,59,46,0.08)', border:'1px solid rgba(224,59,46,0.3)', fontSize:13, color:'#E03B2E' }}>{error}</div>
              )}

              <button onClick={() => { setVideoFile(null); setVideoUrl(''); setClipUrl(''); }}
                style={{ fontSize:12, color:'var(--orion-text-mute)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textAlign:'left' }}>
                Changer de vidéo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
