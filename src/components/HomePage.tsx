import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import { calculateTeamXG } from '../utils/xg';
import { useT } from '../i18n/I18nContext';
import { OrionLogo, KPI, TopBar, Result, Eyebrow } from './orion/Orion';

interface HomePageProps { onNavigate: (page: string) => void; }

interface MatchSummary {
  id: string; team_a_name: string; team_b_name: string;
  team_a_score: number; team_b_score: number; match_date: string;
  events_count: number; xg_for: number; xg_against: number;
  result: 'W' | 'D' | 'L';
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useT();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [_clubLogo, setClubLogo] = useState<string | null>(null);
  const [_clubName, setClubName] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const meta = user.user_metadata || {};
    if (meta.first_name) setUserName(meta.first_name);
    if (meta.club_name) setClubName(meta.club_name);
    if (meta.club_id) {
      const { data: club } = await supabase.from('clubs').select('logo_url, name').eq('id', meta.club_id).single();
      if (club?.logo_url) setClubLogo(club.logo_url);
      if (club?.name) setClubName(club.name);
    }

    await createDefaultFootballPanel(user.id);

    const { data: matchesData } = await supabase
      .from('matches').select('*').eq('status', 'completed')
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

  const maxG = Math.max(1, ...matches.map(m=>Math.max(m.team_a_score,m.team_b_score)));
  const maxXG = Math.max(0.5, ...matches.map(m=>m.xg_for));
  const W = Math.max(matches.length*80, 480);

  const NAV_TABS = [
    { id:'live', label:t.nav.live },
    { id:'panels', label:t.nav.panels },
    { id:'stats', label:t.nav.stats },
    { id:'evolution', label:'Évolution' },
    { id:'team', label:t.nav.team },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)' }}>

