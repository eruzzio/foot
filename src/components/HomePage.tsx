import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, Video, LayoutGrid, ChevronRight, TrendingUp, AlertTriangle, CheckCircle, Activity, Zap, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import { calculateTeamXG } from '../utils/xg';
import { useT } from '../i18n/I18nContext';

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
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');

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
          result: m.team_a_score > m.team_b_score ? 'W' : m.team_a_score === m.team_b_score ? 'D' : 'L' as any,
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
    const alerts: { type: 'good' | 'bad'; msg: string }[] = [];
    const rG = r.reduce((s,m) => s + m.team_a_score, 0), oG = o.reduce((s,m) => s + m.team_a_score, 0);
    if (rG > oG + 1) alerts.push({ type: 'good', msg: `Efficacité offensive en hausse (+${rG - oG} buts sur les 3 derniers)` });
    if (rG < oG - 1) alerts.push({ type: 'bad', msg: `Efficacité offensive en baisse (−${oG - rG} buts sur les 3 derniers)` });
    const rGA = r.reduce((s,m) => s + m.team_b_score, 0), oGA = o.reduce((s,m) => s + m.team_b_score, 0);
    if (rGA < oGA - 1) alerts.push({ type: 'good', msg: `Défense plus solide (−${oGA - rGA} buts encaissés)` });
    if (rGA > oGA + 1) alerts.push({ type: 'bad', msg: `Défense en difficulté (+${rGA - oGA} buts encaissés)` });
    if (r.filter(m => m.result === 'W').length === 3) alerts.push({ type: 'good', msg: '3 victoires consécutives — excellente dynamique !' });
    if (r.filter(m => m.result === 'L').length === 3) alerts.push({ type: 'bad', msg: '3 défaites consécutives — attention à la dynamique' });
    return alerts.slice(0, 3);
  }, [matches]);

  const maxG = Math.max(1, ...matches.map(m => Math.max(m.team_a_score, m.team_b_score)));
  const maxXG = Math.max(0.5, ...matches.map(m => m.xg_for));
  const W = Math.max(matches.length * 80, 480);

  const NAV = [
    { id: 'live', icon: Video, label: t.nav.live },
    { id: 'panels', icon: LayoutGrid, label: t.nav.panels },
    { id: 'stats', icon: BarChart3, label: t.nav.stats },
    { id: 'evolution', icon: TrendingUp, label: 'Évolution' },
    { id: 'team', icon: Users, label: t.nav.team },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#111118' }}>
      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {clubLogo ? (
              <img src={clubLogo} alt="Club" className="w-9 h-9 rounded-lg object-contain" style={{ background: '#1a1a22', padding: '4px' }}
                onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#1a1a22', border: '1px solid #2a2a35' }}>
                <span style={{ fontSize: 14, color: '#f97316', fontWeight: 700 }}>O</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f2', letterSpacing: '0.15em' }}>ORION</div>
              {clubName && <div style={{ fontSize: 10, color: '#4a4a58', marginTop: 1 }}>{clubName}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userName && <span style={{ fontSize: 12, color: '#6b6b7a' }}>Bonjour, {userName}</span>}
            <button onClick={() => onNavigate('profile')}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#1a1a22', border: '1px solid #2a2a35' }}
            >
              <User size={14} style={{ color: '#6b6b7a' }} />
            </button>
          </div>
        </header>

        {/* NAV */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onNavigate(id)}
              className="flex items-center gap-2 transition-all flex-shrink-0"
              style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#9090a0', fontWeight: 500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLElement).style.color = '#f0f0f2'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a35'; (e.currentTarget as HTMLElement).style.color = '#9090a0'; }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24" style={{ color: '#4a4a58', fontSize: 13 }}>Chargement...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <Activity size={40} style={{ color: '#2a2a35', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b6b7a', fontSize: 14, marginBottom: 6 }}>Aucun match codé pour l'instant</p>
            <p style={{ color: '#4a4a58', fontSize: 12, marginBottom: 24 }}>Lance ton premier codage live pour voir apparaître ton tableau de bord</p>
            <button onClick={() => onNavigate('live')}
              className="transition-colors"
              style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Commencer un match →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Matchs', value: matches.length, sub: `${stats.wins}V ${stats.draws}N ${stats.losses}D`, accent: '#f97316' },
                { label: 'Buts', value: stats.goalsFor, sub: `${stats.goalsAgainst} encaissés`, accent: '#22c55e' },
                { label: 'xG', value: stats.xgFor.toFixed(1), sub: 'saison', accent: '#f97316' },
                { label: 'Actions', value: stats.events, sub: `${Math.round(stats.events / matches.length)}/match`, accent: '#a78bfa' },
              ].map(k => (
                <div key={k.label} style={{ background: '#1a1a22', borderRadius: 8, padding: '14px 16px', borderLeft: `2px solid ${k.accent}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f2' }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: '#f0f0f2', marginTop: 2, fontWeight: 500 }}>{k.label}</div>
                  <div style={{ fontSize: 10, color: '#4a4a58', marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* GRAPHIQUE */}
            <div style={{ background: '#1a1a22', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Évolution — {matches.length} matchs</span>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#4a4a58' }}>
                  <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f97316', marginRight: 4, verticalAlign: 'middle' }} />Buts</span>
                  <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />xG</span>
                  <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Encaissés</span>
                </div>
              </div>
              <div style={{ height: 160, position: 'relative' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${W} 200`} preserveAspectRatio="xMidYMid meet">
                  {[0,1,2,3].map(i => <line key={i} x1="0" y1={i*50} x2={W} y2={i*50} stroke="#2a2a35" strokeWidth="1"/>)}
                  <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6"
                    points={matches.map((m,i) => `${i*80+40},${185-(m.team_b_score/maxG)*160}`).join(' ')} />
                  <polyline fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.7"
                    points={matches.map((m,i) => `${i*80+40},${185-(m.xg_for/maxXG)*160}`).join(' ')} />
                  <polyline fill="none" stroke="#f97316" strokeWidth="2"
                    points={matches.map((m,i) => `${i*80+40},${185-(m.team_a_score/maxG)*160}`).join(' ')} />
                  {matches.map((m,i) => {
                    const x = i*80+40, y = 185-(m.team_a_score/maxG)*160;
                    const rc = m.result==='W'?'#22c55e':m.result==='D'?'#f59e0b':'#ef4444';
                    return (
                      <g key={m.id}>
                        <circle cx={x} cy={y} r="4" fill={rc} stroke="#111118" strokeWidth="1.5"/>
                        <text x={x} y="198" textAnchor="middle" fontSize="9" fill="#4a4a58">
                          {new Date(m.match_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
                        </text>
                        <text x={x} y={y-9} textAnchor="middle" fontSize="9" fill={rc} fontWeight="600">
                          {m.team_a_score}-{m.team_b_score}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {matches.slice(-5).reverse().map(m => (
                  <button key={m.id} onClick={() => onNavigate(`stats-${m.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 5, background: m.result==='W'?'#15803d':m.result==='D'?'#92400e':'#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>{m.result}</span>
                    <span style={{ fontSize: 11, color: '#4a4a58' }}>{m.team_b_name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TENDANCES */}
            {trends.length > 0 && (
              <div style={{ background: '#1a1a22', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={14} style={{ color: '#f97316' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tendances</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trends.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 7, background: a.type==='good'?'rgba(34,197,94,0.07)':'rgba(239,68,68,0.07)', border: `0.5px solid ${a.type==='good'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}` }}>
                      {a.type==='good' ? <CheckCircle size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />}
                      <span style={{ fontSize: 12, color: a.type==='good'?'#86efac':'#fca5a5' }}>{a.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DERNIERS MATCHS */}
            <div style={{ background: '#1a1a22', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Derniers matchs</span>
                <button onClick={() => onNavigate('stats')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#f97316' }}>
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matches.slice(-3).reverse().map(m => (
                  <button key={m.id} onClick={() => onNavigate(`stats-${m.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#111118', borderRadius: 7, border: '0.5px solid #2a2a35', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a48')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a35')}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: m.result==='W'?'#15803d':m.result==='D'?'#92400e':'#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{m.result}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f2' }}>
                        {m.team_a_name} <span style={{ color: '#f97316' }}>{m.team_a_score} – {m.team_b_score}</span> {m.team_b_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#4a4a58', marginTop: 2 }}>
                        {new Date(m.match_date).toLocaleDateString('fr-FR')} · {m.events_count} actions · xG {m.xg_for.toFixed(1)}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#2a2a35', flexShrink: 0 }} />
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
