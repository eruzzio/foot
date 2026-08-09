import { useRef, useEffect, useState } from 'react';

interface Props {
  videoUrl: string;
  clipStart: number;  // seconde de début dans la vidéo (dans le match complet)
  clipEnd: number;    // seconde de fin dans la vidéo
}

/**
 * Lecteur de prévisualisation d'une séquence : le fichier complet est en mémoire,
 * mais on ne joue et n'affiche QUE la portion [clipStart, clipEnd], en boucle,
 * avec une barre de progression relative au clip (0 → durée du clip).
 */
export default function ClipAdjuster({ videoUrl, clipStart, clipEnd }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const startRef = useRef(clipStart);
  const endRef = useRef(clipEnd);
  startRef.current = clipStart;
  endRef.current = clipEnd;

  const [playing, setPlaying] = useState(true);
  const [rel, setRel] = useState(0); // position relative dans le clip (secondes)
  const clipDuration = Math.max(0.1, clipEnd - clipStart);

  // Caler au début du clip dès que possible et à chaque changement de bornes
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const place = () => { try { v.currentTime = clipStart; v.play().catch(() => {}); } catch { /* noop */ } };
    if (v.readyState >= 1) place();
    else { v.addEventListener('loadedmetadata', place, { once: true }); return () => v.removeEventListener('loadedmetadata', place); }
  }, [clipStart, clipEnd, videoUrl]);

  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v) return;
    // Boucle sur la portion
    if (v.currentTime >= endRef.current || v.currentTime < startRef.current - 0.3) {
      v.currentTime = startRef.current;
      v.play().catch(() => {});
    }
    setRel(Math.max(0, Math.min(clipDuration, v.currentTime - startRef.current)));
  };

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  // Clic sur la barre : se positionner dans le clip
  const seekInClip = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = ref.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = startRef.current + ratio * clipDuration;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ background: '#000' }}>
      <video
        ref={ref}
        src={videoUrl}
        style={{ width: '100%', maxHeight: 380, display: 'block', background: '#000' }}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        autoPlay
        muted
        playsInline
      />
      {/* Contrôles personnalisés : bornés au clip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--orion-surface)' }}>
        <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orion-text)', display: 'flex', padding: 2 }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        </button>
        <span style={{ fontSize: 11, fontFamily: 'var(--orion-font-mono)', color: 'var(--orion-text-mute)', minWidth: 74 }}>
          {fmt(rel)} / {fmt(clipDuration)}
        </span>
        <div onClick={seekInClip} style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(rel / clipDuration) * 100}%`, background: 'var(--orion-accent)', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', padding: '2px 0 6px', textAlign: 'center' }}>
        Aperçu en boucle · {Math.round(clipDuration)}s
      </div>
    </div>
  );
}
