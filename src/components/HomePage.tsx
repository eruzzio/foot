import { useState, useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle, Menu, X, ChevronRight, Radio, PanelLeft, BarChart2, TrendingUp, Users, User, Shield, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import { calculateTeamXG } from '../utils/xg';
import { OrionLogo, OrionIcon, Result } from './orion/Orion';

interface HomePageProps { onNavigate: (page: string) => void; isAdmin?: boolean; }
interface MatchSummary {
  id: string; team_a_name: string; team_b_name: string;
  team_a_score: number; team_b_score: number; match_date: string;
  events_count: number; xg_for: number; xg_against: number;
  result: 'W' | 'D' | 'L';
}

const NAV_ITEMS = [
  { id: 'live',      label: 'Codage Live',    icon: Radio },
  { id: 'video',     label: 'Codage Vidéo',   icon: Film },
  { id: 'panels',    label: 'Mes Panneaux',   icon: PanelLeft },
  { id: 'stats',     label: 'Mes Stats',      icon: BarChart2 },
  { id: 'evolution', label: 'Évolution',      icon: TrendingUp },
  { id: 'team',      label: 'Mes Équipes',    icon: Users },
  { id: 'profile',   label: 'Mon Profil',     icon: User },
];

export default function HomePage({ onNavigate, isAdmin = false, isPro = false }: HomePageProps & { isPro?: boolean }) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    // Timeout 10s si Supabase ne répond pas
    const timeout = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 10000);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { clearTimeout(timeout); setLoading(false); return; }
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
    } catch {
      setLoadError(true);
      setLoading(false);
    } finally {
      clearTimeout(timeout);
    }
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
    if (rG < oG-1) alerts.push({ type:'bad', msg:`Efficacité offensive en baisse` });
    const rGA = r.reduce((s,m)=>s+m.team_b_score,0), oGA = o.reduce((s,m)=>s+m.team_b_score,0);
    if (rGA < oGA-1) alerts.push({ type:'good', msg:`Défense plus solide` });
    if (rGA > oGA+1) alerts.push({ type:'bad', msg:`Défense en difficulté` });
    return alerts.slice(0, 3);
  }, [matches]);

  // Sidebar commune (mobile drawer + desktop fixe)
  const SidebarContent = () => (
    <>
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--orion-line)', display:'flex', alignItems:'center', gap:10 }}>
        <OrionIcon size={30} />
        <span style={{ fontSize:17, fontWeight:800, letterSpacing:'0.08em', color:'var(--orion-text)' }}>ORION</span>
        {isPro && isAdmin && (
          <span style={{ fontSize:9, fontWeight:800, color:'var(--orion-accent)', background:'var(--orion-accent-dim)', border:'1px solid var(--orion-accent-line)', padding:'2px 6px', borderRadius:3, fontFamily:'var(--orion-font-mono)', letterSpacing:'0.1em' }}>PRO</span>
        )}
        {!isAdmin && (
          <span style={{ fontSize:9, fontWeight:800, color:'#f97316', background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)', padding:'2px 6px', borderRadius:3, fontFamily:'var(--orion-font-mono)', letterSpacing:'0.1em' }}>BETA</span>
        )}
      </div>
      {userName && (
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--orion-line)' }}>
          <div style={{ fontSize:10, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Connecté</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginTop:3 }}>{userName}</div>
        </div>
      )}
      <nav style={{ flex:1, padding:'8px 0' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => { onNavigate(item.id); setMenuOpen(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Icon size={17} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:600, color:'var(--orion-text)' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--orion-line)', fontSize:10, color:'var(--orion-text-faint)', fontFamily:'var(--orion-font-mono)' }}>
        ORION · Sports Analytics
      </div>
    </>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', color:'var(--orion-text)', display:'flex' }}>

      {/* SIDEBAR DESKTOP — cachée sur mobile */}
      <aside className="desktop-sidebar orion" style={{ width:220, flexShrink:0, background:'var(--orion-surface)', borderRight:'1.5px solid var(--orion-line-strong)', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', overflow:'hidden' }}>
        <SidebarContent />
      </aside>

      {/* DRAWER MOBILE */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.7)', zIndex:100, backdropFilter:'blur(4px)' }} />
          <div className="orion" style={{ position:'fixed', top:0, left:0, bottom:0, width:260, background:'var(--orion-surface)', borderRight:'1.5px solid var(--orion-line-strong)', zIndex:101, display:'flex', flexDirection:'column', animation:'slideIn .2s ease' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'14px 16px', borderBottom:'1px solid var(--orion-line)' }}>
              <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* CONTENU PRINCIPAL */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>

        {/* TOPBAR MOBILE */}
        <header className="mobile-topbar" style={{ display:'flex', alignItems:'center', height:52, padding:'0 16px', background:'var(--orion-surface)', borderBottom:'1.5px solid var(--orion-line-strong)', position:'sticky', top:0, zIndex:50, gap:12 }}>
          <button onClick={() => setMenuOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-dim)', display:'flex', padding:4 }}>
            <Menu size={22} />
          </button>
          <OrionLogo height={14} />
          <span style={{ flex:1 }} />
          <button onClick={() => onNavigate('profile')} className="o-avatar" style={{ cursor:'pointer' }}>
            {(userName || '?')[0].toUpperCase()}
          </button>
        </header>

        {/* CONTENU */}
        <div style={{ maxWidth:960, margin:'0 auto', padding:'20px 16px', width:'100%' }}>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ width:32, height:32, border:'3px solid var(--orion-line)', borderTopColor:'var(--orion-accent)', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }} />
              <div style={{ fontSize:13, color:'var(--orion-text-mute)' }}>Chargement…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : loadError ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:32, marginBottom:16 }}>⚠️</div>
              <h3 style={{ fontSize:16, fontWeight:700, color:'var(--orion-text)', marginBottom:8 }}>Problème de connexion</h3>
              <p style={{ fontSize:13, color:'var(--orion-text-mute)', marginBottom:24, lineHeight:1.5 }}>
                Impossible de se connecter au serveur.<br />Vérifie ta connexion internet et réessaie.
              </p>
              <button onClick={() => { setLoadError(false); setLoading(true); init(); }} className="o-btn o-btn--primary">
                Réessayer
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Bienvenue */}
              <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, padding:'32px 24px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⚽</div>
                <h2 style={{ fontSize:20, fontWeight:800, color:'var(--orion-text)', marginBottom:8 }}>
                  Bienvenue sur ORION{userName ? `, ${userName}` : ''} !
                </h2>
                <p style={{ fontSize:13, color:'var(--orion-text-mute)', maxWidth:400, margin:'0 auto 24px', lineHeight:1.6 }}>
                  Ton outil de codage et d'analyse vidéo pour le football. Suis ces 3 étapes pour démarrer.
                </p>

                {/* 3 étapes */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:8, marginBottom:28, textAlign:'left' }}>
                  {[
                    { n:'1', icon:'🎛️', title:'Crée ton panneau', desc:'Configure les actions que tu veux coder (tirs, passes, récupérations...)', action:'panels', btn:'Créer un panneau' },
                    { n:'2', icon:'🎬', title:'Lance un codage live', desc:'Ouvre un match et tague les événements en temps réel ou depuis une vidéo', action:'live', btn:'Démarrer un match' },
                    { n:'3', icon:'📊', title:'Analyse les stats', desc:'Visualise les heatmaps, exports PDF, stats par type d\'action', action:null, btn:null },
                  ].map((step, i) => (
                    <div key={i} style={{ background:'var(--orion-surface-2)', border:'1px solid var(--orion-line)', borderRadius:6, padding:'16px 18px', position:'relative' }}>
                      <div style={{ position:'absolute', top:12, right:12, width:22, height:22, borderRadius:'50%', background: i < 2 ? 'var(--orion-accent-dim)' : 'var(--orion-surface-3)', border:`1px solid ${i < 2 ? 'var(--orion-accent-line)' : 'var(--orion-line)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i < 2 ? 'var(--orion-accent)' : 'var(--orion-text-faint)' }}>{step.n}</div>
                      <div style={{ fontSize:22, marginBottom:10 }}>{step.icon}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--orion-text)', marginBottom:6 }}>{step.title}</div>
                      <div style={{ fontSize:12, color:'var(--orion-text-mute)', lineHeight:1.5, marginBottom: step.btn ? 14 : 0 }}>{step.desc}</div>
                      {step.btn && step.action && (
                        <button onClick={() => onNavigate(step.action!)} className="o-btn o-btn--primary o-btn--sm" style={{ width:'100%', justifyContent:'center' }}>
                          {step.btn} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize:11, color:'var(--orion-text-faint)', fontFamily:'var(--orion-font-mono)' }}>
                  Un panneau par défaut "Football Pro" est déjà disponible — tu peux l'utiliser directement
                </p>
              </div>

              {/* Raccourci rapide */}
              <button onClick={() => onNavigate('live')} className="o-btn o-btn--primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14, borderRadius:6 }}>
                <Radio size={16} /> Démarrer mon premier match maintenant
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Hero sombre */}
              <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'28px 24px 24px', color:'#fff', boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
                <div style={{ position:'absolute', top:0, right:0, width:360, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
                <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
                  <div>
                    <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:8 }}>
                      Tableau de bord · Saison
                    </div>
                    <h1 style={{ margin:0, fontSize:26, fontWeight:800, letterSpacing:'-0.02em', color:'#fff' }}>
                      {userName ? `Salut, ${userName}` : 'Salut !'}
                    </h1>
                  </div>
                  <button onClick={() => onNavigate('live')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 20px', background:'var(--orion-accent)', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0, boxShadow:'0 4px 14px rgba(61,128,224,0.4)' }}>
                    <Radio size={15} /> Démarrer un codage live
                  </button>
                </div>

                {/* KPIs dans le hero */}
                <div style={{ position:'relative', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:0, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, overflow:'hidden' }}>
                  {[
                    { label:'Matchs', value: matches.length, sub:`${stats.wins}V · ${stats.draws}N · ${stats.losses}D` },
                    { label:'Buts', value: stats.goalsFor, sub:`${stats.goalsAgainst} encaissés`, accent: '#3d80e0' },
                    { label:'xG Saison', value: stats.xgFor.toFixed(1), sub:'expected goals' },
                  ].map((k, i, arr) => (
                    <div key={i} style={{ padding:'16px 18px', borderRight: i < arr.length-1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                      <div style={{ fontSize:10, fontFamily:'var(--orion-font-mono)', fontWeight:600, color:'#8aa0bd', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>{k.label}</div>
                      <div style={{ fontSize:30, fontWeight:800, lineHeight:1, color: k.accent || '#fff', letterSpacing:'-0.02em' }}>{k.value}</div>
                      <div style={{ fontSize:11, color:'#6b8199', marginTop:5 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match cards */}
              <div className="o-card">
                <div className="o-card__header">
                  <span className="o-eyebrow">Derniers matchs</span>
                  <span style={{ fontSize:12, color:'var(--orion-text-mute)' }}>{matches.length} codés</span>
                </div>
                <div style={{ display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch' as any }}>
                  {matches.slice(-4).map((m, i) => {
                    const resultColor = m.result === 'W' ? 'var(--orion-green)' : m.result === 'D' ? 'var(--orion-amber)' : 'var(--orion-red)';
                    const resultBg = m.result === 'W' ? 'var(--orion-green-dim)' : m.result === 'D' ? 'var(--orion-amber-dim)' : 'var(--orion-red-dim)';
                    return (
                      <button key={m.id} onClick={() => onNavigate(`stats-${m.id}`)}
                        style={{ minWidth:140, flex:'1 0 auto', display:'flex', flexDirection:'column', alignItems:'center', background:'none', border:'none', borderRight: i < 3 ? '1px solid var(--orion-line)' : 'none', cursor:'pointer', padding:'16px 10px', textAlign:'center', borderTop:`3px solid ${resultColor}`, transition:'background .12s' }}
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
                  <div style={{ padding:'4px 0' }}>
                    {trends.map((a, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom: i < trends.length-1 ? '1px solid var(--orion-line)' : 'none' }}>
                        {a.type === 'good'
                          ? <CheckCircle size={14} style={{ color:'var(--orion-green)', flexShrink:0 }} />
                          : <AlertTriangle size={14} style={{ color:'var(--orion-red)', flexShrink:0 }} />}
                        <span style={{ fontSize:13, color:'var(--orion-text-dim)' }}>{a.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .desktop-sidebar { display: none !important; }
        .mobile-topbar { display: flex !important; }
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
