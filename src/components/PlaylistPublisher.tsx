import { useRef, useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader, Check, Share2, UploadCloud, Copy, ExternalLink, ListVideo } from 'lucide-react';

interface PlaylistItem {
  id: string;
  timestamp: number;      // seconde dans la vidéo
  matchSeconds?: number;  // seconde de match (affichage)
  label: string;
  team: string;
}

interface Props {
  playlist: PlaylistItem[];
  videoFile: File | null;
  videoOffset: number;
  match: any;
  onClose: () => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export default function PlaylistPublisher({ playlist, videoFile, videoOffset, match, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [name, setName] = useState(`${match.team_a_name} vs ${match.team_b_name}`);

  const [running, setRunning] = useState(false);
  const [step, setStep] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // URL de la vidéo créée UNE SEULE FOIS (sinon la vidéo se recharge en boucle à chaque render)
  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : ''), [videoFile]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  // ── Capture d'une séquence en WebM depuis le lecteur ──────────────────────
  const captureSegment = (start: number, end: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) { reject(new Error('Lecteur indisponible')); return; }
      const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
      if (!stream) { reject(new Error('Navigateur non supporté (utilisez Chrome)')); return; }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const dur = Math.max(0.1, end - start);
      let iv: any = null;
      let safety: any = null;
      let done = false;

      const finish = (ok: boolean, err?: string) => {
        if (done) return;
        done = true;
        if (iv) clearInterval(iv);
        if (safety) clearTimeout(safety);
        try { video.pause(); } catch {}
        video.muted = false;
        if (recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
        if (!ok) reject(new Error(err || 'Capture échouée'));
      };

      recorder.onstop = () => {
        if (!done) { done = true; if (iv) clearInterval(iv); if (safety) clearTimeout(safety); }
        video.muted = false;
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
      recorder.onerror = () => finish(false, 'Erreur de capture (MediaRecorder)');

      video.muted = true;
      video.currentTime = start;
      video.onseeked = () => {
        video.onseeked = null;
        recorder.start(100);
        const playPromise = video.play();
        // Si le navigateur refuse de lire (onglet en arrière-plan, autoplay bloqué)
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => finish(false, 'Lecture bloquée par le navigateur — gardez cet onglet au premier plan'));
        }
        iv = setInterval(() => {
          setProgress(Math.min(99, Math.round(((video.currentTime - start) / dur) * 100)));
          if (video.currentTime >= end) { video.pause(); recorder.stop(); }
        }, 100);
        // Garde-fou : la capture ne doit jamais durer plus que (durée + 8s)
        safety = setTimeout(() => {
          if (video.currentTime > start + 0.3) {
            // On a capturé quelque chose, on arrête proprement
            video.pause(); recorder.stop();
          } else {
            finish(false, 'La vidéo n\'a pas démarré (onglet en arrière-plan ?)');
          }
        }, (dur + 8) * 1000);
      };
    });

  // ── Conversion MP4 côté serveur (fallback WebM si indisponible) ───────────
  const toMp4 = async (webm: Blob): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> => {
    try {
      const fd = new FormData();
      fd.append('video', webm, 'clip.webm');
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch('/api/clip-video', { method: 'POST', body: fd, signal: ctrl.signal });
      clearTimeout(tid);
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('video')) {
        const b = await r.blob();
        if (b.size > 1000) return { blob: b, ext: 'mp4' };
      }
    } catch { /* fallback */ }
    return { blob: webm, ext: 'webm' };
  };

  // ── Pipeline complet ──────────────────────────────────────────────────────
  const publish = async () => {
    if (!videoFile || playlist.length === 0) return;
    setRunning(true); setError(''); setShareUrl('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Vous devez être connecté.'); setRunning(false); return; }

      const items: any[] = [];

      for (let i = 0; i < playlist.length; i++) {
        setCurrentIdx(i);
        const item = playlist[i];
        const vTs = item.timestamp;
        const s = Math.max(0, vTs - before);
        const e = Math.min(videoRef.current?.duration || vTs + after, vTs + after);

        // 1. Capture
        setStep('capture'); setProgress(0);
        const webm = await captureSegment(s, e);

        // 2. Conversion MP4
        setStep('convert');
        const { blob, ext } = await toMp4(webm);

        // 3. Upload Supabase Storage
        setStep('upload');
        const path = `${user.id}/${match.id}/${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('clips')
          .upload(path, blob, { contentType: ext === 'mp4' ? 'video/mp4' : 'video/webm', upsert: true });
        if (upErr) throw new Error('Upload échoué : ' + upErr.message);

        const { data: pub } = supabase.storage.from('clips').getPublicUrl(path);

        items.push({
          label: item.label,
          team: item.team,
          minute: fmt(item.matchSeconds ?? (item.timestamp - videoOffset)),
          duration: Math.round(e - s),
          url: pub.publicUrl,
        });
      }

      // 4. Créer la playlist partageable
      setStep('finalize');
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const payload = {
        items,
        team_a: match.team_a_name,
        team_b: match.team_b_name,
        score_a: match.team_a_score ?? null,
        score_b: match.team_b_score ?? null,
        match_date: match.match_date || null,
      };

      const { error: insErr } = await supabase.from('playlists').insert({
        user_id: user.id,
        match_id: match.id,
        name: name.trim() || 'Playlist',
        items_json: JSON.stringify(payload),
        share_token: token,
      });
      if (insErr) throw new Error('Création playlist : ' + insErr.message);

      const url = `${window.location.origin}/playlist/${token}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setStep('done');
    } catch (e: any) {
      setError(e?.message || String(e));
    }
    setRunning(false);
  };

  const stepLabel = () => {
    if (step === 'capture')  return `Capture de la séquence ${currentIdx + 1}/${playlist.length} (${progress}%)`;
    if (step === 'convert')  return `Conversion MP4 ${currentIdx + 1}/${playlist.length}…`;
    if (step === 'upload')   return `Mise en ligne ${currentIdx + 1}/${playlist.length}…`;
    if (step === 'finalize') return 'Création du lien de partage…';
    return '';
  };

  const globalPct = playlist.length ? Math.round(((currentIdx + (step === 'upload' ? 0.9 : step === 'convert' ? 0.6 : progress / 100 * 0.5)) / playlist.length) * 100) : 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={running ? undefined : onClose}>
      <div style={{ background:'var(--orion-surface)', borderRadius:14, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1.5px solid var(--orion-line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <ListVideo size={17} style={{ color:'var(--orion-accent)' }} />
            <span style={{ fontSize:15, fontWeight:800, color:'var(--orion-text)' }}>Publier la playlist · {playlist.length} séquences</span>
          </div>
          {!running && (
            <button onClick={onClose} style={{ padding:6, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', cursor:'pointer', color:'var(--orion-text-mute)' }}>
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Lecteur nécessaire pour la capture (URL stable, pas recréée à chaque render) */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedData={() => setReady(true)}
              style={{ width:'100%', maxHeight: running ? 140 : 180, borderRadius:8, background:'#000' }}
              muted={running}
              playsInline
            />
          )}

          {!shareUrl ? (
            <>
              {/* Nom de la playlist */}
              <div>
                <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Nom de la playlist</div>
                <input value={name} onChange={e => setName(e.target.value)} disabled={running}
                  style={{ width:'100%', padding:'8px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>

              {/* Réglages avant/après */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes avant l'action</div>
                  <input type="number" value={before} min={0} step={1} disabled={running} onChange={e => setBefore(Number(e.target.value))}
                    style={{ width:'100%', padding:'7px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes après l'action</div>
                  <input type="number" value={after} min={0} step={1} disabled={running} onChange={e => setAfter(Number(e.target.value))}
                    style={{ width:'100%', padding:'7px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>

              {/* Liste des séquences */}
              <div style={{ maxHeight:120, overflowY:'auto', border:'1.5px solid var(--orion-line)', borderRadius:8, padding:8, display:'flex', flexDirection:'column', gap:4 }}>
                {playlist.map((p, i) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', background: running && currentIdx === i ? 'rgba(61,128,224,0.1)' : 'var(--orion-surface-2)', borderRadius:5, fontSize:12 }}>
                    <span style={{ color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', minWidth:20 }}>{i+1}.</span>
                    <span style={{ color:'var(--orion-text)', fontWeight:600, flex:1 }}>{p.label}</span>
                    <span style={{ color:'var(--orion-text-mute)' }}>{fmt(p.matchSeconds ?? p.timestamp)}</span>
                    {running && currentIdx > i && <Check size={12} style={{ color:'var(--orion-green)' }} />}
                    {running && currentIdx === i && <Loader size={12} style={{ color:'var(--orion-accent)' }} />}
                  </div>
                ))}
              </div>

              {/* Bouton publier */}
              <button onClick={publish} disabled={running || !videoFile || !ready}
                style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 18px', background:'var(--orion-accent)', border:'none', borderRadius:9, fontSize:14, fontWeight:700, color:'#fff', cursor: (running || !ready) ? 'wait' : 'pointer', opacity: (running || !videoFile || !ready) ? 0.7 : 1 }}>
                {running ? <><Loader size={15} /> Publication…</> : !ready ? <><Loader size={15} /> Chargement vidéo…</> : <><UploadCloud size={15} /> Publier et obtenir le lien</>}
              </button>

              {/* Progression */}
              {running && (
                <div>
                  <div style={{ height:6, background:'var(--orion-surface-3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${globalPct}%`, background:'var(--orion-accent)', transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:5 }}>{stepLabel()}</div>
                  <div style={{ fontSize:10, color:'var(--orion-text-faint)', marginTop:3 }}>
                    La vidéo se lit en arrière-plan pour capturer chaque séquence — ne fermez pas cette fenêtre.
                  </div>
                </div>
              )}

              {!videoFile && (
                <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.3)', fontSize:12.5, color:'#b45309' }}>
                  ⚠ Chargez d'abord la vidéo du match (fichier local) pour pouvoir publier une playlist.
                </div>
              )}
            </>
          ) : (
            /* ── Résultat ── */
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'var(--orion-green)' }}>
                <Check size={17} /> Playlist publiée !
              </div>
              <div style={{ padding:'12px 14px', background:'rgba(61,128,224,0.06)', border:'1.5px solid rgba(61,128,224,0.3)', borderRadius:9 }}>
                <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:6 }}>Lien à partager avec vos joueurs :</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--orion-accent)', fontWeight:600, wordBreak:'break-all', flex:1 }}>{shareUrl}</a>
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'none', background: copied ? 'var(--orion-green)' : 'var(--orion-accent)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                    {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                  </button>
                </div>
              </div>
              <a href={shareUrl} target="_blank" rel="noreferrer"
                style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', borderRadius:8, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', color:'var(--orion-text)', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                <ExternalLink size={14} /> Ouvrir la playlist
              </a>
              <button onClick={onClose}
                style={{ padding:'9px', borderRadius:8, border:'none', background:'var(--orion-accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Terminer
              </button>
            </div>
          )}

          {error && (
            <div style={{ padding:'9px 13px', borderRadius:8, background:'rgba(224,59,46,0.08)', border:'1px solid rgba(224,59,46,0.3)', fontSize:12.5, color:'#E03B2E' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
