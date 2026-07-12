import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './orion/Orion';
import { Lock, Play, ExternalLink, ListVideo } from 'lucide-react';

interface PlaylistItem {
  label: string;
  timestamp: number;   // seconde dans la VIDEO (déjà décalée)
  team?: string;
  minute?: string;     // minute de match affichée
}

interface PlaylistData {
  name: string;
  items: PlaylistItem[];
  video_url: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  match_date: string | null;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function SharedPlaylist() {
  const [status, setStatus] = useState<'loading' | 'found' | 'notfound'>('loading');
  const [data, setData] = useState<PlaylistData | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    const token = window.location.pathname.split('/playlist/')[1];
    if (!token) { setStatus('notfound'); return; }

    supabase.from('playlists').select('name, items_json').eq('share_token', token).single()
      .then(({ data: row }) => {
        if (!row) { setStatus('notfound'); return; }
        try {
          const payload = JSON.parse(row.items_json);
          setData({
            name: row.name,
            items: payload.items || [],
            video_url: payload.video_url || '',
            team_a: payload.team_a || 'Équipe A',
            team_b: payload.team_b || 'Équipe B',
            score_a: payload.score_a ?? null,
            score_b: payload.score_b ?? null,
            match_date: payload.match_date || null,
          });
          setStatus('found');
        } catch {
          setStatus('notfound');
        }
      });
  }, []);

  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <OrionLogo height={18} />
        <div style={{ marginTop:24, fontSize:13, color:'var(--orion-text-mute)' }}>Chargement de la playlist…</div>
      </div>
    </div>
  );

  if (status === 'notfound' || !data) return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:32 }}>
        <OrionLogo height={18} />
        <div style={{ marginTop:24, width:56, height:56, borderRadius:'50%', background:'rgba(224,59,46,0.08)', border:'2px solid var(--orion-red)', display:'flex', alignItems:'center', justifyContent:'center', margin:'24px auto 16px' }}>
          <Lock size={24} style={{ color:'var(--orion-red)' }} />
        </div>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--orion-text)', marginBottom:8 }}>Playlist introuvable</h2>
        <p style={{ fontSize:13, color:'var(--orion-text-mute)' }}>Ce lien est invalide ou le partage a été désactivé.</p>
      </div>
    </div>
  );

  const openAt = (item: PlaylistItem, i: number) => {
    setActiveIdx(i);
    if (!data.video_url) return;
    const base = data.video_url.replace(/\/$/, '').split('?')[0];
    window.open(`${base}?t=${Math.floor(item.timestamp)}`, '_blank');
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', padding:16 }}>
      <div style={{ maxWidth:820, margin:'0 auto' }}>

        {/* Hero sombre */}
        <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'22px 24px 20px', color:'#fff', marginBottom:18, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
          <div style={{ position:'absolute', top:0, right:0, width:300, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <ListVideo size={14} style={{ color:'#8aa0bd' }} />
              <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd' }}>Playlist vidéo</span>
            </div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff' }}>{data.name}</h1>
            <div style={{ marginTop:8, fontSize:13, color:'#8aa0bd' }}>
              {data.team_a} <span style={{ color:'#5a6a80' }}>vs</span> {data.team_b}
              {data.score_a !== null && data.score_b !== null && (
                <span style={{ marginLeft:8, fontWeight:700, color:'#fff', fontFamily:'var(--orion-font-mono)' }}>{data.score_a} – {data.score_b}</span>
              )}
              {data.match_date && <span style={{ marginLeft:8 }}>· {new Date(data.match_date).toLocaleDateString('fr-FR')}</span>}
            </div>
            <div style={{ marginTop:10, fontSize:12, color:'#6b8199' }}>
              {data.items.length} séquence{data.items.length > 1 ? 's' : ''} · Clique une séquence pour l'ouvrir dans la vidéo
            </div>
          </div>
        </div>

        {/* Liste des séquences */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {data.items.map((item, i) => (
            <button
              key={i}
              onClick={() => openAt(item, i)}
              style={{
                display:'flex', alignItems:'center', gap:14, width:'100%', textAlign:'left',
                padding:'14px 16px', borderRadius:10, cursor:'pointer',
                background:'var(--orion-surface)',
                border:`1.5px solid ${activeIdx === i ? 'var(--orion-accent)' : 'var(--orion-line)'}`,
                transition:'all .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orion-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = activeIdx === i ? 'var(--orion-accent)' : 'var(--orion-line)')}
            >
              {/* Numéro */}
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--orion-accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff', fontWeight:800, fontSize:13, fontFamily:'var(--orion-font-mono)' }}>
                {i + 1}
              </div>
              {/* Infos */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)' }}>{item.label}</div>
                <div style={{ fontSize:12, color:'var(--orion-text-mute)', marginTop:2 }}>
                  {item.minute ? `${item.minute} de match` : fmt(item.timestamp)}
                  {item.team && <span> · Équipe {item.team}</span>}
                </div>
              </div>
              {/* Icône lecture */}
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, color:'var(--orion-accent)' }}>
                <Play size={15} />
                <ExternalLink size={13} style={{ color:'var(--orion-text-faint)' }} />
              </div>
            </button>
          ))}
        </div>

        {!data.video_url && (
          <div style={{ marginTop:16, padding:'12px 14px', borderRadius:8, background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.3)', fontSize:12.5, color:'#b45309' }}>
            ⚠ Aucune vidéo n'est associée à ce match — les séquences ne sont pas cliquables.
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:24, textAlign:'center', paddingTop:16, borderTop:'1px solid var(--orion-line)' }}>
          <OrionLogo height={14} />
          <div style={{ marginTop:8, fontSize:11, color:'var(--orion-text-faint)' }}>Playlist générée avec ORION · orion-analyse.fr</div>
        </div>
      </div>
    </div>
  );
}
