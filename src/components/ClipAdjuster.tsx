import { useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
  clipStart: number;  // seconde de début dans la vidéo
  clipEnd: number;    // seconde de fin dans la vidéo
}

/**
 * Lecteur de prévisualisation : joue en boucle uniquement la portion
 * [clipStart, clipEnd] de la vidéo, pour ajuster une séquence.
 * Ne touche pas au lecteur principal (sa propre balise vidéo).
 */
export default function ClipAdjuster({ videoUrl, clipStart, clipEnd }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  // Au montage / changement de bornes : se placer au début et lancer la lecture
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onReady = () => {
      v.currentTime = clipStart;
      v.play().catch(() => {});
    };
    if (v.readyState >= 1) onReady();
    else v.addEventListener('loadedmetadata', onReady, { once: true });
    return () => v.removeEventListener('loadedmetadata', onReady);
  }, [clipStart, clipEnd]);

  // Boucle : dès qu'on dépasse la fin, on repart au début
  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v) return;
    if (v.currentTime >= clipEnd || v.currentTime < clipStart - 0.3) {
      v.currentTime = clipStart;
      v.play().catch(() => {});
    }
  };

  return (
    <div style={{ background:'#000' }}>
      <video
        ref={ref}
        src={videoUrl}
        style={{ width:'100%', maxHeight:400, display:'block', background:'#000' }}
        onTimeUpdate={handleTimeUpdate}
        controls
        autoPlay
        muted
      />
    </div>
  );
}
