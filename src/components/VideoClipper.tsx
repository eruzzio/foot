import { useRef, useState, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Download, X, Play, Pause, Film, Scissors, Clock, Loader } from 'lucide-react';

interface ClipRequest {
  timestamp: number; // secondes depuis le début du match
  label: string;
  team: string;
}

interface Props {
  matchDuration: number; // durée totale du match en secondes
  onClose: () => void;
  pendingClip?: ClipRequest | null; // action demandée depuis la timeline
}

export default function VideoClipper({ matchDuration, onClose, pendingClip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Paramètres du clip
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(10);
  const [beforeSecs, setBeforeSecs] = useState(5);
  const [afterSecs, setAfterSecs] = useState(5);

  // État ffmpeg
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clipUrl, setClipUrl] = useState('');
  const [error, setError] = useState('');

  // Offset vidéo/match : timestamp vidéo du coup d'envoi
  const [videoOffset, setVideoOffset] = useState(0);

  // Appliquer le clip demandé depuis la timeline
  useEffect(() => {
    if (pendingClip && videoFile) {
      const videoTimestamp = pendingClip.timestamp + videoOffset;
      const start = Math.max(0, videoTimestamp - beforeSecs);
      const end = Math.min(duration || 999999, videoTimestamp + afterSecs);
      setClipStart(start);
      setClipEnd(end);
      if (videoRef.current) {
        videoRef.current.currentTime = start;
      }
    }
  }, [pendingClip, videoFile, videoOffset, beforeSecs, afterSecs, duration]);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current || ffmpegLoading) return;
    setFfmpegLoading(true);
    setError('');
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)));
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
      setFfmpegLoaded(true);
    } catch (e) {
      setError('Impossible de charger FFmpeg. Vérifiez votre connexion.');
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
    if (file && file.type.startsWith('video/')) handleFileSelect(file);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const exportClip = async () => {
    if (!ffmpegRef.current || !videoFile) return;
    setProcessing(true);
    setProgress(0);
    setClipUrl('');
    setError('');

    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      const duration_clip = clipEnd - clipStart;
      await ffmpeg.exec([
        '-ss', String(clipStart),
        '-i', 'input.mp4',
        '-t', String(duration_clip),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        'output.mp4',
      ]);
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setClipUrl(url);
    } catch (e) {
      setError('Erreur lors du découpage. Vérifiez que la vidéo est un MP4 valide.');
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
      <div style={{ background:'var(--orion-surface)', borderRadius:14, width:'100%', maxWidth:760, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1.5px solid var(--orion-line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Film size={18} style={{ color:'var(--orion-accent)' }} />
            <span style={{ fontSize:16, fontWeight:800, color:'var(--orion-text)' }}>Export Clip Vidéo</span>
          </div>
          <button onClick={onClose} style={{ padding:6, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', cursor:'pointer', color:'var(--orion-text-mute)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Action sélectionnée */}
          {pendingClip && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(61,128,224,0.08)', border:'1.5px solid rgba(61,128,224,0.25)', display:'flex', alignItems:'center', gap:10 }}>
              <Scissors size={14} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
              <div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--orion-text)' }}>{pendingClip.label}</span>
                <span style={{ fontSize:12, color:'var(--orion-text-mute)', marginLeft:8 }}>à {formatTime(pendingClip.timestamp)} · Équipe {pendingClip.team}</span>
              </div>
            </div>
          )}

          {/* Zone de chargement vidéo */}
          {!videoFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{ border:'2px dashed var(--orion-line-strong)', borderRadius:10, padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orion-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--orion-line-strong)')}
            >
              <Upload size={32} style={{ color:'var(--orion-text-faint)', marginBottom:12 }} />
              <div style={{ fontSize:15, fontWeight:700, color:'var(--orion-text)', marginBottom:6 }}>Charger la vidéo du match</div>
              <div style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Glisser-déposer ou cliquer · MP4, MOV, AVI acceptés</div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>
          ) : (
            <>
              {/* Lecteur vidéo */}
              <div style={{ borderRadius:10, overflow:'hidden', background:'#000', position:'relative' }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  style={{ width:'100%', maxHeight:280, display:'block' }}
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>

              {/* Contrôles */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={togglePlay} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:'50%', background:'var(--orion-accent)', border:'none', cursor:'pointer', color:'#fff', flexShrink:0 }}>
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div style={{ flex:1, position:'relative', height:6, background:'var(--orion-surface-3)', borderRadius:3, cursor:'pointer' }}
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * duration); }}>
                  {/* Région clip */}
                  <div style={{ position:'absolute', left:`${(clipStart/duration)*100}%`, width:`${((clipEnd-clipStart)/duration)*100}%`, height:'100%', background:'rgba(61,128,224,0.35)', borderRadius:3 }} />
                  {/* Curseur */}
                  <div style={{ position:'absolute', left:`${(currentTime/duration)*100}%`, top:-3, width:12, height:12, borderRadius:'50%', background:'var(--orion-accent)', transform:'translateX(-50%)' }} />
                </div>
                <span style={{ fontSize:12, fontFamily:'var(--orion-font-mono)', color:'var(--orion-text-mute)', flexShrink:0 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              {/* Offset vidéo/match */}
              <div style={{ padding:'12px 16px', background:'var(--orion-surface-2)', borderRadius:8, border:'1px solid var(--orion-line)' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--orion-text-dim)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Clock size={13} />
                  Synchronisation vidéo/match
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, color:'var(--orion-text-mute)', whiteSpace:'nowrap' }}>Coup d'envoi à</span>
                  <input type="number" value={videoOffset} onChange={e => setVideoOffset(Number(e.target.value))} min={0} step={1}
                    style={{ width:70, padding:'5px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none' }} />
                  <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>s dans la vidéo</span>
                  <button onClick={() => setVideoOffset(Math.round(currentTime))}
                    style={{ padding:'5px 12px', borderRadius:6, border:'1.5px solid var(--orion-accent)', background:'rgba(61,128,224,0.08)', color:'var(--orion-accent)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    ← Position actuelle
                  </button>
                </div>
              </div>

              {/* Paramètres du clip */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Début (s)', val:clipStart, set:setClipStart, min:0, max:clipEnd-1 },
                  { label:'Fin (s)', val:clipEnd, set:setClipEnd, min:clipStart+1, max:duration },
                  { label:'Avant (s)', val:beforeSecs, set:setBeforeSecs, min:0, max:30 },
                  { label:'Après (s)', val:afterSecs, set:setAfterSecs, min:0, max:30 },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:5, fontWeight:600 }}>{f.label}</div>
                    <input type="number" value={Math.round(f.val * 10) / 10} onChange={e => f.set(Number(e.target.value))} min={f.min} max={f.max} step={0.5}
                      style={{ width:'100%', padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>

              {/* Boutons preview + export */}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => seekTo(clipStart)}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text)', cursor:'pointer' }}>
                  <Play size={13} /> Prévisualiser
                </button>

                {!ffmpegLoaded ? (
                  <button onClick={loadFFmpeg} disabled={ffmpegLoading}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: ffmpegLoading ? 'not-allowed' : 'pointer', opacity: ffmpegLoading ? 0.7 : 1 }}>
                    {ffmpegLoading ? <><Loader size={14} /> Chargement FFmpeg...</> : 'Préparer l\'export'}
                  </button>
                ) : (
                  <button onClick={exportClip} disabled={processing}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}>
                    {processing ? <><Loader size={14} /> Export {progress}%...</> : <><Scissors size={14} /> Découper le clip</>}
                  </button>
                )}

                {clipUrl && (
                  <button onClick={downloadClip}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--orion-green)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                    <Download size={14} /> Télécharger MP4
                  </button>
                )}
              </div>

              {/* Barre de progression */}
              {processing && (
                <div>
                  <div style={{ height:6, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>Encodage en cours… {progress}%</div>
                </div>
              )}

              {/* Prévisualisation du clip */}
              {clipUrl && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--orion-text)', marginBottom:8 }}>Aperçu du clip ({formatTime(clipEnd - clipStart)})</div>
                  <video src={clipUrl} controls style={{ width:'100%', borderRadius:8, background:'#000' }} />
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(224,59,46,0.08)', border:'1px solid rgba(224,59,46,0.3)', fontSize:13, color:'#E03B2E' }}>
                  {error}
                </div>
              )}

              {/* Changer de fichier */}
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
