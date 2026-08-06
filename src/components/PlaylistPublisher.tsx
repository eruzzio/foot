import { useRef, useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../utils/r2Upload';
import { X, Loader, Check, Share2, UploadCloud, Copy, ExternalLink, ListVideo, ChevronUp, ChevronDown } from 'lucide-react';

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
  initialClipDurations?: Record<string, { before: number; after: number }>;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export default function PlaylistPublisher({ playlist, videoFile, videoOffset, match, onClose, initialClipDurations }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  // Durées personnalisées par séquence (id -> {before, after}) ; repli sur les valeurs globales.
  // Initialisé avec les durées déjà ajustées dans le lecteur (mode codage vidéo).
  const [perClip, setPerClip] = useState<Record<string, { before: number; after: number }>>(initialClipDurations ?? {});
  const clipBefore = (id: string) => perClip[id]?.before ?? before;
  const clipAfter = (id: string) => perClip[id]?.after ?? after;
  const setClipDuration = (id: string, field: 'before' | 'after', val: number) => {
    setPerClip(prev => ({
      ...prev,
      [id]: {
        before: field === 'before' ? val : (prev[id]?.before ?? before),
        after: field === 'after' ? val : (prev[id]?.after ?? after),
      },
    }));
  };
  const [name, setName] = useState(`${match.team_a_name} vs ${match.team_b_name}`);
  const [sortBy, setSortBy] = useState<'manual' | 'name' | 'time' | 'team'>('manual');

  // Ordre courant des séquences (modifiable : tri auto OU flèches manuelles)
  const [orderedList, setOrderedList] = useState<PlaylistItem[]>(playlist);

  // Resynchronise si la playlist d'entrée change
  useEffect(() => { setOrderedList(playlist); setSortBy('manual'); }, [playlist]);

  // Applique un tri automatique et réordonne la liste
  const applySort = (criteria: 'manual' | 'name' | 'time' | 'team') => {
    setSortBy(criteria);
    if (criteria === 'manual') { setOrderedList(playlist); return; }
    setOrderedList(prev => {
      const arr = [...prev];
      if (criteria === 'name') {
        arr.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
      } else if (criteria === 'time') {
        arr.sort((a, b) => (a.matchSeconds ?? a.timestamp) - (b.matchSeconds ?? b.timestamp));
      } else if (criteria === 'team') {
        arr.sort((a, b) =>
          (a.team || '').localeCompare(b.team || '', 'fr', { sensitivity: 'base' })
          || (a.matchSeconds ?? a.timestamp) - (b.matchSeconds ?? b.timestamp)
        );
      }
      return arr;
    });
  };

  // Déplace une séquence vers le haut/bas et bascule en mode manuel
  const moveItem = (index: number, dir: -1 | 1) => {
    setOrderedList(prev => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const arr = [...prev];
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
    setSortBy('manual');
  };

  const sortedPlaylist = orderedList;

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

  // ── Pipeline : upload vidéo sur Supabase -> découpe serveur par clip ────────
  const publish = async () => {
    if (!videoFile || playlist.length === 0) return;
    setRunning(true); setError(''); setShareUrl('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Vous devez être connecté.'); setRunning(false); return; }

      const duration = videoRef.current?.duration || 0;

      // 1. Upload de la vidéo source sur Cloudflare R2 (pas de plafond 50Mo, egress gratuit)
      setStep('upload-video'); setProgress(0);
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const videoPath = `${user.id}/${match.id}/source_${Date.now()}.${ext}`;
      await uploadToR2(videoPath, videoFile, p => setProgress(p));

      // URL signée temporaire (2h) pour que le serveur puisse lire la vidéo depuis R2
      const { data: { session } } = await supabase.auth.getSession();
      const signResp = await fetch('/api/r2-get-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ key: videoPath }),
      });
      const signed = await signResp.json();
      if (!signResp.ok || !signed?.url) throw new Error('URL signée : ' + (signed?.error || 'échec'));
      const videoSignedUrl = signed.url;

      // 2. Découper chaque séquence CÔTÉ SERVEUR (seek FFmpeg), par lots parallèles
      setStep('cut');
      const CONCURRENCY = 3; // nb de découpes simultanées (compromis vitesse / charge Vercel)
      const items: any[] = new Array(sortedPlaylist.length);
      let done = 0;

      const processClip = async (i: number) => {
        const item = sortedPlaylist[i];
        const vTs = item.timestamp;
        const bef = clipBefore(item.id);
        const aft = clipAfter(item.id);
        const s = Math.max(0, vTs - bef);
        const e = Math.min(duration || vTs + aft, vTs + aft);

        const resp = await fetch('/api/clip-from-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ videoUrl: videoSignedUrl, start: s, duration: e - s }),
        });
        if (!resp.ok) {
          const msg = await resp.json().catch(() => ({}));
          throw new Error(`Découpe séquence ${i + 1} : ${msg.error || resp.status}`);
        }
        const clipBlob = await resp.blob();

        // Upload du clip généré dans le bucket public
        const clipPath = `${user.id}/${match.id}/${Date.now()}_${i}.mp4`;
        const { error: upErr } = await supabase.storage
          .from('clips')
          .upload(clipPath, clipBlob, { contentType: 'video/mp4', upsert: true });
        if (upErr) throw new Error('Upload clip : ' + upErr.message);
        const { data: pub } = supabase.storage.from('clips').getPublicUrl(clipPath);

        // On range le résultat à sa position d'origine pour préserver l'ordre de la playlist
        items[i] = {
          label: item.label,
          team: item.team,
          minute: fmt(item.matchSeconds ?? (item.timestamp - videoOffset)),
          duration: Math.round(e - s),
          url: pub.publicUrl,
        };
        done++;
        setCurrentIdx(done - 1);
        setProgress(Math.round((done / sortedPlaylist.length) * 100));
      };

      // File d'attente consommée par CONCURRENCY workers en parallèle
      let nextIndex = 0;
      const worker = async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= sortedPlaylist.length) return;
          await processClip(i);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sortedPlaylist.length) }, worker));

      // 3. Supprimer la vidéo source sur R2 (on n'en a plus besoin, économise le stockage)
      setStep('cleanup');
      await fetch('/api/r2-get-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ key: videoPath, action: 'delete' }),
      }).catch(() => {});

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
    if (step === 'upload-video') return `Envoi de la vidéo sur le serveur… ${progress}%`;
    if (step === 'cut')          return `Découpe de la séquence ${currentIdx + 1}/${playlist.length}…`;
    if (step === 'cleanup')      return 'Nettoyage…';
    if (step === 'finalize')     return 'Création du lien de partage…';
    return '';
  };

  const globalPct = playlist.length
    ? Math.round(((currentIdx + (step === 'upload' ? 0.9 : progress / 100)) / playlist.length) * 100)
    : 0;

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
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes avant (défaut)</div>
                  <input type="number" value={before} min={0} step={1} disabled={running} onChange={e => setBefore(Number(e.target.value))}
                    style={{ width:'100%', padding:'7px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginBottom:4, fontWeight:600 }}>Secondes après (défaut)</div>
                  <input type="number" value={after} min={0} step={1} disabled={running} onChange={e => setAfter(Number(e.target.value))}
                    style={{ width:'100%', padding:'7px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, color:'var(--orion-text)', fontSize:13, textAlign:'center', outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>

              {/* Sélecteur de tri */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <span style={{ fontSize:11, color:'var(--orion-text-mute)', fontWeight:600 }}>Trier par</span>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {([
                    ['manual', 'Ordre manuel'],
                    ['time', 'Temps de match'],
                    ['name', 'Nom'],
                    ['team', 'Équipe'],
                  ] as const).map(([val, lbl]) => (
                    <button key={val} type="button" disabled={running} onClick={() => applySort(val)}
                      style={{
                        padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor: running ? 'default' : 'pointer',
                        background: sortBy === val ? 'var(--orion-accent)' : 'var(--orion-surface-2)',
                        color: sortBy === val ? '#fff' : 'var(--orion-text-mute)',
                        border: '1px solid ' + (sortBy === val ? 'var(--orion-accent)' : 'var(--orion-line)'),
                        opacity: running ? 0.6 : 1,
                      }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste des séquences */}
              <div style={{ maxHeight:180, overflowY:'auto', border:'1.5px solid var(--orion-line)', borderRadius:8, padding:8, display:'flex', flexDirection:'column', gap:4 }}>
                {sortedPlaylist.map((p, i) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', background: running && currentIdx === i ? 'rgba(61,128,224,0.1)' : 'var(--orion-surface-2)', borderRadius:5, fontSize:12 }}>
                    <span style={{ color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', minWidth:20 }}>{i+1}.</span>
                    <span style={{ color:'var(--orion-text)', fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.label}</span>
                    <span style={{ color:'var(--orion-text-mute)' }}>{fmt(p.matchSeconds ?? p.timestamp)}</span>
                    {/* Durée par séquence */}
                    {!running && (
                      <span style={{ display:'flex', alignItems:'center', gap:2, fontSize:10, color:'var(--orion-text-mute)' }} title="Secondes avant / après l'action pour cette séquence">
                        <input type="number" min={0} max={60} value={clipBefore(p.id)}
                          onChange={e => setClipDuration(p.id, 'before', Math.max(0, parseInt(e.target.value) || 0))}
                          style={{ width:34, padding:'2px 3px', textAlign:'center', background:'var(--orion-surface)', border:'1px solid var(--orion-line)', borderRadius:4, color:'var(--orion-text)', fontSize:10 }} />
                        <span>‹●›</span>
                        <input type="number" min={0} max={60} value={clipAfter(p.id)}
                          onChange={e => setClipDuration(p.id, 'after', Math.max(0, parseInt(e.target.value) || 0))}
                          style={{ width:34, padding:'2px 3px', textAlign:'center', background:'var(--orion-surface)', border:'1px solid var(--orion-line)', borderRadius:4, color:'var(--orion-text)', fontSize:10 }} />
                      </span>
                    )}
                    {running && currentIdx > i && <Check size={12} style={{ color:'var(--orion-green)' }} />}
                    {running && currentIdx === i && <Loader size={12} style={{ color:'var(--orion-accent)' }} />}
                    {!running && (
                      <span style={{ display:'flex', flexDirection:'column', gap:1 }}>
                        <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0}
                          title="Monter"
                          style={{ display:'flex', padding:0, background:'none', border:'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--orion-line-strong)' : 'var(--orion-text-mute)', lineHeight:0 }}>
                          <ChevronUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveItem(i, 1)} disabled={i === sortedPlaylist.length - 1}
                          title="Descendre"
                          style={{ display:'flex', padding:0, background:'none', border:'none', cursor: i === sortedPlaylist.length - 1 ? 'default' : 'pointer', color: i === sortedPlaylist.length - 1 ? 'var(--orion-line-strong)' : 'var(--orion-text-mute)', lineHeight:0 }}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    )}
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
