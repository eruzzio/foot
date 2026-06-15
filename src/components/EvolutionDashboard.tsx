import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Trophy, Target, Zap, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';

interface EvolutionDashboardProps { onBack: () => void; }

interface MatchStats {
  match: Match;
  goalsFor: number;
  goalsAgainst: number;
  teamATotal: number;
  teamBTotal: number;
  teamASuccessRate: number;
  xgFor: number;
}

export default function EvolutionDashboard({ onBack }: EvolutionDashboardProps) {
  const [matchesStats, setMatchesStats] = useState<MatchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'goals' | 'actions' | 'success' | 'xg'>('goals');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: matches } = await supabase
      .from('matches').select('*').eq('status', 'completed').eq('user_id', user.id)
      .order('match_date', { ascending: true });

    if (!matches?.length) { setLoading(false); return; }

    const stats: MatchStats[] = await Promise.all(matches.map(async m => {
      const { data: evts } = await supabase.from('match_events').select('*, event_type:event_types(*)').eq('match_id', m.id);
      const e = (evts || []) as MatchEventWithDetails[];
      const teamA = e.filter(ev => ev.team === 'A');
      const teamB = e.filter(ev => ev.team === 'B');
      const successA = teamA.filter(ev => ev.outcome === 'success').length;
      // xG simple basé sur tirs
      const shots = teamA.filter(ev => (ev.event_type?.name || ev.label || '').toLowerCase().includes('tir'));
      const xg = shots.length * 0.12;
      return {
        match: m,
        goalsFor: m.team_a_score,
        goalsAgainst: m.team_b_score,
        teamATotal: teamA.length,
        teamBTotal: teamB.length,
        teamASuccessRate: teamA.length > 0 ? Math.round((successA / teamA.length) * 100) : 0,
        xgFor: parseFloat(xg.toFixed(1)),
      };
    }));

    setMatchesStats(stats);
    setLoading(false);
  };

  const avg = useMemo(() => {
    if (!matchesStats.length) return null;
    const n = matchesStats.length;
    return {
      goalsFor: (matchesStats.reduce((s, m) => s + m.goalsFor, 0) / n).toFixed(1),
      goalsAgainst: (matchesStats.reduce((s, m) => s + m.goalsAgainst, 0) / n).toFixed(1),
      actions: Math.round(matchesStats.reduce((s, m) => s + m.teamATotal, 0) / n),
      successRate: Math.round(matchesStats.reduce((s, m) => s + m.teamASuccessRate, 0) / n),
      wins: matchesStats.filter(m => m.goalsFor > m.goalsAgainst).length,
      draws: matchesStats.filter(m => m.goalsFor === m.goalsAgainst).length,
      losses: matchesStats.filter(m => m.goalsFor < m.goalsAgainst).length,
    };
  }, [matchesStats]);

  // Données par métrique
  const metricData = useMemo(() => {
    const map = {
      goals:   { label:'Buts marqués',      color:'var(--orion-green)',  values: matchesStats.map(m => m.goalsFor), compare: matchesStats.map(m => m.goalsAgainst), compareLabel:'Encaissés', compareColor:'var(--orion-red)' },
      actions: { label:'Actions codées',    color:'var(--orion-accent)', values: matchesStats.map(m => m.teamATotal), compare: null, compareLabel:'', compareColor:'' },
      success: { label:'Taux de réussite %',color:'var(--orion-amber)',  values: matchesStats.map(m => m.teamASuccessRate), compare: null, compareLabel:'', compareColor:'' },
      xg:      { label:'xG estimé',         color:'var(--orion-accent)', values: matchesStats.map(m => m.xgFor), compare: null, compareLabel:'', compareColor:'' },
    };
    return map[activeMetric];
  }, [activeMetric, matchesStats]);

  // SVG Courbe
  const SVGChart = ({ values, compareValues, color, compareColor }: { values: number[]; compareValues?: number[] | null; color: string; compareColor?: string }) => {
    if (!values.length) return null;
    const W = 800, H = 200, PAD = 32;
    const allVals = [...values, ...(compareValues || [])];
    const maxV = Math.max(...allVals, 1);
    const minV = 0;
    const range = maxV - minV || 1;

    const toX = (i: number) => PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
    const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);

    const pointsMain = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    const pointsCompare = compareValues?.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

    // Zone sous la courbe principale
    const areaPath = `M${toX(0)},${H - PAD} ${values.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ')} L${toX(values.length - 1)},${H - PAD} Z`;

    // Grilles
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(r => {
      const v = minV + r * range;
      const y = toY(v);
      return { y, label: activeMetric === 'success' ? `${Math.round(v)}%` : v.toFixed(activeMetric === 'xg' ? 1 : 0) };
    });

    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow:'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grille */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD} y1={g.y} x2={W - PAD} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD - 6} y={g.y + 4} textAnchor="end" fontSize="10" fill="var(--orion-text-faint)" fontFamily="'JetBrains Mono', monospace">{g.label}</text>
          </g>
        ))}
        {/* Axe X */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--orion-line-strong)" strokeWidth="1.5" />
        {/* Zone dégradée */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Courbe compare */}
        {pointsCompare && compareColor && (
          <polyline fill="none" stroke={compareColor} strokeWidth="2" strokeDasharray="6,4" opacity="0.7" points={pointsCompare} />
        )}
        {/* Courbe principale */}
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={pointsMain} strokeLinejoin="round" />
        {/* Points + labels */}
        {values.map((v, i) => {
          const x = toX(i), y = toY(v);
          const result = matchesStats[i]?.goalsFor > matchesStats[i]?.goalsAgainst ? 'W' : matchesStats[i]?.goalsFor === matchesStats[i]?.goalsAgainst ? 'D' : 'L';
          const rc = result === 'W' ? 'var(--orion-green)' : result === 'D' ? 'var(--orion-amber)' : 'var(--orion-red)';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill={color} stroke="var(--orion-bg)" strokeWidth="2" />
              <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="'JetBrains Mono', monospace">
                {activeMetric === 'success' ? `${v}%` : activeMetric === 'xg' ? v.toFixed(1) : v}
              </text>
              {/* Date sous l'axe */}
              <text x={x} y={H - PAD + 16} textAnchor="middle" fontSize="9" fill="var(--orion-text-faint)" fontFamily="'JetBrains Mono', monospace">
                {new Date(matchesStats[i].match.match_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' })}
              </text>
              {/* Badge résultat */}
              <rect x={x - 8} y={H - PAD + 22} width={16} height={12} rx="2" fill={rc} opacity="0.15" />
              <text x={x} y={H - PAD + 32} textAnchor="middle" fontSize="9" fontWeight="800" fill={rc} fontFamily="'JetBrains Mono', monospace">{result}</text>
            </g>
          );
        })}
        {/* Points compare */}
        {compareValues && compareColor && compareValues.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill={compareColor} stroke="var(--orion-bg)" strokeWidth="1.5" opacity="0.8" />
        ))}
      </svg>
    );
  };

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--orion-text-mute)' }}>Chargement…</div>
  );

  if (!matchesStats.length) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <TrendingUp size={40} style={{ color:'var(--orion-text-faint)', margin:'0 auto 16px' }} />
      <p style={{ color:'var(--orion-text-dim)', fontSize:14 }}>Aucun match complété — code ton premier match pour voir l'évolution.</p>
    </div>
  );

  return (
    <div style={{ padding:'24px 20px', maxWidth:960, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <TrendingUp size={18} style={{ color:'var(--orion-accent)' }} />
          <span style={{ fontSize:16, fontWeight:700, color:'var(--orion-text)' }}>Évolution</span>
          <span style={{ fontSize:11, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', background:'var(--orion-surface-2)', padding:'2px 8px', borderRadius:10 }}>
            {matchesStats.length} match{matchesStats.length > 1 ? 's' : ''}
          </span>
        </div>
        <p style={{ fontSize:12, color:'var(--orion-text-mute)' }}>Progression de ton équipe sur la saison</p>
      </div>

      {/* KPIs */}
      {avg && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8, marginBottom:16 }}>
          {[
            { icon:Trophy,   label:'Bilan',          value:`${avg.wins}V ${avg.draws}N ${avg.losses}D`, color:'var(--orion-accent)' },
            { icon:Target,   label:'Moy. buts',       value:avg.goalsFor,         color:'var(--orion-green)' },
            { icon:Target,   label:'Moy. encaissés',  value:avg.goalsAgainst,     color:'var(--orion-red)' },
            { icon:Activity, label:'Moy. actions',    value:avg.actions,          color:'var(--orion-amber)' },
            { icon:Zap,      label:'Taux réussite',   value:`${avg.successRate}%`, color:'var(--orion-accent)' },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Icon size={13} style={{ color:k.color }} />
                  <span style={{ fontSize:10, fontFamily:'var(--orion-font-mono)', fontWeight:600, color:'var(--orion-text-mute)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'var(--orion-font-mono)' }}>{k.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sélecteur métrique */}
      <div className="o-card" style={{ marginBottom:12 }}>
        <div className="o-card__header">
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {([
              { id:'goals',   label:'Buts' },
              { id:'actions', label:'Actions' },
              { id:'success', label:'Réussite %' },
              { id:'xg',      label:'xG' },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setActiveMetric(m.id)}
                className={`o-btn o-btn--sm ${activeMetric === m.id ? 'o-btn--primary' : 'o-btn--ghost'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {activeMetric === 'goals' && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:12, height:3, background:'var(--orion-green)', display:'inline-block', borderRadius:2 }} />
                <span style={{ fontSize:11, color:'var(--orion-text-mute)' }}>Marqués</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:12, height:3, background:'var(--orion-red)', display:'inline-block', borderRadius:2, opacity:0.7 }} />
                <span style={{ fontSize:11, color:'var(--orion-text-mute)' }}>Encaissés</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:'16px 20px 24px' }}>
          <SVGChart
            values={metricData.values}
            compareValues={metricData.compare}
            color={metricData.color}
            compareColor={metricData.compareColor}
          />
        </div>
      </div>

      {/* Tableau récap */}
      <div className="o-card" style={{ overflowX:'auto' }}>
        <div className="o-card__header">
          <span className="o-eyebrow">Détail par match</span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
          <thead>
            <tr style={{ background:'var(--orion-surface-2)', borderBottom:'1.5px solid var(--orion-line-strong)' }}>
              {['Date', 'Adversaire', 'Score', 'Actions', 'Réussite', 'Résultat'].map(h => (
                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...matchesStats].reverse().map((s, i) => {
              const result = s.goalsFor > s.goalsAgainst ? 'W' : s.goalsFor === s.goalsAgainst ? 'D' : 'L';
              const rc = result === 'W' ? 'var(--orion-green)' : result === 'D' ? 'var(--orion-amber)' : 'var(--orion-red)';
              const rbg = result === 'W' ? 'var(--orion-green-dim)' : result === 'D' ? 'var(--orion-amber-dim)' : 'var(--orion-red-dim)';
              return (
                <tr key={s.match.id} style={{ borderBottom: i < matchesStats.length - 1 ? '1px solid var(--orion-line)' : 'none' }}>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', whiteSpace:'nowrap' }}>
                    {new Date(s.match.match_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'var(--orion-text)' }}>{s.match.team_b_name}</td>
                  <td style={{ padding:'11px 14px', fontSize:14, fontWeight:800, color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)' }}>
                    {s.goalsFor}–{s.goalsAgainst}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'var(--orion-accent)', fontFamily:'var(--orion-font-mono)' }}>{s.teamATotal}</td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'var(--orion-amber)', fontFamily:'var(--orion-font-mono)' }}>{s.teamASuccessRate}%</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px', borderRadius:3, fontSize:11, fontWeight:800, fontFamily:'var(--orion-font-mono)', background:rbg, color:rc, border:`1px solid ${rc}33` }}>
                      {result === 'W' ? 'VICTOIRE' : result === 'D' ? 'NUL' : 'DÉFAITE'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
