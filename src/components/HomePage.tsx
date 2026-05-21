import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle, Menu, X, ChevronRight, LayoutDashboard, Radio, PanelLeft, BarChart2, TrendingUp, Users, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import { calculateTeamXG } from '../utils/xg';
import { OrionLogo, Result } from './orion/Orion';

interface HomePageProps { onNavigate: (page: string) => void; }
interface MatchSummary {
  id: string; team_a_name: string; team_b_name: string;
  team_a_score: number; team_b_score: number; match_date: string;
  events_count: number; xg_for: number; xg_against: number;
  result: 'W' | 'D' | 'L';
}

const NAV_ITEMS = [
  { id: 'live',      label: 'Codage Live',    icon: Radio },
  { id: 'panels',    label: 'Mes Panneaux',   icon: PanelLeft },
  { id: 'stats',     label: 'Mes Stats',      icon: BarChart2 },
  { id: 'evolution', label: 'Évolution',      icon: TrendingUp },
  { id: 'team',      label: 'Mes Équipes',    icon: Users },
  { id: 'profile',   label: 'Mon Profil',     icon: User },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const meta = user.user_metadata || {};
    if (meta.first_name) setUserName(meta.first_name);
    await createDefaultFootballPanel(user.id);
    const { data: matchesData } = await supabase
      .from('matches').select('*').eq('status', 'completed').eq('user_id', user.id)
      .order('match_date', { ascending: false }).limit(8);
    if (matchesData?.length) {
      const summaries = await Promise.all(matchesData.map(async m => {
        const { data: evts } = await supabase.from('match_events').select('*, event_type:event_types(*)').eq('match_id', m.id);
        const e = evts || [];
        return {
          id: m.id, team_a_name: m.team_a_name, team_b_name: m.team_b_name,
          team_a_score: m.team_a_score, team_b_score: m.team_b_score,
          match_date: m.match_date, events_count: e.length,
          xg_for: calculateTeamXG(e as any, 'A'), xg_against: calculateTeamXG(e as any, 'B'),
          result: (m.team_a_score > m.team_b_score ? 'W' : m.team_a_score === m.team_b_score ? 'D' : 'L') as 'W'|'D'|'L',
        };
      }));
      setMatches(summaries.reverse());
    }
    setLoading(false);
  };

  const stats = useMemo(() => ({
    wins: matches.filter(m => m.result === 'W').length,
    draws: matches.filter(m => m.result === 'D').length,
    losses: matches.filter(m => m.result === 'L').length,
    goalsFor: matches.reduce((s, m) => s + m.team_a_score, 0),
    goalsAgainst: matches.reduce((s, m) => s + m.team_b_score, 0),
    xgFor: matches.reduce((s, m) => s + m.xg_for, 0),
    events: matches.reduce((s, m) => s + m.events_count, 0),
  }), [matches]);

  const trends = useMemo(() => {
    if (matches.length < 4) return [];
    const r = matches.slice(-3), o = matches.slice(-6, -3);
    const alerts: { type: 'good'|'bad'; msg: string }[] = [];
    const rG = r.reduce((s,m)=>s+m.team_a_score,0), oG = o.reduce((s,m)=>s+m.team_a_score,0);
    if (rG > oG+1) alerts.push({ type:'good', msg:`Efficacité offensive en hausse (+${rG-oG} buts)` });
    if (rG < oG-1) alerts.push({ type:'bad', msg:`Efficacité offensive en baisse (−${oG-rG} buts)` });
    const rGA = r.reduce((s,m)=>s+m.team_b_score,0), oGA = o.reduce((s,m)=>s+m.team_b_score,0);
    if (rGA < oGA-1) alerts.push({ type:'good', msg:`Défense plus solide (−${oGA-rGA} buts encaissés)` });
    if (rGA > oGA+1) alerts.push({ type:'bad', msg:`Défense en difficulté (+${rGA-oGA} buts encaissés)` });
    if (r.filter(m=>m.result==='W').length===3) alerts.push({ type:'good', msg:'3 victoires consécutives' });
    if (r.filter(m=>m.result==='L').length===3) alerts.push({ type:'bad', msg:'3 défaites consécutives' });
    return alerts.slice(0, 3);
  }, [matches]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', color:'var(--orion-text)' }}>

      {/* TOPBAR */}
      <header style={{ display:'flex', alignItems:'center', height:52, padding:'0 16px', background:'var(--orion-surface)', borderBottom:'1.5px solid var(--orion-line-strong)', position:'sticky', top:0, zIndex:50, gap:12 }}>
        {/* Hamburger mobile */}
        <button onClick={() => setMenuOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-dim)', display:'flex', alignItems:'center', padding:4 }}>
          <Menu size={22} />
        </button>
        <OrionLogo height={15} />
        <span style={{ flex:1 }} />
        {/* Nav desktop — cachée sur mobile */}
        <nav style={{ display:'flex', gap:20 }} className="desktop-nav">
          {NAV_ITEMS.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--orion-text-mute)', padding:'4px 0' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--orion-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--orion-text-mute)')}>
              {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => onNavigate('profile')} className="o-avatar" style={{ cursor:'pointer', flexShrink:0 }}>
          {(userName || '?')[0].toUpperCase()}
        </button>
      </header>

      {/* MENU DRAWER MOBILE */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.7)', zIndex:100, backdropFilter:'blur(4px)' }} />
          {/* Drawer */}
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:280, background:'var(--orion-surface)', borderRight:'1.5px solid var(--orion-line-strong)', zIndex:101, display:'flex', flexDirection:'column', animation:'slideIn .2s ease' }}>
            {/* Header drawer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--orion-line)' }}>
              <OrionLogo height={14} />
              <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)' }}>
                <X size={20} />
              </button>
            </div>
            {/* Bonjour */}
            {userName && (
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--orion-line)' }}>
                <div style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Connecté en tant que</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--orion-text)', marginTop:2 }}>{userName}</div>
              </div>
            )}
            {/* Items */}
            <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => { onNavigate(item.id); setMenuOpen(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Icon size={18} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--orion-text)' }}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            {/* Footer */}
            <div style={{ padding:'16px 20px', borderTop:'1px solid var(--orion-line)', fontSize:11, color:'var(--orion-text-faint)', fontFamily:'var(--orion-font-mono)' }}>
              ORION · Sports Video Analytics
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px' }}>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--orion-text-mute)', fontSize:13 }}>Chargement…</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <Activity size={36} style={{ color:'var(--orion-text-faint)', margin:'0 auto 16px' }} />
            <p style={{ color:'var(--orion-text-dim)', fontSize:14, marginBottom:6 }}>Aucun match codé pour l'instant</p>
            <p style={{ color:'var(--orion-text-mute)', fontSize:12, marginBottom:24 }}>Lance ton premier codage live</p>
            <button className="o-btn o-btn--primary" onClick={() => onNavigate('live')}>Commencer un match →</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* KPIs — 2x2 sur mobile */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, overflow:'hidden' }}>
              {[
                { label:'Matchs', value: matches.length, sub:`${stats.wins}V · ${stats.draws}N · ${stats.losses}D` },
                { label:'Buts', value: stats.goalsFor, sub:`${stats.goalsAgainst} encaissés`, accent: true },
                { label:'xG Saison', value: stats.xgFor.toFixed(1), sub:'expected goals' },
                { label:'Actions', value: stats.events, sub:`${Math.round(stats.events/matches.length)}/match` },
              ].map((k, i) => (
                <div key={i} style={{ padding:'16px 14px', borderRight: i%2===0 ? '1px solid var(--orion-line)' : 'none', borderTop: i>=2 ? '1px solid var(--orion-line)' : 'none' }}>
                  <div style={{ fontSize:10, fontFamily:'var(--orion-font-mono)', fontWeight:600, color:'var(--orion-text-mute)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>{k.label}</div>
                  <div style={{ fontSize:32, fontWeight:800, lineHeight:1, color: k.accent ? 'var(--orion-accent)' : 'var(--orion-text)', letterSpacing:'-0.02em' }}>{k.value}</div>
                  <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Match cards — scroll horizontal sur mobile */}
            <div className="o-card">
              <div className="o-card__header">
                <span className="o-eyebrow">Derniers matchs</span>
                <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>{matches.length} codés</span>
              </div>
              <div style={{ display:'flex', gap:0, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {matches.slice(-4).map((m, i) => {
                  const resultColor = m.result === 'W' ? 'var(--orion-green)' : m.result === 'D' ? 'var(--orion-amber)' : 'var(--orion-red)';
                  const resultBg = m.result === 'W' ? 'var(--orion-green-dim)' : m.result === 'D' ? 'var(--orion-amber-dim)' : 'var(--orion-red-dim)';
                  return (
                    <button key={m.id} onClick={() => onNavigate(`stats-${m.id}`)}
                      style={{ minWidth:140, flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', background:'none', border:'none', borderRight: i < matches.slice(-4).length-1 ? '1px solid var(--orion-line)' : 'none', cursor:'pointer', padding:'16px 10px', textAlign:'center', borderTop:`3px solid ${resultColor}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize:26, fontWeight:800, color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)', letterSpacing:'-0.02em', lineHeight:1 }}>
                        {m.team_a_score}–{m.team_b_score}
                      </span>
                      <span style={{ display:'inline-block', marginTop:7, padding:'2px 8px', borderRadius:3, background:resultBg, border:`1px solid ${resultColor}`, color:resultColor, fontSize:10, fontWeight:800, fontFamily:'var(--orion-font-mono)' }}>
                        {m.result === 'W' ? 'VICTOIRE' : m.result === 'D' ? 'NUL' : 'DÉFAITE'}
                      </span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--orion-text-dim)', marginTop:8, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        vs {m.team_b_name}
                      </span>
                      <span style={{ fontSize:10, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', marginTop:3 }}>
                        {new Date(m.match_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
                      </span>
                      <div style={{ display:'flex', gap:10, marginTop:10, paddingTop:8, borderTop:'1px solid var(--orion-line)', width:'100%', justifyContent:'center' }}>
                        <div>
                          <div style={{ fontSize:9, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)' }}>xG</div>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--orion-green)' }}>{m.xg_for.toFixed(1)}</div>
                        </div>
                        <div style={{ width:1, background:'var(--orion-line)' }} />
                        <div>
                          <div style={{ fontSize:9, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)' }}>ACT.</div>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--orion-text-dim)' }}>{m.events_count}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => onNavigate('stats')} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', background:'none', border:'none', borderTop:'1px solid var(--orion-line)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--orion-text-mute)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--orion-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--orion-text-mute)')}>
                Voir tous les matchs <ChevronRight size={14} />
              </button>
            </div>

            {/* Tendances */}
            {trends.length > 0 && (
              <div className="o-card">
                <div className="o-card__header"><span className="o-eyebrow">Tendances</span></div>
                <div style={{ padding:'8px 0' }}>
                  {trends.map((a, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i < trends.length-1 ? '1px solid var(--orion-line)' : 'none' }}>
                      {a.type === 'good'
                        ? <CheckCircle size={14} style={{ color:'var(--orion-green)', flexShrink:0 }} />
                        : <AlertTriangle size={14} style={{ color:'var(--orion-red)', flexShrink:0 }} />}
                      <span style={{ fontSize:13, color:'var(--orion-text-dim)' }}>{a.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton codage rapide */}
            <button onClick={() => onNavigate('live')} className="o-btn o-btn--primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14, borderRadius:6 }}>
              <Radio size={16} /> Démarrer un codage live
            </button>

          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .desktop-nav { display: none; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
