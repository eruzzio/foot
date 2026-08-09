import { useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
  clipStart: number;  // seconde de début dans la vidéo
  clipEnd: number;    // seconde de fin dans la vidéo
}

/**
 * Lecteur de prévisualisation : joue en boucle uniquement la portion
 * [clipStart, clipEnd] de la vidéo. Sa propre balise vidéo, n'impacte pas le lecteur principal.
 */
export default function ClipAdjuster({ videoUrl, clipStart, clipEnd }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  // Les bornes courantes, lues par le handler de boucle sans le recréer
  const startRef = useRef(clipStart);
  const endRef = useRef(clipEnd);
  startRef.current = clipStart;
  endRef.current = clipEnd;

  // Placer la vidéo au début du clip dès que possible (et à chaque changement de bornes)
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const place = () => {
      try { v.currentTime = clipStart; v.play().catch(() => {}); } catch { /* noop */ }
    };
    if (v.readyState >= 1) {
      place();
    } else {
      v.addEventListener('loadedmetadata', place, { once: true });
      return () => v.removeEventListener('loadedmetadata', place);
    }
  }, [clipStart, clipEnd, videoUrl]);

  // Boucle sur la portion
  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v) return;
    if (v.currentTime >= endRef.current || v.currentTime < startRef.current - 0.3) {
      v.currentTime = startRef.current;
      v.play().catch(() => {});
    }
  };

  return (
    <div style={{ background: '#000', textAlign: 'center' }}>
      <video
        ref={ref}
        src={videoUrl}
        style={{ width: '100%', maxHeight: 400, display: 'block', background: '#000' }}
        onTimeUpdate={handleTimeUpdate}
        controls
        autoPlay
        muted
        playsInline
      />
      <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', padding: '4px 0' }}>
        Aperçu en boucle · {Math.round(clipEnd - clipStart)}s
      </div>
    </div>
  );
}
