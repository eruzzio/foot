import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Video, Play, Pause, Filter, ExternalLink, Clock, ChevronRight, X, Link } from 'lucide-react';
import { Match, MatchEventWithDetails } from '../types/database';
import { buildVeoTimestampUrl } from '../utils/veoParser';

interface VideoAnalysisTabProps {
  match: Match & { events: MatchEventWithDetails[] };
  teamAName: string;
  teamBName: string;
}

type VideoSource = { type: 'veo'; url: string } | { type: 'local'; url: string; name: string } | null;

export default function VideoAnalysisTab({ match, teamAName, teamBName }: VideoAnalysisTabProps) {
  const [videoSource, setVideoSource] = useState<VideoSource>(
    match.video_url ? { type: 'veo', url: match.video_url } : null
  );
  const [urlInput, setUrlInput] = useState(match.video_url || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [filterTeam, setFilterTeam] = useState<'all' | 'A' | 'B'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipBefore, setClipBefore] = useState(3);  // secondes avant
  const [clipAfter, setClipAfter] = useState(5);   // secondes après
  const [offset, setOffset] = useState(0);          // décalage sync vidéo
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Arrêt automatique après clipAfter secondes
  useEffect(() => {
    if (!videoRef.current || !activeEventId) return;
    const event = match.events.find(e => e.id === activeEventId);
    if (!event) return;
    const endTime = (event.video_timestamp ?? event.timestamp) + offset + clipAfter;
    const check = () => {
      if (videoRef.current && videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    videoRef.current.addEventListener('timeupdate', check);
    return () => videoRef.current?.removeEventListener('timeupdate', check);
  }, [activeEventId, offset, clipAfter, match.events]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

  // Charger un fichier local
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSource({ type: 'local', url, name: file.name });
  };

  // Sauter au timestamp d'un événement
  const seekToEvent = (event: MatchEventWithDetails) => {
    const ts = event.video_timestamp ?? event.timestamp;
    const videoTs = ts + offset;
    setActiveEventId(event.id);

    if (videoSource?.type === 'local' && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoTs - clipBefore);
      videoRef.current.play();
      setIsPlaying(true);
    } else if (videoSource?.type === 'veo' && match.video_url) {
      const link = buildVeoTimestampUrl(match.video_url, videoTs);
      window.open(link, '_blank');
    }
  };

  // Sync currentTime pour la vidéo locale
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  // Mettre en surbrillance l'événement le plus proche du currentTime
  useEffect(() => {
    if (!videoRef.current) return;
    const closest = match.events
      .filter(e => {
        const ts = (e.video_timestamp ?? e.timestamp) + offset;
        return ts >= currentTime - 2 && ts <= currentTime + 2;
      })
      .sort((a, b) => {
        const ta = Math.abs((a.video_timestamp ?? a.timestamp) + offset - currentTime);
        const tb = Math.abs((b.video_timestamp ?? b.timestamp) + offset - currentTime);
        return ta - tb;
      })[0];
    if (closest) setActiveEventId(closest.id);
  }, [currentTime, match.events, offset]);

  const eventTypes = Array.from(new Set(
    match.events.map(e => e.event_type?.name || e.label).filter(Boolean)
  )) as string[];

  const filteredEvents = match.events
    .filter(e => filterTeam === 'all' || e.team === filterTeam)
    .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType)
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* LECTEUR VIDÉO */}
      <div style={{ background: '#0a0f18', border: '1.5px solid var(--orion-line-strong)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>

        {/* Zone vidéo */}
        {videoSource?.type === 'local' ? (() => {
          // Bornes du clip actif
          const activeEvent = match.events.find(e => e.id === activeEventId);
          const clipStart = activeEvent ? Math.max(0, (activeEvent.video_timestamp ?? activeEvent.timestamp) + offset - clipBefore) : 0;
          const clipEnd = activeEvent ? (activeEvent.video_timestamp ?? activeEvent.timestamp) + offset + clipAfter : Infinity;
          const clipDuration = activeEvent ? clipBefore + clipAfter : 0;
          const clipProgress = activeEvent && clipDuration > 0 ? Math.min(1, Math.max(0, (currentTime - clipStart) / clipDuration)) : 0;

          return (
            <div style={{ position: 'relative', background: '#000' }}>
              {/* Vidéo sans contrôles natifs */}
              <video
                ref={videoRef}
                src={videoSource.url}
                style={{ width: '100%', maxHeight: 380, display: 'block' }}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Overlay clip actif */}
              {activeEvent && (
                <div style={{ position:'absolute', inset:0, pointerEvents:'none', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                  {/* Badge clip en haut */}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px' }}>
                    <span style={{ background:'rgba(0,0,0,0.7)', padding:'3px 8px', borderRadius:4, fontSize:11, color:'var(--orion-accent)', fontFamily:'var(--orion-font-mono)', fontWeight:700 }}>
                      {activeEvent.event_type?.name || activeEvent.label}
                    </span>
                    <span style={{ background:'rgba(0,0,0,0.7)', padding:'3px 8px', borderRadius:4, fontSize:11, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)' }}>
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
              )}

              {/* Contrôles custom */}
              <div style={{ background:'rgba(0,0,0,0.85)', padding:'10px 14px' }}>
                {/* Barre de progression du clip */}
                {activeEvent ? (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', marginBottom:5 }}>
                      <span>−{clipBefore}s</span>
                      <span style={{ color:'var(--orion-accent)', fontWeight:700 }}>● {activeEvent.event_type?.name || activeEvent.label}</span>
                      <span>+{clipAfter}s</span>
                    </div>
                    {/* Barre cliquable */}
                    <div
                      style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:3, cursor:'pointer', position:'relative' }}
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        const newTime = clipStart + ratio * clipDuration;
                        if (videoRef.current) videoRef.current.currentTime = Math.max(clipStart, Math.min(clipEnd, newTime));
                      }}
                    >
                      {/* Fond gris = zone hors clip */}
                      <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.08)', borderRadius:3 }} />
                      {/* Progression */}
                      <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${clipProgress * 100}%`, background:'var(--orion-accent)', borderRadius:3, transition:'width .1s linear' }} />
                      {/* Curseur */}
                      <div style={{ position:'absolute', top:'50%', left:`${clipProgress * 100}%`, transform:'translate(-50%,-50%)', width:12, height:12, borderRadius:'50%', background:'white', boxShadow:'0 0 4px rgba(0,0,0,0.5)' }} />
                      {/* Marqueur moment action */}
                      <div style={{ position:'absolute', top:-2, left:`${(clipBefore / clipDuration) * 100}%`, transform:'translateX(-50%)', width:2, height:10, background:'var(--orion-red)', borderRadius:1 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, marginBottom:10 }}>
                    <div style={{ height:'100%', width:`${videoRef.current ? (currentTime / (videoRef.current.duration || 1)) * 100 : 0}%`, background:'var(--orion-accent)', borderRadius:3 }} />
                  </div>
                )}

                {/* Boutons de contrôle */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {/* Play/Pause */}
                  <button
                    onClick={() => { if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); } }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'white', display:'flex', padding:2 }}
                  >
                    {isPlaying
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                    }
                  </button>

                  {/* Rejouer le clip */}
                  {activeEvent && (
                    <button
                      onClick={() => { if (videoRef.current) { videoRef.current.currentTime = clipStart; videoRef.current.play(); } }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', display:'flex', padding:2 }}
                      title="Rejouer le clip"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.85"/></svg>
                    </button>
                  )}

                  {/* Temps */}
                  <span style={{ fontSize:11, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', flex:1 }}>
                    {activeEvent ? `${formatTime(Math.max(0, currentTime - clipStart))} / ${formatTime(clipDuration)}` : formatTime(currentTime)}
                  </span>

                  {/* Clip précédent / suivant */}
                  {activeEvent && (() => {
                    const sorted = match.events.filter(e => filterTeam === 'all' || e.team === filterTeam).sort((a,b) => a.timestamp - b.timestamp);
                    const idx = sorted.findIndex(e => e.id === activeEventId);
                    return (
                      <>
                        <button onClick={() => idx > 0 && seekToEvent(sorted[idx-1])}
                          disabled={idx <= 0}
                          style={{ background:'none', border:'none', cursor: idx > 0 ? 'pointer' : 'not-allowed', color: idx > 0 ? 'var(--orion-text-dim)' : 'var(--orion-text-faint)', display:'flex', padding:2 }}
                          title="Action précédente">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button onClick={() => idx < sorted.length-1 && seekToEvent(sorted[idx+1])}
                          disabled={idx >= sorted.length-1}
                          style={{ background:'none', border:'none', cursor: idx < sorted.length-1 ? 'pointer' : 'not-allowed', color: idx < sorted.length-1 ? 'var(--orion-text-dim)' : 'var(--orion-text-faint)', display:'flex', padding:2 }}
                          title="Action suivante">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </>
                    );
                  })()}

                  {/* Plein écran */}
                  <button onClick={() => videoRef.current?.requestFullscreen()}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', display:'flex', padding:2 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })() : videoSource?.type === 'veo' ? (
          <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 4, background: 'rgba(61,128,224,0.15)', border: '1px solid rgba(61,128,224,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={16} style={{ color: 'var(--orion-accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--orion-text)' }}>VEO synchronisé</div>
                <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoSource.url}</div>
              </div>
            </div>
            <button onClick={() => window.open(videoSource.url, '_blank')} className="o-btn o-btn--sm" style={{ gap: 6 }}>
              Ouvrir VEO <ExternalLink size={13} />
            </button>
          </div>
        ) : (
          // Pas de source — zone de chargement
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <Video size={32} style={{ color: 'var(--orion-text-faint)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orion-text-dim)', marginBottom: 6 }}>Aucune vidéo chargée</div>
            <div style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 20 }}>Charge un fichier local ou colle un lien VEO</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => fileInputRef.current?.click()} className="o-btn o-btn--sm">
                <Upload size={13} /> Fichier local
              </button>
              <button onClick={() => setShowUrlInput(true)} className="o-btn o-btn--sm">
                <Link size={13} /> Lien VEO
              </button>
            </div>
          </div>
        )}

        {/* Barre d'actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--orion-line)', flexWrap: 'wrap' }}>
          <button onClick={() => fileInputRef.current?.click()} className="o-btn o-btn--ghost o-btn--sm">
            <Upload size={12} /> Fichier local
          </button>
          <button onClick={() => setShowUrlInput(!showUrlInput)} className="o-btn o-btn--ghost o-btn--sm">
            <Link size={12} /> Lien VEO
          </button>
          {videoSource && (
            <button onClick={() => setVideoSource(null)} className="o-btn o-btn--ghost o-btn--sm" style={{ color: 'var(--orion-red)' }}>
              <X size={12} /> Retirer
            </button>
          )}

          {/* Décalage offset */}
          {videoSource?.type === 'local' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {/* Clip avant/après */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)' }}>CLIP</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setClipBefore(b => Math.max(0, b - 1))} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>−</button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orion-text-dim)', fontFamily: 'var(--orion-font-mono)', minWidth: 28, textAlign: 'center' }}>−{clipBefore}s</span>
                  <button onClick={() => setClipBefore(b => b + 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>+</button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--orion-text-faint)', fontFamily: 'var(--orion-font-mono)' }}>●</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setClipAfter(a => Math.max(0, a - 1))} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>−</button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orion-text-dim)', fontFamily: 'var(--orion-font-mono)', minWidth: 28, textAlign: 'center' }}>+{clipAfter}s</span>
                  <button onClick={() => setClipAfter(a => a + 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>+</button>
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ width: 1, height: 16, background: 'var(--orion-line)' }} />

              {/* Décalage sync */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)' }}>SYNC</span>
                <button onClick={() => setOffset(o => o - 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>−</button>
                <span style={{ fontSize: 11, fontWeight: 700, color: offset !== 0 ? 'var(--orion-accent)' : 'var(--orion-text-dim)', fontFamily: 'var(--orion-font-mono)', minWidth: 36, textAlign: 'center' }}>
                  {offset >= 0 ? '+' : ''}{offset}s
                </span>
                <button onClick={() => setOffset(o => o + 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '3px 7px' }}>+</button>
                <button onClick={() => setOffset(0)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize: 10, padding: '3px 7px' }}>Reset</button>
              </div>
            </div>
          )}
        </div>

        {/* Input URL VEO */}
        {showUrlInput && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--orion-line)', display: 'flex', gap: 8 }}>
            <input
              type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://veo.co/shared-videos/..."
              style={{ flex: 1, padding: '7px 10px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 4, color: 'var(--orion-text)', fontSize: 12, outline: 'none', fontFamily: 'var(--orion-font-mono)' }}
              onKeyDown={e => { if (e.key === 'Enter' && urlInput) { setVideoSource({ type: 'veo', url: urlInput }); setShowUrlInput(false); } }}
            />
            <button onClick={() => { if (urlInput) { setVideoSource({ type: 'veo', url: urlInput }); setShowUrlInput(false); } }} className="o-btn o-btn--primary o-btn--sm">
              Charger
            </button>
            <button onClick={() => setShowUrlInput(false)} className="o-btn o-btn--ghost o-btn--sm"><X size={13} /></button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileLoad} />

      {/* FILTRES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <Filter size={13} style={{ color: 'var(--orion-text-mute)' }} />
        {(['all', 'A', 'B'] as const).map(t => (
          <button key={t} onClick={() => setFilterTeam(t)}
            className={`o-btn o-btn--sm ${filterTeam === t ? 'o-btn--primary' : 'o-btn--ghost'}`}>
            {t === 'all' ? 'Tous' : t === 'A' ? teamAName : teamBName}
          </button>
        ))}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '5px 10px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 4, color: 'var(--orion-text)', fontSize: 12, outline: 'none' }}>
          <option value="all">Tous les types</option>
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginLeft: 'auto' }}>
          {filteredEvents.length} action{filteredEvents.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* LISTE DES ÉVÉNEMENTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--orion-text-mute)', fontSize: 13 }}>
            Aucun événement
          </div>
        ) : filteredEvents.map(event => {
          const ts = event.video_timestamp ?? event.timestamp;
          const videoTs = ts + offset;
          const isActive = activeEventId === event.id;
          const color = event.event_type?.color || '#6B7280';
          const teamColor = event.team === 'A' ? 'var(--orion-accent)' : 'var(--orion-amber)';

          return (
            <button key={event.id} onClick={() => seekToEvent(event)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isActive ? 'var(--orion-surface-2)' : 'transparent', border: `1.5px solid ${isActive ? 'var(--orion-accent)' : 'var(--orion-line)'}`, borderRadius: 4, cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--orion-surface)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Timestamp ORION */}
              <span style={{ fontFamily: 'var(--orion-font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--orion-text)', minWidth: 42 }}>
                {formatTime(event.timestamp)}
              </span>

              {/* Flèche */}
              <ChevronRight size={12} style={{ color: 'var(--orion-text-faint)', flexShrink: 0 }} />

              {/* Timestamp vidéo */}
              <span style={{ fontFamily: 'var(--orion-font-mono)', fontSize: 12, fontWeight: 600, color: isActive ? 'var(--orion-accent)' : 'var(--orion-text-mute)', minWidth: 42 }}>
                {videoSource ? formatTime(Math.max(0, videoTs - clipBefore)) : '--:--'}
              </span>

              {/* Point couleur */}
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

              {/* Nom action */}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--orion-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.event_type?.name && event.label && event.label !== event.event_type.name
                  ? `${event.event_type.name} · ${event.label}`
                  : event.event_type?.name || event.label || 'Action'}
              </span>

              {/* Équipe */}
              <span style={{ fontSize: 11, fontWeight: 600, color: teamColor, fontFamily: 'var(--orion-font-mono)', flexShrink: 0 }}>
                {event.team === 'A' ? teamAName : teamBName}
              </span>

              {/* Outcome */}
              {event.outcome === 'success' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orion-green)', background: 'var(--orion-green-dim)', padding: '2px 7px', borderRadius: 3, flexShrink: 0 }}>OK</span>
              )}
              {event.outcome === 'failure' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orion-red)', background: 'var(--orion-red-dim)', padding: '2px 7px', borderRadius: 3, flexShrink: 0 }}>RATÉ</span>
              )}

              {/* Icône play si vidéo */}
              {videoSource && (
                <Play size={12} style={{ color: isActive ? 'var(--orion-accent)' : 'var(--orion-text-faint)', flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Aide offset */}
      {videoSource?.type === 'local' && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--orion-surface)', border: '1px solid var(--orion-line)', borderRadius: 4, fontSize: 11, color: 'var(--orion-text-mute)' }}>
          💡 <strong style={{ color: 'var(--orion-text-dim)' }}>Décalage</strong> — si la vidéo commence avant le coup d'envoi, ajuste le décalage pour synchroniser les timestamps ORION avec la vidéo.
        </div>
      )}
    </div>
  );
}
