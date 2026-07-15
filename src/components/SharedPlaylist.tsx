import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './orion/Orion';
import { Lock, Play, ListVideo, ChevronRight } from 'lucide-react';

interface Item { label: string; team?: string; minute?: string; duration?: number; url: string; }
interface Data { name: string; items: Item[]; team_a: string; team_b: string; score_a: number | null; score_b: number | null; match_date: string | null; }

export default function SharedPlaylist() {
  const [status, setStatus] = useState<'loading' | 'found' | 'notfound'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const token = window.location.pathname.split('/playlist/')[1];
    if (!token) { setStatus('notfound'); return; }
    supabase.from('playlists').select('name, items_json').eq('share_token', token).single()
      .then(({ data: row }) => {
        if (!row) { setStatus('notfound'); return; }
        try {
          const p = JSON.parse(row.items_json);
          if (!p.items?.length) { setStatus('notfound'); return; }
          setData({
            name: row.name, items: p.items,
            team_a: p.team_a || 'Équipe A', team_b: p.team_b || 'Équipe B',
            score_a: p.score_a ?? null, score_b: p.score_b ?? null,
            match_date: p.match_date || null,
          });
          setStatus('found');
        } catch { setStatus('notfound'); }
      });
  }, []);

  useEffect(() => {
    if (videoRef.current && data) { videoRef.current.load(); videoRef.current.play().catch(() => {}); }
  }, [activeIdx, data]);

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

  const active = data.items[activeIdx];

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', padding:16 }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'20px 24px', color:'#fff', marginBottom:16 }}>
          <div style={{ position:'absolute', top:0, right:0, width:300, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <ListVideo size={14} style={{ color:'#8aa0bd' }} />
              <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd' }}>Playlist vidéo</span>
            </div>
            <h1 style={{ margin:0, fontSize:21, fontWeight:800 }}>{data.name}</h1>
            <div style={{ marginTop:6, fontSize:13, color:'#8aa0bd' }}>
              {data.team_a} <span style={{ color:'#5a6a80' }}>vs</span> {data.team_b}
              {data.score_a !== null && data.score_b !== null && (
                <span style={{ marginLeft:8, fontWeight:700, color:'#fff', fontFamily:'var(--orion-font-mono)' }}>{data.score_a} – {data.score_b}</span>
              )}
              {data.match_date && <span style={{ marginLeft:8 }}>· {new Date(data.match_date).toLocaleDateString('fr-FR')}</span>}
              <span style={{ marginLeft:8 }}>· {data.items.length} séquence{data.items.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div style={{ borderRadius:12, overflow:'hidden', background:'#000', boxShadow:'0 8px 30px -8px rgba(0,0,0,0.3)' }}>
          <video ref={videoRef} key={active.url} src={active.url} controls playsInline preload="auto"
            style={{ width:'100%', display:'block', maxHeight:'56vh', background:'#000' }}
            onEnded={() => { if (activeIdx < data.items.length - 1) setActiveIdx(activeIdx + 1); }} />
        </div>

        <div style={{ marginTop:10, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:26, height:26, borderRadius:'50%', background:'var(--orion-accent)', color:'#fff', fontWeight:800, fontSize:12, fontFamily:'var(--orion-font-mono)' }}>
            {activeIdx + 1}
          </span>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--orion-text)' }}>{active.label}</span>
          {active.minute && <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>· {active.minute} de match</span>}
          {active.team && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:'var(--orion-surface-2)', color:'var(--orion-text-dim)' }}>Éq. {active.team}</span>}
          {activeIdx < data.items.length - 1 && (
            <button onClick={() => setActiveIdx(activeIdx + 1)}
              style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface)', color:'var(--orion-text)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              Suivante <ChevronRight size={13} />
            </button>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {data.items.map((item, i) => {
            const on = i === activeIdx;
            return (
              <button key={i} onClick={() => setActiveIdx(i)}
                style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', padding:'11px 14px', borderRadius:9, cursor:'pointer',
                  background: on ? 'rgba(61,128,224,0.07)' : 'var(--orion-surface)',
                  border:`1.5px solid ${on ? 'var(--orion-accent)' : 'var(--orion-line)'}`, transition:'all .12s' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: on ? 'var(--orion-accent)' : 'var(--orion-surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: on ? '#fff' : 'var(--orion-text-mute)', fontWeight:800, fontSize:12, fontFamily:'var(--orion-font-mono)' }}>
                  {on ? <Play size={12} /> : i + 1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--orion-text)' }}>{item.label}</div>
                  <div style={{ fontSize:11.5, color:'var(--orion-text-mute)', marginTop:1 }}>
                    {item.minute && `${item.minute} de match`}
                    {item.team && ` · Éq. ${item.team}`}
                    {item.duration ? ` · ${item.duration}s` : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop:28, textAlign:'center', paddingTop:16, borderTop:'1px solid var(--orion-line)' }}>
          <OrionLogo height={14} />
          <div style={{ marginTop:8, fontSize:11, color:'var(--orion-text-faint)' }}>Playlist générée avec ORION · orion-analyse.fr</div>
        </div>
      </div>
    </div>
  );
}
