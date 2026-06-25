import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, ChevronDown, ChevronUp, Plus, Trash2, Save, Settings } from 'lucide-react';

interface PlayerStat {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
  matchesPlayed: number;
  totalEvents: number;
  successRate: number;
  tirs: number;
  passes: number;
  recuperations: number;
  pertes: number;
  fautes: number;
  tacles: number;
  duels: number;
  // Stats manuelles agrégées
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  customStats: Record<string, number>;
  eventsByType: Record<string, { label: string; count: number; success: number; failure: number }>;
}

interface MatchPlayerStat {
  id?: string;
  match_id: string;
  player_id: string;
  goals: number;
  assists: number;
  minutes_played: number;
  yellow_cards: number;
  red_cards: number;
  custom_stats: Record<string, number>;
  match?: {
    id: string;
    match_date: string;
    team_a_name: string;
    team_b_name: string;
    team_a_score: number | null;
    team_b_score: number | null;
  };
}

interface StatDefinition {
  id: string;
  name: string;
  type: string;
  display_order: number;
}

interface PlayerSeasonStatsProps {
  teamId: string;
  teamName: string;
}

type SortKey = 'name' | 'matchesPlayed' | 'totalEvents' | 'successRate' | 'goals' | 'assists' | 'minutesPlayed' | 'tirs' | 'passes';

