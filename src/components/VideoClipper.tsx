import { useRef, useState, useEffect } from 'react';
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

export default function VideoClipper({ onClose, pendingClip, initialVideoFile, initialVideoOffset = 0 }: Props) {
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

  useEffect(() => {
    if (pendingClip && videoFile && duration > 0) {
      const videoTs = pendingClip.timestamp + videoOffset;
      setClipStart(parseFloat(Math.max(0, videoTs - beforeSecs).toFixed(1)));
      setClipEnd(parseFloat(Math.min(duration, videoTs + afterSecs).toFixed(1)));
      if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoTs - beforeSecs);
    }
  }, [pendingClip, duration, videoOffset]);

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setClipUrl('');
    setError('');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // Découpage via MediaRecorder — lecture accélérée de clipStart à clipEnd puis enregistrement
  const exportClip = async () => {
    if (!videoRef.current || !videoFile) return;
    setProcessing(true);
    setProgress(0);
    setClipUrl('');
    setError('');

    try {
      const video = videoRef.current;
      const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();

      if (!stream) {
        setError('Votre navigateur ne supporte pas captureStream. Utilisez Chrome.');
        setProcessing(false);
        return;
      }

      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      const duration_clip = clipEnd - clipStart;

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error('Erreur enregistrement'));

        video.currentTime = clipStart;
        video.muted = true;
        video.playbackRate = 1;

        video.onseeked = () => {
          recorder.start(100);
          video.play();

          const interval = setInterval(() => {
            const elapsed = video.currentTime - clipStart;
            setProgress(Math.min(99, Math.round((elapsed / duration_clip) * 100)));
            if (video.currentTime >= clipEnd) {
              clearInterval(interval);
              video.pause();
              recorder.stop();
            }
          }, 100);
        };
      });

      const blob = new Blob(chunks, { type: mimeType });
      setClipUrl(URL.createObjectURL(blob));
      setProgress(100);
      video.muted = false;
    } catch (e) {
      setError('Erreur : ' + String(e));
    }
    setProcessing(false);
  };

  const downloadClip = () => {
    if (!clipUrl) return;
    const a = document.createElement('a');
    a.href = clipUrl;
    a.download = `clip_${(pendingClip?.label || 'sequence').replace(/\s/g, '_')}_${formatTime(clipStart)}.webm`;
    a.click();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--orion-surface)', borderRadius:14, width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

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

          {pendingClip && (
            <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(61,128,224,0.08)', border:'1.5px solid rgba(61,128,224,0.25)', display:'flex', alignItems:'center', gap:10 }}>
              <Scissors size={13} style={{ color:'var(--orion-accent)' }} />
              <span style={{ fontSize:13, fontWeight:700, color:'var(--orion-text)' }}>{pendingClip.label}</span>
              <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>· {formatTime(pendingClip.timestamp)} · Équipe {pendingClip.team}</span>
            </div>
          )}

          {!videoFile ? (
            <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) handleFileSelect(f); }}
              onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
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

              {/* Sync */}
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

              {/* Paramètres */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Début (s)', val:clipStart, onChange:(v:number) => setClipStart(v) },
                  { label:'Fin (s)', val:clipEnd, onChange:(v:number) => setClipEnd(v) },
                  { label:'Avant (s)', val:beforeSecs, onChange:(v:number) => { setBeforeSecs(v); if (pendingClip) setClipStart(Math.max(0, pendingClip.timestamp + videoOffset - v)); } },
                  { label:'Après (s)', val:afterSecs, onChange:(v:number) => { setAfterSecs(v); if (pendingClip) setClipEnd(Math.min(duration, pendingClip.timestamp + videoOffset + v)); } },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>{f.label}</div>
                    <input type="number" value={f.val} onChange={e => f.onChange(Number(e.target.value))} step={0.5} min={0}
                      style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                  </div>
                ))}
              </div>

              {/* Boutons */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = clipStart; }}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text)', cursor:'pointer' }}>
                  <Play size={13} /> Prévisualiser depuis le début
                </button>

                <button onClick={exportClip} disabled={processing || clipEnd <= clipStart}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: processing ? 'wait' : 'pointer', opacity: (processing || clipEnd <= clipStart) ? 0.7 : 1 }}>
                  {processing ? <><Loader size={13} /> Enregistrement {progress}%...</> : <><Scissors size={13} /> Exporter le clip</>}
                </button>

                {clipUrl && (
                  <button onClick={downloadClip}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--orion-green)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                    <Download size={13} /> Télécharger
                  </button>
                )}
              </div>

              {processing && (
                <div>
                  <div style={{ height:5, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>
                    La vidéo est en cours de lecture pour capturer le clip ({progress}%)…
                  </div>
                </div>
              )}

              {clipUrl && !processing && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--orion-text)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                    <Check size={13} style={{ color:'var(--orion-green)' }} /> Clip prêt · {formatTime(clipEnd - clipStart)} · Format WebM
                  </div>
                  <video src={clipUrl} controls style={{ width:'100%', borderRadius:8, background:'#000' }} />
                </div>
              )}

              {error && (
                <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(224,59,46,0.08)', border:'1px solid rgba(224,59,46,0.3)', fontSize:13, color:'#E03B2E' }}>
                  {error}
                </div>
              )}

              <div style={{ fontSize:11, color:'var(--orion-text-faint)', padding:'8px 12px', borderRadius:6, background:'var(--orion-surface-2)', border:'1px solid var(--orion-line)' }}>
                💡 Le clip est généré en WebM (lecture réelle de la vidéo). Pour un MP4, convertis le fichier après téléchargement avec VLC ou Handbrake.
              </div>

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
