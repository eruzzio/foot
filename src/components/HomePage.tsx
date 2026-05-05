import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, Video, LayoutGrid, ChevronRight, Star, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity, Target, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import OrionLogo from './OrionLogo';
import { calculateTeamXG } from '../utils/xg';
import { useT } from '../i18n/I18nContext';
import { calculateTeamXG } from '../utils/xg';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

interface MatchSummary {
  id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  match_date: string;
  events_count: number;
  xg_for: number;
  xg_against: number;
  result: 'W' | 'D' | 'L';
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useT();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [userName, setUserName] = useState('');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubColors, setClubColors] = useState({ primary: '#22c55e', secondary: '#f97316' });

  useEffect(() => {
    initializeUserData();
  }, []);

  const initializeUserData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Charger profil utilisateur
    const meta = userData.user.user_metadata || {};
    if (meta.first_name) setUserName(meta.first_name);
    if (meta.club_logo) setClubLogo(meta.club_logo);
    if (meta.club_id) {
      const { data: clubData } = await supabase.from('clubs').select('color_primary, color_secondary, logo_url, name').eq('id', meta.club_id).single();
      if (clubData) {
        setClubColors({ primary: clubData.color_primary, secondary: clubData.color_secondary });
        if (clubData.logo_url) setClubLogo(clubData.logo_url);
        if (clubData.name && !meta.first_name) setUserName(clubData.name);
      }
    }

    await createDefaultFootballPanel(userData.user.id);

    // Charger les 8 derniers matchs complétés
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .order('match_date', { ascending: false })
      .limit(8);

    if (matchesData && matchesData.length > 0) {
      // Charger les événements pour chaque match
      const matchSummaries: MatchSummary[] = await Promise.all(matchesData.map(async (m) => {
        const { data: events } = await supabase
          .from('match_events')
          .select('*, event_type:event_types(*)')
          .eq('match_id', m.id);

        const evts = events || [];
        const xgFor = calculateTeamXG(evts as any, 'A');
        const xgAgainst = calculateTeamXG(evts as any, 'B');
        const result: 'W' | 'D' | 'L' = m.team_a_score > m.team_b_score ? 'W' : m.team_a_score === m.team_b_score ? 'D' : 'L';

        return {
          id: m.id,
          team_a_name: m.team_a_name,
          team_b_name: m.team_b_name,
          team_a_score: m.team_a_score,
          team_b_score: m.team_b_score,
          match_date: m.match_date,
          events_count: evts.length,
          xg_for: xgFor,
          xg_against: xgAgainst,
          result,
        };
      }));

      setMatches(matchSummaries.reverse()); // chronologique pour le graphique
      if (matchSummaries[0]) setTeamName(matchSummaries[0].team_a_name);
    }
    setLoading(false);
  };

  // Stats saison
  const seasonStats = useMemo(() => {
    const wins = matches.filter(m => m.result === 'W').length;
    const draws = matches.filter(m => m.result === 'D').length;
    const losses = matches.filter(m => m.result === 'L').length;
    const goalsFor = matches.reduce((s, m) => s + m.team_a_score, 0);
    const goalsAgainst = matches.reduce((s, m) => s + m.team_b_score, 0);
    const totalXGFor = matches.reduce((s, m) => s + m.xg_for, 0);
    const totalXGAgainst = matches.reduce((s, m) => s + m.xg_against, 0);
    const totalEvents = matches.reduce((s, m) => s + m.events_count, 0);
    return { wins, draws, losses, goalsFor, goalsAgainst, totalXGFor, totalXGAgainst, totalEvents };
  }, [matches]);

  // Alertes tendances (3 derniers vs 3 précédents)
  const trends = useMemo(() => {
    if (matches.length < 4) return [];
    const recent = matches.slice(-3);
    const older = matches.slice(-6, -3);
    const alerts: { type: 'good' | 'bad' | 'neutral'; message: string }[] = [];

    // Buts marqués
    const recentGoals = recent.reduce((s, m) => s + m.team_a_score, 0);
    const olderGoals = older.reduce((s, m) => s + m.team_a_score, 0);
    if (recentGoals > olderGoals + 1) alerts.push({ type: 'good', message: `Efficacité offensive en hausse (+${recentGoals - olderGoals} buts sur les 3 derniers matchs)` });
    if (recentGoals < olderGoals - 1) alerts.push({ type: 'bad', message: `Efficacité offensive en baisse (−${olderGoals - recentGoals} buts sur les 3 derniers matchs)` });

    // Buts encaissés
    const recentGA = recent.reduce((s, m) => s + m.team_b_score, 0);
    const olderGA = older.reduce((s, m) => s + m.team_b_score, 0);
    if (recentGA < olderGA - 1) alerts.push({ type: 'good', message: `Défense plus solide (−${olderGA - recentGA} buts encaissés sur les 3 derniers matchs)` });
    if (recentGA > olderGA + 1) alerts.push({ type: 'bad', message: `Défense en difficulté (+${recentGA - olderGA} buts encaissés sur les 3 derniers matchs)` });

    // xG
    const recentXG = recent.reduce((s, m) => s + m.xg_for, 0);
    const olderXG = older.reduce((s, m) => s + m.xg_for, 0);
    if (recentXG > olderXG + 0.5) alerts.push({ type: 'good', message: `Création de danger en progression (xG +${(recentXG - olderXG).toFixed(1)})` });

    // Résultats
    const recentWins = recent.filter(m => m.result === 'W').length;
    if (recentWins === 3) alerts.push({ type: 'good', message: `3 victoires consécutives — excellente dynamique !` });
    const recentLosses = recent.filter(m => m.result === 'L').length;
    if (recentLosses === 3) alerts.push({ type: 'bad', message: `3 défaites consécutives — attention à la dynamique` });

    return alerts.slice(0, 3);
  }, [matches]);

  // Graphique — max pour normaliser
  const maxGoals = Math.max(3, ...matches.map(m => Math.max(m.team_a_score, m.team_b_score)));
  const maxXG = Math.max(1, ...matches.map(m => Math.max(m.xg_for, m.xg_against)));

  const navItems = [
    { id: 'live', title: t.nav.live, icon: Video },
    { id: 'panels', title: t.nav.panels, icon: LayoutGrid },
    { id: 'stats', title: t.nav.stats, icon: BarChart3 },
    { id: 'evolution', title: t.nav.evolution, icon: TrendingUp },
    { id: 'team', title: t.nav.team, icon: Users },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0c0e14 0%, #0d1120 40%, #0c1028 70%, #0c0e14 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header compact */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {clubLogo ? (
              <img
                src={clubLogo}
                alt="Logo club"
                className="w-10 h-10 rounded-xl object-contain"
                style={{ background: clubColors.primary + '20', border: `1px solid ${clubColors.primary}40`, padding: '2px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <OrionLogo size={40} />
            )}
            <div>
              <h1 className="text-xl font-black tracking-widest text-white uppercase" style={{ letterSpacing: '0.2em' }}>ORION</h1>
              <p className="text-xs" style={{ color: '#5aaff7' }}>Sports Video Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userName && <div className="text-sm text-gray-300 font-medium hidden sm:block">👋 {userName}</div>}
            <button
              onClick={() => onNavigate('profile')}
              className="w-9 h-9 rounded-full bg-orange-primary/20 border border-orange-primary/40 flex items-center justify-center hover:bg-orange-primary/30 transition-colors"
              title="Mon profil"
            >
              <span className="text-sm font-bold text-orange-400">👤</span>
            </button>
          </div>
        </header>

        {/* Navigation rapide */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:scale-105 flex-shrink-0"
                style={{ background: 'rgba(47,141,228,0.12)', border: '1px solid rgba(47,141,228,0.2)', color: '#5aaff7' }}
              >
                <Icon size={15} />
                {item.title}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Chargement du tableau de bord...</div>
        ) : matches.length === 0 ? (
          /* Pas encore de matchs */
          <div className="text-center py-20">
            <Activity size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-2">Aucun match codé pour l'instant</p>
            <p className="text-gray-600 text-sm mb-6">Lance ton premier codage live pour voir apparaître ton tableau de bord</p>
            <button onClick={() => onNavigate('live')} className="px-6 py-3 bg-orange-primary hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors">
              Commencer un match →
            </button>
          </div>
        ) : (
          <div className="space-y-5">

            {/* KPIs saison */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t.dashboard.matches, value: matches.length, sub: `${seasonStats.wins}V ${seasonStats.draws}N ${seasonStats.losses}D`, color: '#5aaff7' },
                { label: t.dashboard.goalsFor, value: seasonStats.goalsFor, sub: `${seasonStats.goalsAgainst} encaissés`, color: '#22c55e' },
                { label: t.dashboard.xgTotal, value: seasonStats.totalXGFor.toFixed(1), sub: `${seasonStats.totalXGAgainst.toFixed(1)} contre`, color: '#f97316' },
                { label: t.dashboard.actions, value: seasonStats.totalEvents, sub: `${Math.round(seasonStats.totalEvents / matches.length)} / match`, color: '#a78bfa' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-dark-secondary border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{kpi.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Graphique évolution */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Évolution — {matches.length} derniers matchs</h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Buts</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> xG</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Encaissés</span>
                </div>
              </div>

              <div className="relative h-56">
                <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(matches.length * 80, 480)} 220`} preserveAspectRatio="xMidYMid meet">
                  {/* Grille */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="0" y1={i * 44} x2={Math.max(matches.length * 80, 480)} y2={i * 44} stroke="#1f2937" strokeWidth="1" />
                  ))}

                  {/* Ligne buts encaissés */}
                  <polyline
                    fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2"
                    points={matches.map((m, i) => `${i * 80 + 40},${190 - (m.team_b_score / maxGoals) * 170}`).join(' ')}
                  />

                  {/* Ligne xG */}
                  <polyline
                    fill="none" stroke="#f97316" strokeWidth="2"
                    points={matches.map((m, i) => `${i * 80 + 40},${190 - (m.xg_for / maxXG) * 170}`).join(' ')}
                  />

                  {/* Ligne buts */}
                  <polyline
                    fill="none" stroke="#22c55e" strokeWidth="2.5"
                    points={matches.map((m, i) => `${i * 80 + 40},${190 - (m.team_a_score / maxGoals) * 170}`).join(' ')}
                  />

                  {/* Points et résultats */}
                  {matches.map((m, i) => {
                    const x = i * 80 + 40;
                    const yGoal = 190 - (m.team_a_score / maxGoals) * 170;
                    const resultColor = m.result === 'W' ? '#22c55e' : m.result === 'D' ? '#f59e0b' : '#ef4444';
                    return (
                      <g key={m.id}>
                        <circle cx={x} cy={yGoal} r="5" fill={resultColor} stroke="white" strokeWidth="1.5" />
                        <text x={x} y="212" textAnchor="middle" fontSize="9" fill="#6b7280">
                          {new Date(m.match_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </text>
                        <text x={x} y="200" textAnchor="middle" fontSize="10" fill={resultColor} fontWeight="bold">
                          {m.team_a_score}-{m.team_b_score}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Légende résultats */}
              <div className="flex gap-3 mt-2 flex-wrap">
                {matches.slice(-5).reverse().map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 cursor-pointer" onClick={() => onNavigate(`stats-${m.id}`)}>
                    <span className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center ${m.result === 'W' ? 'bg-green-600' : m.result === 'D' ? 'bg-yellow-600' : 'bg-red-600'}`}>
                      {m.result}
                    </span>
                    <span className="text-xs text-gray-400">{m.team_b_name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertes tendances */}
            {trends.length > 0 && (
              <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-yellow-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tendances</h2>
                </div>
                <div className="space-y-2">
                  {trends.map((alert, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                      alert.type === 'good' ? 'bg-green-900/20 border border-green-800/40' :
                      alert.type === 'bad' ? 'bg-red-900/20 border border-red-800/40' :
                      'bg-gray-800/40 border border-gray-700/40'
                    }`}>
                      {alert.type === 'good' ? <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" /> :
                       alert.type === 'bad' ? <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" /> :
                       <Minus size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />}
                      <span className={`text-sm ${alert.type === 'good' ? 'text-green-300' : alert.type === 'bad' ? 'text-red-300' : 'text-gray-300'}`}>
                        {alert.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3 derniers matchs */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Derniers matchs</h2>
                <button onClick={() => onNavigate('stats')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {matches.slice(-3).reverse().map(m => (
                  <button key={m.id} onClick={() => onNavigate(`stats-${m.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-dark-tertiary hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                  >
                    <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center flex-shrink-0 ${m.result === 'W' ? 'bg-green-600' : m.result === 'D' ? 'bg-yellow-600' : 'bg-red-600'}`}>
                      {m.result}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{m.team_a_name} <span className="text-orange-400">{m.team_a_score} - {m.team_b_score}</span> {m.team_b_name}</div>
                      <div className="text-xs text-gray-500">{new Date(m.match_date).toLocaleDateString('fr-FR')} · {m.events_count} actions · xG {m.xg_for.toFixed(1)}</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
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
