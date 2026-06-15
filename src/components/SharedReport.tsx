import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './orion/Orion';
import { Lock } from 'lucide-react';
import MatchReport from './MatchReport';

export default function SharedReport() {
  const [status, setStatus] = useState<'loading' | 'found' | 'notfound'>('loading');
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    const token = window.location.pathname.split('/share/')[1];
    if (!token) { setStatus('notfound'); return; }

    supabase.from('matches').select('id').eq('share_token', token).single()
      .then(({ data }) => {
        if (data?.id) { setMatchId(data.id); setStatus('found'); }
        else setStatus('notfound');
      });
  }, []);

  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <OrionLogo height={18} />
        <div style={{ marginTop:24, fontSize:13, color:'var(--orion-text-mute)' }}>Chargement du rapport…</div>
      </div>
    </div>
  );

  if (status === 'notfound') return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:32 }}>
        <OrionLogo height={18} />
        <div style={{ marginTop:24, width:56, height:56, borderRadius:'50%', background:'var(--orion-red-dim)', border:'2px solid var(--orion-red)', display:'flex', alignItems:'center', justifyContent:'center', margin:'24px auto 16px' }}>
          <Lock size={24} style={{ color:'var(--orion-red)' }} />
        </div>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--orion-text)', marginBottom:8 }}>Rapport introuvable</h2>
        <p style={{ fontSize:13, color:'var(--orion-text-mute)' }}>Ce lien est invalide ou le partage a été désactivé.</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Bandeau ORION */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', background:'var(--orion-surface)', borderBottom:'1.5px solid var(--orion-line-strong)' }}>
        <OrionLogo height={14} />
        <div style={{ fontSize:11, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)' }}>Rapport partagé · Lecture seule</div>
        <a href="/" className="o-btn o-btn--primary o-btn--sm" style={{ textDecoration:'none' }}>
          Essayer ORION →
        </a>
      </div>
      {matchId && <MatchReport matchId={matchId} onBack={() => {}} readOnly />}
    </div>
  );
}