      {/* TOP BAR */}
      <TopBar
        user={userName || undefined}
        tabs={NAV_TABS}
        activeTab={undefined}
        onTabChange={onNavigate}
        right={
          <button
            className="o-avatar"
            onClick={() => onNavigate('profile')}
            style={{ cursor:'pointer', border:'1px solid var(--orion-line-strong)' }}
            title="Mon profil"
          >
            {(userName || '?')[0].toUpperCase()}
          </button>
        }
      />

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'40px 24px' }}>

        {loading ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'var(--orion-text-mute)', fontSize:13 }}>
            Chargement…
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <Activity size={40} style={{ color:'var(--orion-text-faint)', margin:'0 auto 20px' }} />
            <p style={{ color:'var(--orion-text-dim)', fontSize:14, marginBottom:8 }}>
              Aucun match codé pour l'instant
            </p>
            <p style={{ color:'var(--orion-text-mute)', fontSize:12, marginBottom:28 }}>
              Lance ton premier codage live pour voir ton tableau de bord
            </p>
            <button className="o-btn o-btn--primary" onClick={() => onNavigate('live')}>
              Commencer un match →
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>

            {/* KPIs — border-y strip */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1.5px solid var(--orion-line-strong)', borderBottom:'1.5px solid var(--orion-line-strong)', background:'var(--orion-surface)' }}>
              <KPI label="Matchs" value={matches.length} sub={`${stats.wins}V · ${stats.draws}N · ${stats.losses}D`} />
              <div style={{ borderLeft:'1.5px solid var(--orion-line-strong)' }}>
                <KPI label="Buts" value={stats.goalsFor} sub={`${stats.goalsAgainst} encaissés`} accent />
              </div>
              <div style={{ borderLeft:'1.5px solid var(--orion-line-strong)' }}>
                <KPI label="xG saison" value={stats.xgFor.toFixed(1)} sub="expected goals" />
              </div>
              <div style={{ borderLeft:'1.5px solid var(--orion-line-strong)' }}>
                <KPI label="Actions codées" value={stats.events} sub={`${Math.round(stats.events/matches.length)}/match`} />
              </div>
            </div>

            {/* GRAPHIQUE */}
            <div className="o-card" style={{ padding:'28px 24px', marginTop:2 }}>
              <div className="o-card__header">
                <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
                  <Eyebrow>Évolution</Eyebrow>
                  <span style={{ fontSize:13 }}>{matches.length} derniers matchs</span>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:10, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', letterSpacing:'0.08em' }}>
                  <span><span style={{ display:'inline-block', width:4, height:4, background:'var(--orion-accent)', marginRight:5, verticalAlign:'middle' }} />BUTS</span>
                  <span><span style={{ display:'inline-block', width:4, height:4, background:'var(--orion-green)', marginRight:5, verticalAlign:'middle' }} />xG</span>
                  <span><span style={{ display:'inline-block', width:4, height:4, background:'var(--orion-red)', marginRight:5, verticalAlign:'middle', opacity:0.6 }} />ENCAISSÉS</span>
                </div>
              </div>
              <div style={{ height:160, marginTop:8 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${W} 200`} preserveAspectRatio="xMidYMid meet">
                  {[0,1,2,3].map(i=><line key={i} x1="0" y1={i*50} x2={W} y2={i*50} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
                  <polyline fill="none" stroke="var(--orion-red)" strokeWidth="1" strokeDasharray="4,3" opacity="0.5"
                    points={matches.map((m,i)=>`${i*80+40},${185-(m.team_b_score/maxG)*160}`).join(' ')} />
                  <polyline fill="none" stroke="var(--orion-green)" strokeWidth="1.5" opacity="0.7"
                    points={matches.map((m,i)=>`${i*80+40},${185-(m.xg_for/maxXG)*160}`).join(' ')} />
                  <polyline fill="none" stroke="var(--orion-accent)" strokeWidth="2"
                    points={matches.map((m,i)=>`${i*80+40},${185-(m.team_a_score/maxG)*160}`).join(' ')} />
                  {matches.map((m,i)=>{
                    const x=i*80+40, y=185-(m.team_a_score/maxG)*160;
                    return (
                      <g key={m.id}>
                        <circle cx={x} cy={y} r="3.5" fill="var(--orion-accent)" stroke="var(--orion-bg)" strokeWidth="1.5"/>
                        <text x={x} y="198" textAnchor="middle" fontSize="9" fill="var(--orion-text-mute)" fontFamily="var(--orion-font-mono)">
                          {new Date(m.match_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
                        </text>
                        <text x={x} y={y-10} textAnchor="middle" fontSize="10" fill="var(--orion-text)" fontFamily="var(--orion-font-mono)">
                          {m.team_a_score}-{m.team_b_score}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
                {matches.slice(-5).reverse().map(m=>(
                  <button key={m.id} onClick={()=>onNavigate(`stats-${m.id}`)}
                    style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    <Result r={m.result} />
                    <span style={{ fontSize:11, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)' }}>
                      {m.team_b_name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* TENDANCES */}
            {trends.length > 0 && (
              <div style={{ marginTop:2 }} className="o-card">
              <div className="o-card__header"><span className="o-eyebrow">Tendances</span></div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {trends.map((a,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:a.type==='good'?'rgba(123,224,168,0.06)':'rgba(255,138,138,0.06)', borderLeft:`2px solid ${a.type==='good'?'var(--orion-green)':'var(--orion-red)'}` }}>
                      {a.type==='good'
                        ? <CheckCircle size={13} style={{ color:'var(--orion-green)', flexShrink:0 }} />
                        : <AlertTriangle size={13} style={{ color:'var(--orion-red)', flexShrink:0 }} />}
                      <span style={{ fontSize:12, color:'var(--orion-text-dim)' }}>{a.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DERNIERS MATCHS */}
            <div className="o-card">
              <div className="o-card__header">
                <span className="o-eyebrow">Derniers matchs</span>
                <button className="o-btn o-btn--ghost o-btn--sm" onClick={()=>onNavigate('stats')} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  Voir tout <ChevronRight size={12}/>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {matches.slice(-3).reverse().map((m,i)=>(
                  <button key={m.id} onClick={()=>onNavigate(`stats-${m.id}`)}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:i<2?'1px solid var(--orion-line)':'none', background:'none', cursor:'pointer', textAlign:'left', width:'100%' }}>
                    <Result r={m.result} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--orion-text)' }}>
                        {m.team_a_name} <span className="o-num" style={{ color:'var(--orion-accent)' }}>{m.team_a_score} – {m.team_b_score}</span> {m.team_b_name}
                      </div>
                      <div className="o-num" style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:3 }}>
                        {new Date(m.match_date).toLocaleDateString('fr-FR')} · {m.events_count} actions · xG {m.xg_for.toFixed(1)}
                      </div>
                    </div>
                    <ChevronRight size={13} style={{ color:'var(--orion-text-faint)', flexShrink:0 }} />
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
