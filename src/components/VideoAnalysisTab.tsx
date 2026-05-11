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
  const [offset, setOffset] = useState(0); // décalage entre chrono ORION et vidéo
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

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
      videoRef.current.currentTime = Math.max(0, videoTs - 3); // 3s avant
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
        {videoSource?.type === 'local' ? (
          <div style={{ position: 'relative', background: '#000' }}>
            <video
              ref={videoRef}
              src={videoSource.url}
              style={{ width: '100%', maxHeight: 400, display: 'block' }}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
            />
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: 4, fontSize: 11, color: '#7ab4f0', fontFamily: 'var(--orion-font-mono)' }}>
              {formatTime(currentTime)}
            </div>
          </div>
        ) : videoSource?.type === 'veo' ? (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)' }}>Décalage</span>
              <button onClick={() => setOffset(o => o - 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '4px 8px' }}>−</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orion-accent)', fontFamily: 'var(--orion-font-mono)', minWidth: 36, textAlign: 'center' }}>
                {offset >= 0 ? '+' : ''}{offset}s
              </span>
              <button onClick={() => setOffset(o => o + 1)} className="o-btn o-btn--ghost o-btn--sm" style={{ padding: '4px 8px' }}>+</button>
              <button onClick={() => setOffset(0)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize: 10 }}>Reset</button>
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
                {videoSource ? formatTime(Math.max(0, videoTs - 3)) : '--:--'}
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