export default function PlayerSeasonStats({ teamId }: PlayerSeasonStatsProps) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortAsc, setSortAsc] = useState(false);
  const [matchStats, setMatchStats] = useState<Record<string, MatchPlayerStat[]>>({});
  const [loadingMatchStats, setLoadingMatchStats] = useState<string | null>(null);
  const [savingStats, setSavingStats] = useState<string | null>(null);
  const [statDefinitions, setStatDefinitions] = useState<StatDefinition[]>([]);
  const [showStatManager, setShowStatManager] = useState(false);
  const [newStatName, setNewStatName] = useState('');

  useEffect(() => {
    loadStats();
    loadStatDefinitions();
  }, [teamId]);

  const loadStatDefinitions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('team_stat_definitions')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .order('display_order');
    if (data) setStatDefinitions(data);
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .order('number');

      if (!players || players.length === 0) { setStats([]); return; }

      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
        .eq('status', 'completed');

      const matchIds = matches?.map(m => m.id) ?? [];

      let allEvents: { player_id: string | null; outcome: string; match_id: string; event_type_id: string | null; label: string | null; event_type?: { name: string } | null }[] = [];
      if (matchIds.length > 0) {
        const { data: events } = await supabase
          .from('match_events')
          .select('player_id, outcome, match_id, event_type_id, label, event_type:event_types(name)')
          .in('match_id', matchIds)
          .not('player_id', 'is', null);
        allEvents = events ?? [];
      }

      // Charger les stats manuelles agrégées par joueur
      const { data: manualStats } = await supabase
        .from('player_match_stats')
        .select('*')
        .eq('user_id', user.id)
        .in('match_id', matchIds.length > 0 ? matchIds : ['none']);

      const playerStats: PlayerStat[] = players.map(player => {
        const playerEvents = allEvents.filter(e => e.player_id === player.id);
        const matchSet = new Set(playerEvents.map(e => e.match_id));
        const successCount = playerEvents.filter(e => e.outcome === 'success').length;
        const failureCount = playerEvents.filter(e => e.outcome === 'failure').length;
        const totalEvents = playerEvents.length;
        const successRate = totalEvents > 0 ? Math.round((successCount / (successCount + failureCount || 1)) * 100) : 0;

        const countByName = (keywords: string[]) => playerEvents.filter(e => {
          const name = ((e.event_type as { name?: string } | null)?.name ?? e.label ?? '').toLowerCase();
          return keywords.some(k => name.includes(k));
        }).length;

        // Agréger les stats manuelles
        const playerManual = (manualStats ?? []).filter(s => s.player_id === player.id);
        const goals = playerManual.reduce((a, s) => a + (s.goals || 0), 0);
        const assists = playerManual.reduce((a, s) => a + (s.assists || 0), 0);
        const minutesPlayed = playerManual.reduce((a, s) => a + (s.minutes_played || 0), 0);
        const yellowCards = playerManual.reduce((a, s) => a + (s.yellow_cards || 0), 0);
        const redCards = playerManual.reduce((a, s) => a + (s.red_cards || 0), 0);
        
        // Agréger les stats custom
        const customStats: Record<string, number> = {};
        playerManual.forEach(s => {
          if (s.custom_stats) {
            Object.entries(s.custom_stats).forEach(([k, v]) => {
              customStats[k] = (customStats[k] || 0) + (Number(v) || 0);
            });
          }
        });

        const eventsByType: PlayerStat['eventsByType'] = {};
        playerEvents.forEach(e => {
          const key = e.event_type_id ?? 'other';
          const label = (e.event_type as { name?: string } | null)?.name ?? e.label ?? 'Autre';
          if (!eventsByType[key]) eventsByType[key] = { label, count: 0, success: 0, failure: 0 };
          eventsByType[key].count++;
          if (e.outcome === 'success') eventsByType[key].success++;
          if (e.outcome === 'failure') eventsByType[key].failure++;
        });

        return {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          number: player.number,
          position: player.position,
          photo_url: player.photo_url,
          matchesPlayed: matchSet.size,
          totalEvents,
          successRate,
          tirs: countByName(['tir', 'shot', 'frappe', 'penalty']),
          passes: countByName(['passe', 'pass', 'centre', 'relance']),
          pertes: countByName(['perte', 'perd', 'lost']),
          recuperations: countByName(['récup', 'recup', 'interception']),
          fautes: countByName(['faute', 'foul']),
          tacles: countByName(['tacle', 'tackle']),
          duels: countByName(['duel', 'combat']),
          goals, assists, minutesPlayed, yellowCards, redCards, customStats,
          eventsByType,
        };
      });

      setStats(playerStats);
    } catch (err) {
      console.error('Error loading player season stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchStatsForPlayer = async (playerId: string) => {
    setLoadingMatchStats(playerId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les matchs auxquels le joueur a participé
      const { data: participations } = await supabase
        .from('match_players')
        .select('match_id')
        .eq('player_id', playerId)
        .eq('user_id', user.id);

      if (!participations || participations.length === 0) {
        setMatchStats(prev => ({ ...prev, [playerId]: [] }));
        return;
      }

      const matchIds = participations.map(p => p.match_id);

      const [matchesRes, statsRes] = await Promise.all([
        supabase.from('matches').select('id, match_date, team_a_name, team_b_name, team_a_score, team_b_score').in('id', matchIds).order('match_date', { ascending: false }),
        supabase.from('player_match_stats').select('*').eq('player_id', playerId).eq('user_id', user.id).in('match_id', matchIds),
      ]);

      const statsMap: Record<string, MatchPlayerStat> = {};
      (statsRes.data ?? []).forEach(s => { statsMap[s.match_id] = s; });

      const result: MatchPlayerStat[] = (matchesRes.data ?? []).map(m => ({
        id: statsMap[m.id]?.id,
        match_id: m.id,
        player_id: playerId,
        goals: statsMap[m.id]?.goals ?? 0,
        assists: statsMap[m.id]?.assists ?? 0,
        minutes_played: statsMap[m.id]?.minutes_played ?? 0,
        yellow_cards: statsMap[m.id]?.yellow_cards ?? 0,
        red_cards: statsMap[m.id]?.red_cards ?? 0,
        custom_stats: statsMap[m.id]?.custom_stats ?? {},
        match: m,
      }));

      setMatchStats(prev => ({ ...prev, [playerId]: result }));
    } finally {
      setLoadingMatchStats(null);
    }
  };

  const handleTogglePlayer = (playerId: string) => {
    if (expandedPlayer === playerId) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(playerId);
      if (!matchStats[playerId]) loadMatchStatsForPlayer(playerId);
    }
  };

  const handleStatChange = (playerId: string, matchId: string, field: string, value: number | string) => {
    setMatchStats(prev => ({
      ...prev,
      [playerId]: (prev[playerId] ?? []).map(s =>
        s.match_id === matchId
          ? field.startsWith('custom_')
            ? { ...s, custom_stats: { ...s.custom_stats, [field.replace('custom_', '')]: Number(value) } }
            : { ...s, [field]: Number(value) }
          : s
      ),
    }));
  };

  const handleSaveMatchStat = async (playerId: string, matchId: string) => {
    const stat = matchStats[playerId]?.find(s => s.match_id === matchId);
    if (!stat) return;
    setSavingStats(`${playerId}-${matchId}`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('player_match_stats').upsert({
        id: stat.id,
        match_id: matchId,
        player_id: playerId,
        user_id: user.id,
        goals: stat.goals,
        assists: stat.assists,
        minutes_played: stat.minutes_played,
        yellow_cards: stat.yellow_cards,
        red_cards: stat.red_cards,
        custom_stats: stat.custom_stats,
      }, { onConflict: 'match_id,player_id' });

      await loadStats();
    } finally {
      setSavingStats(null);
    }
  };

  const handleAddStatDefinition = async () => {
    if (!newStatName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('team_stat_definitions').insert({
      team_id: teamId,
      user_id: user.id,
      name: newStatName.trim(),
      type: 'number',
      display_order: statDefinitions.length,
    });
    setNewStatName('');
    await loadStatDefinitions();
  };

  const handleDeleteStatDefinition = async (id: string) => {
    await supabase.from('team_stat_definitions').delete().eq('id', id);
    await loadStatDefinitions();
  };

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') diff = `${a.last_name}`.localeCompare(`${b.last_name}`);
      else if (sortKey === 'minutesPlayed') diff = a.minutesPlayed - b.minutesPlayed;
      else diff = (a[sortKey as keyof PlayerStat] as number) - (b[sortKey as keyof PlayerStat] as number);
      return sortAsc ? diff : -diff;
    });
  }, [stats, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortBtn = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <button onClick={() => handleSort(sKey)} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${sortKey === sKey ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>
      {label}{sortKey === sKey ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
    </button>
  );

  const StatInput = ({ playerId, matchId, field, value }: { playerId: string; matchId: string; field: string; value: number }) => (
    <input
      type="number"
      min={0}
      value={value}
      onChange={e => handleStatChange(playerId, matchId, field, e.target.value)}
      style={{ width: 48, textAlign: 'center', background: 'var(--orion-surface-3)', border: '1px solid var(--orion-line)', borderRadius: 4, color: 'var(--orion-text)', fontSize: 12, padding: '3px 4px' }}
    />
  );

  if (loading) return <div className="flex items-center justify-center py-16"><div className="text-gray-400 text-sm">Chargement…</div></div>;
  if (stats.length === 0) return <div className="flex flex-col items-center justify-center py-16 text-center"><Activity size={40} className="text-gray-600 mb-3" /><p className="text-gray-400 text-sm">Aucun joueur dans l'effectif</p></div>;

  const totalMatches = Math.max(...stats.map(s => s.matchesPlayed), 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalMatches}</div>
          <div className="text-xs text-gray-400 mt-0.5">Matchs (saison)</div>
        </div>
        <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Joueurs actifs</div>
        </div>
        <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.reduce((a, s) => a + s.totalEvents, 0)}</div>
          <div className="text-xs text-gray-400 mt-0.5">Actions codées</div>
        </div>
      </div>

      {/* Gestion stats custom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowStatManager(!showStatManager)} className="o-btn o-btn--ghost o-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={13} /> Stats personnalisées
        </button>
      </div>

      {showStatManager && (
        <div style={{ background: 'var(--orion-surface)', border: '1px solid var(--orion-line)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orion-text)', marginBottom: 12 }}>Stats personnalisées de l'équipe</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {statDefinitions.map(def => (
              <span key={def.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 20, fontSize: 12, color: 'var(--orion-text)' }}>
                {def.name}
                <button onClick={() => handleDeleteStatDefinition(def.id)} style={{ color: 'var(--orion-red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newStatName}
              onChange={e => setNewStatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddStatDefinition()}
              placeholder="Nom de la stat (ex: Duels gagnés)"
              style={{ flex: 1, background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 12, padding: '6px 10px' }}
            />
            <button onClick={handleAddStatDefinition} className="o-btn o-btn--primary o-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-dark-secondary border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800 bg-dark-tertiary/50">
                <th className="text-left px-4 py-2"><SortBtn label="Joueur" sKey="name" /></th>
                <th className="text-center px-2 py-2"><SortBtn label="MJ" sKey="matchesPlayed" /></th>
                <th className="text-center px-2 py-2"><SortBtn label="Buts" sKey="goals" /></th>
                <th className="text-center px-2 py-2"><SortBtn label="PD" sKey="assists" /></th>
                <th className="text-center px-2 py-2"><SortBtn label="Mins" sKey="minutesPlayed" /></th>
                <th className="text-center px-2 py-2 text-yellow-400 text-xs font-semibold">🟨</th>
                <th className="text-center px-2 py-2 text-red-400 text-xs font-semibold">🟥</th>
                <th className="text-center px-2 py-2"><SortBtn label="Actions" sKey="totalEvents" /></th>
                <th className="text-center px-2 py-2"><SortBtn label="%" sKey="successRate" /></th>
                {statDefinitions.map(def => (
                  <th key={def.id} className="text-center px-2 py-2 text-xs text-gray-400 font-semibold">{def.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {sorted.map(player => {
                const isExpanded = expandedPlayer === player.id;
                const playerMatchStats = matchStats[player.id] ?? [];
                return (
                  <>
                    <tr key={player.id} onClick={() => handleTogglePlayer(player.id)} className="hover:bg-dark-tertiary/40 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {player.photo_url ? (
                            <img src={player.photo_url} className="w-8 h-8 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{player.number}</div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-white">{player.first_name} {player.last_name}</div>
                            <div className="text-xs text-gray-500">{player.position || `#${player.number}`}</div>
                          </div>
                          {isExpanded ? <ChevronUp size={14} className="text-gray-500 ml-1" /> : <ChevronDown size={14} className="text-gray-500 ml-1" />}
                        </div>
                      </td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-gray-300">{player.matchesPlayed}</td>
                      <td className="text-center px-2 py-3 text-sm font-bold text-green-400">{player.goals || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-bold text-blue-400">{player.assists || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm text-gray-300">{player.minutesPlayed ? `${player.minutesPlayed}'` : '–'}</td>
                      <td className="text-center px-2 py-3 text-sm text-yellow-400">{player.yellowCards || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm text-red-400">{player.redCards || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-orange-400">{player.totalEvents}</td>
                      <td className="text-center px-2 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-10 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${player.successRate}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{player.successRate}%</span>
                        </div>
                      </td>
                      {statDefinitions.map(def => (
                        <td key={def.id} className="text-center px-2 py-3 text-sm text-gray-300">
                          {player.customStats[def.name] || '–'}
                        </td>
                      ))}
                    </tr>

                    {isExpanded && (
                      <tr key={`${player.id}-expanded`}>
                        <td colSpan={9 + statDefinitions.length} style={{ background: 'var(--orion-surface)', padding: 0 }}>
                          <div style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--orion-text-mute)', marginBottom: 10 }}>
                              STATS PAR MATCH
                            </div>

                            {loadingMatchStats === player.id ? (
                              <div style={{ fontSize: 12, color: 'var(--orion-text-mute)', padding: 8 }}>Chargement…</div>
                            ) : playerMatchStats.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--orion-text-mute)', padding: 8 }}>
                                Aucun match — ajoutez ce joueur à la composition d'un match.
                              </div>
                            ) : (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--orion-line)' }}>
                                      <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>Match</th>
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>Buts</th>
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>PD</th>
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>Mins</th>
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>🟨</th>
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>🟥</th>
                                      {statDefinitions.map(def => (
                                        <th key={def.id} style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--orion-text-mute)', fontWeight: 600 }}>{def.name}</th>
                                      ))}
                                      <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11 }}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {playerMatchStats.map(ms => {
                                      const isSaving = savingStats === `${player.id}-${ms.match_id}`;
                                      return (
                                        <tr key={ms.match_id} style={{ borderBottom: '1px solid var(--orion-line)' }}>
                                          <td style={{ padding: '6px 8px' }}>
                                            <div style={{ fontSize: 12, color: 'var(--orion-text)', fontWeight: 500 }}>
                                              {ms.match?.team_a_name} vs {ms.match?.team_b_name}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--orion-text-mute)' }}>
                                              {ms.match?.match_date ? new Date(ms.match.match_date).toLocaleDateString('fr-FR') : ''}
                                              {ms.match?.team_a_score !== null ? ` · ${ms.match?.team_a_score}-${ms.match?.team_b_score}` : ''}
                                            </div>
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <StatInput playerId={player.id} matchId={ms.match_id} field="goals" value={ms.goals} />
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <StatInput playerId={player.id} matchId={ms.match_id} field="assists" value={ms.assists} />
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <StatInput playerId={player.id} matchId={ms.match_id} field="minutes_played" value={ms.minutes_played} />
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <StatInput playerId={player.id} matchId={ms.match_id} field="yellow_cards" value={ms.yellow_cards} />
                                          </td>
                                          <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <StatInput playerId={player.id} matchId={ms.match_id} field="red_cards" value={ms.red_cards} />
                                          </td>
                                          {statDefinitions.map(def => (
                                            <td key={def.id} style={{ textAlign: 'center', padding: '6px 4px' }}>
                                              <StatInput playerId={player.id} matchId={ms.match_id} field={`custom_${def.name}`} value={ms.custom_stats[def.name] ?? 0} />
                                            </td>
                                          ))}
                                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                            <button
                                              onClick={e => { e.stopPropagation(); handleSaveMatchStat(player.id, ms.match_id); }}
                                              disabled={isSaving}
                                              className="o-btn o-btn--primary o-btn--sm"
                                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                                            >
                                              <Save size={11} /> {isSaving ? '…' : 'Sauv.'}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
