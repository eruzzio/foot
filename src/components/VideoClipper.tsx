import { useRef, useState, useCallback, useEffect } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { Upload, Download, X, Play, Pause, Film, Scissors, Clock, Loader, Check } from 'lucide-react';

interface ClipRequest {
  timestamp: number;
  label: string;
  team: string;
}

interface Props {
  matchDuration: number;
  onClose: () => void;
  pendingClip?: ClipRequest | null;
  initialVideoFile?: File | null;
  initialVideoOffset?: number;
}

const ffmpeg = createFFmpeg({
  corePath: '/ffmpeg/ffmpeg-core.js',
  log: false,
});

export default function VideoClipper({ matchDuration, onClose, pendingClip, initialVideoFile, initialVideoOffset = 0 }: Props) {
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

  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clipUrl, setClipUrl] = useState('');
  const [error, setError] = useState('');
  const [videoOffset, setVideoOffset] = useState(initialVideoOffset);

  useEffect(() => {
    if (initialVideoFile) loadFFmpeg();
  }, []);

  useEffect(() => {
    if (pendingClip && videoFile && duration > 0) {
      const videoTs = pendingClip.timestamp + videoOffset;
      const start = Math.max(0, videoTs - beforeSecs);
      const end = Math.min(duration, videoTs + afterSecs);
      setClipStart(parseFloat(start.toFixed(1)));
      setClipEnd(parseFloat(end.toFixed(1)));
      if (videoRef.current) videoRef.current.currentTime = start;
    }
  }, [pendingClip, videoFile, duration, videoOffset, beforeSecs, afterSecs]);

  const loadFFmpeg = async () => {
    if (ffmpeg.isLoaded() || ffmpegLoading) return;
    setFfmpegLoading(true);
    setError('');
    try {
      ffmpeg.setProgress(({ ratio }) => setProgress(Math.round(ratio * 100)));
      await ffmpeg.load();
      setFfmpegReady(true);
    } catch (e) {
      setError('Erreur chargement FFmpeg : ' + String(e));
    }
    setFfmpegLoading(false);
  };

  const handleFileSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setClipUrl('');
    setError('');
    loadFFmpeg();
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('video/')) handleFileSelect(file);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const exportClip = async () => {
    if (!ffmpeg.isLoaded() || !videoFile) return;
    setProcessing(true);
    setProgress(0);
    setClipUrl('');
    setError('');
    try {
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
      await ffmpeg.run(
        '-ss', String(clipStart),
        '-i', 'input.mp4',
        '-t', String(clipEnd - clipStart),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        'output.mp4'
      );
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      setClipUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError('Erreur découpage : ' + String(e));
    }
    setProcessing(false);
  };

  const downloadClip = () => {
    if (!clipUrl) return;
    const a = document.createElement('a');
    a.href = clipUrl;
    a.download = `clip_${pendingClip?.label || 'sequence'}_${formatTime(clipStart)}.mp4`;
    a.click();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--orion-surface)', borderRadius:14, width:'100%', maxWidth:720, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1.5px solid var(--orion-line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Film size={17} style={{ color:'var(--orion-accent)' }} />
            <span style={{ fontSize:15, fontWeight:800, color:'var(--orion-text)' }}>Export Clip Vidéo</span>
          </div>
          <button onClick={onClose} style={{ padding:6, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', cursor:'pointer', color:'var(--orion-text-mute)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Action sélectionnée */}
          {pendingClip && (
            <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(61,128,224,0.08)', border:'1.5px solid rgba(61,128,224,0.25)', display:'flex', alignItems:'center', gap:10 }}>
              <Scissors size={13} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:700, color:'var(--orion-text)' }}>{pendingClip.label}</span>
              <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>· {formatTime(pendingClip.timestamp)} · Équipe {pendingClip.team}</span>
            </div>
          )}

          {/* Zone chargement si pas de vidéo */}
          {!videoFile ? (
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
              style={{ border:'2px dashed var(--orion-line-strong)', borderRadius:10, padding:'32px 24px', textAlign:'center', cursor:'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orion-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--orion-line-strong)')}>
              <Upload size={28} style={{ color:'var(--orion-text-faint)', marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginBottom:5 }}>Charger la vidéo du match</div>
              <div style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Glisser-déposer ou cliquer · MP4, MOV, AVI</div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>
          ) : (
            <>
              {/* Lecteur */}
              <div style={{ borderRadius:10, overflow:'hidden', background:'#000' }}>
                <video ref={videoRef} src={videoUrl} style={{ width:'100%', maxHeight:260, display:'block' }}
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              </div>

              {/* Barre de progression vidéo */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={togglePlay} style={{ width:32, height:32, borderRadius:'50%', background:'var(--orion-accent)', border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div style={{ flex:1, position:'relative', height:6, background:'var(--orion-surface-3)', borderRadius:3, cursor:'pointer' }}
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (videoRef.current) videoRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration; }}>
                  {duration > 0 && <>
                    <div style={{ position:'absolute', left:`${(clipStart/duration)*100}%`, width:`${((clipEnd-clipStart)/duration)*100}%`, height:'100%', background:'rgba(61,128,224,0.3)', borderRadius:3 }} />
                    <div style={{ position:'absolute', left:`${(currentTime/duration)*100}%`, top:-3, width:12, height:12, borderRadius:'50%', background:'var(--orion-accent)', transform:'translateX(-50%)', pointerEvents:'none' }} />
                  </>}
                </div>
                <span style={{ fontSize:11, fontFamily:'var(--orion-font-mono)', color:'var(--orion-text-mute)', flexShrink:0 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              {/* Sync offset */}
              <div style={{ padding:'10px 14px', background:'var(--orion-surface-2)', borderRadius:8, border:'1px solid var(--orion-line)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <Clock size={13} style={{ color:'var(--orion-text-mute)' }} />
                <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Coup d'envoi à</span>
                <input type="number" value={videoOffset} onChange={e => setVideoOffset(Number(e.target.value))} min={0} step={1}
                  style={{ width:64, padding:'4px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none' }} />
                <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>s dans la vidéo</span>
                <button onClick={() => setVideoOffset(Math.round(currentTime))}
                  style={{ padding:'4px 10px', borderRadius:6, border:'1.5px solid var(--orion-accent)', background:'rgba(61,128,224,0.08)', color:'var(--orion-accent)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  ← Position actuelle
                </button>
              </div>

              {/* Paramètres clip */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                {([
                  { label:'Début (s)', val:clipStart, set:setClipStart },
                  { label:'Fin (s)', val:clipEnd, set:setClipEnd },
                  { label:'Avant (s)', val:beforeSecs, set:(v: number) => { setBeforeSecs(v); if (pendingClip) setClipStart(Math.max(0, pendingClip.timestamp + videoOffset - v)); } },
                  { label:'Après (s)', val:afterSecs, set:(v: number) => { setAfterSecs(v); if (pendingClip) setClipEnd(Math.min(duration, pendingClip.timestamp + videoOffset + v)); } },
                ] as const).map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>{f.label}</div>
                    <input type="number" value={f.val} onChange={e => (f.set as any)(Number(e.target.value))} step={0.5} min={0}
                      style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={() => videoRef.current && (videoRef.current.currentTime = clipStart)}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text)', cursor:'pointer' }}>
                  <Play size={13} /> Prévisualiser
                </button>

                {!ffmpegReady ? (
                  <button onClick={loadFFmpeg} disabled={ffmpegLoading}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: ffmpegLoading ? 'wait' : 'pointer', opacity: ffmpegLoading ? 0.8 : 1 }}>
                    {ffmpegLoading ? <><Loader size={13} /> Chargement...</> : 'Préparer l\'export'}
                  </button>
                ) : (
                  <button onClick={exportClip} disabled={processing}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.8 : 1 }}>
                    {processing ? <><Loader size={13} /> {progress}%</> : <><Scissors size={13} /> Découper</>}
                  </button>
                )}

                {clipUrl && (
                  <button onClick={downloadClip}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-green)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                    <Download size={13} /> Télécharger MP4
                  </button>
                )}
              </div>

              {processing && (
                <div>
                  <div style={{ height:5, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>Encodage {progress}%…</div>
                </div>
              )}

              {clipUrl && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--orion-text)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                    <Check size={13} style={{ color:'var(--orion-green)' }} /> Clip prêt ({formatTime(clipEnd - clipStart)})
                  </div>
                  <video src={clipUrl} controls style={{ width:'100%', borderRadius:8, background:'#000' }} />
                </div>
              )}

              {error && (
                <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(224,59,46,0.08)', border:'1px solid rgba(224,59,46,0.3)', fontSize:13, color:'#E03B2E' }}>
                  {error}
                </div>
              )}

              <button onClick={() => { setVideoFile(null); setVideoUrl(''); setClipUrl(''); }}
                style={{ fontSize:12, color:'var(--orion-text-mute)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                Changer de vidéo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
