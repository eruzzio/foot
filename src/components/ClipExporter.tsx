import { useState } from 'react';
import { X, Download, Loader, Check, Film, Files } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../utils/r2Upload';

interface ClipItem {
  id?: string;
  timestamp: number;   // timecode dans la vidéo (offset déjà appliqué en amont)
  label: string;
}

interface Props {
  playlist: ClipItem[];
  videoFile: File | null;
  videoOffset?: number;
  match: any;
  onClose: () => void;
}

type Mode = 'separate' | 'merged';
type Step = 'config' | 'upload' | 'cut' | 'done' | 'error';

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export default function ClipExporter({ playlist, videoFile, videoOffset = 0, match, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('separate');
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [step, setStep] = useState<Step>('config');
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState('');

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` };
  };

  const run = async () => {
    if (!videoFile || playlist.length === 0) return;
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // 1. Upload de la vidéo source sur R2
      setStep('upload'); setProgress(0);
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const key = `${user.id}/${match.id}/export_${Date.now()}.${ext}`;
      await uploadToR2(key, videoFile, p => setProgress(p));

      // URL signée pour lecture serveur
      const headers = await authHeaders();
      const signResp = await fetch('/api/r2-get-signed-url', {
        method: 'POST', headers, body: JSON.stringify({ key }),
      });
      const signed = await signResp.json();
      if (!signResp.ok || !signed?.url) throw new Error('URL signée : ' + (signed?.error || 'échec'));
      const videoUrl = signed.url;

      const safeName = (match.team_a_name && match.team_b_name)
        ? `${match.team_a_name}-vs-${match.team_b_name}`.replace(/[^a-zA-Z0-9-]/g, '_')
        : 'montage';

      setStep('cut'); setProgress(0);

      if (mode === 'separate') {
        // Un fichier MP4 par séquence
        for (let i = 0; i < playlist.length; i++) {
          setCurrentIdx(i); setProgress(Math.round((i / playlist.length) * 100));
          const vTs = playlist[i].timestamp;
          const s = Math.max(0, vTs - before);
          const dur = before + after;
          const resp = await fetch('/api/clip-from-storage', {
            method: 'POST', headers, body: JSON.stringify({ videoUrl, start: s, duration: dur }),
          });
          if (!resp.ok) {
            const msg = await resp.json().catch(() => ({}));
            throw new Error(`Séquence ${i + 1} : ${msg.error || resp.status}`);
          }
          const blob = await resp.blob();
          const label = (playlist[i].label || `clip-${i + 1}`).replace(/[^a-zA-Z0-9-]/g, '_');
          triggerDownload(blob, `${String(i + 1).padStart(2, '0')}_${label}.mp4`);
        }
      } else {
        // Montage groupé : un seul MP4
        const segments = playlist.map(p => ({
          start: Math.max(0, p.timestamp - before),
          duration: before + after,
        }));
        const resp = await fetch('/api/concat-clips', {
          method: 'POST', headers, body: JSON.stringify({ videoUrl, segments }),
        });
        if (!resp.ok) {
          const msg = await resp.json().catch(() => ({}));
          throw new Error(msg.error || `Montage échoué (${resp.status})`);
        }
        const blob = await resp.blob();
        triggerDownload(blob, `${safeName}_montage.mp4`);
      }

      // Nettoyage de la vidéo source sur R2
      await fetch('/api/r2-get-signed-url', {
        method: 'POST', headers, body: JSON.stringify({ key, action: 'delete' }),
      }).catch(() => {});

      setProgress(100);
      setStep('done');
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
      setStep('error');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,10,0.85)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 250, padding: 16 }}
      onClick={step === 'config' || step === 'done' || step === 'error' ? onClose : undefined}>
      <div style={{ background: 'var(--orion-surface)', border: '1px solid var(--orion-line)', borderRadius: 12, width: 'min(560px,96vw)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--orion-line)' }}>
          <span style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={17} /> Exporter en fichier · {playlist.length} séquence{playlist.length > 1 ? 's' : ''}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orion-text-mute)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 18 }}>
          {step === 'config' && (
            <>
              {/* Choix du mode */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button type="button" onClick={() => setMode('separate')}
                  style={{ flex: 1, padding: '14px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: mode === 'separate' ? 'rgba(61,128,224,0.1)' : 'var(--orion-surface-2)',
                    border: '1.5px solid ' + (mode === 'separate' ? 'var(--orion-accent)' : 'var(--orion-line)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    <Files size={15} /> Fichiers séparés
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--orion-text-mute)' }}>Un MP4 par séquence</div>
                </button>
                <button type="button" onClick={() => setMode('merged')}
                  style={{ flex: 1, padding: '14px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: mode === 'merged' ? 'rgba(61,128,224,0.1)' : 'var(--orion-surface-2)',
                    border: '1.5px solid ' + (mode === 'merged' ? 'var(--orion-accent)' : 'var(--orion-line)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    <Film size={15} /> Montage groupé
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--orion-text-mute)' }}>Un seul MP4 bout à bout</div>
                </button>
              </div>

              {/* Durées */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginBottom: 4, fontWeight: 600 }}>Secondes avant</div>
                  <input type="number" value={before} min={0} step={1} onChange={e => setBefore(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginBottom: 4, fontWeight: 600 }}>Secondes après</div>
                  <input type="number" value={after} min={0} step={1} onChange={e => setAfter(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)' }} />
                </div>
              </div>

              {mode === 'merged' && playlist.length > 12 && (
                <div style={{ fontSize: 11, color: 'var(--orion-amber)', marginBottom: 12 }}>
                  ⚠️ Beaucoup de séquences : le montage groupé peut être long. En cas d'échec, utilise les fichiers séparés.
                </div>
              )}

              <button type="button" onClick={run} disabled={!videoFile || playlist.length === 0}
                className="o-btn o-btn--primary" style={{ width: '100%', justifyContent: 'center', opacity: (!videoFile || playlist.length === 0) ? 0.5 : 1 }}>
                <Download size={15} /> Exporter
              </button>
            </>
          )}

          {(step === 'upload' || step === 'cut') && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <Loader size={28} style={{ color: 'var(--orion-accent)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {step === 'upload' ? 'Envoi de la vidéo…' : (mode === 'separate' ? `Découpe ${currentIdx + 1}/${playlist.length}…` : 'Montage en cours…')}
              </div>
              <div style={{ height: 8, background: 'var(--orion-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orion-accent)', transition: 'width .2s' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginTop: 6 }}>{progress}%</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <Check size={32} style={{ color: 'var(--orion-green)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Export terminé</div>
              <div style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 16 }}>
                {mode === 'separate' ? `${playlist.length} fichiers téléchargés.` : 'Le montage a été téléchargé.'}
              </div>
              <button type="button" onClick={onClose} className="o-btn o-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>Fermer</button>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ color: 'var(--orion-red)', fontWeight: 700, marginBottom: 8 }}>Erreur</div>
              <div style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 16 }}>{error}</div>
              <button type="button" onClick={() => setStep('config')} className="o-btn o-btn--ghost" style={{ width: '100%', justifyContent: 'center' }}>Réessayer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
