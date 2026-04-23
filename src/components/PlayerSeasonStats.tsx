import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, getCurrentUserId } from '../lib/auth';
import { TrendingUp, Target, Activity, Award, ChevronDown, ChevronUp } from 'lucide-react';

interface PlayerStat {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
  matchesPlayed: number;
  totalEvents: number;
  successCount: number;
  failureCount: number;
  neutralCount: number;
  successRate: number;
  eventsByType: Record<string, { label: string; count: number; success: number; failure: number }>;
}

interface PlayerSeasonStatsProps {
  teamId: string;
  teamName: string;
}

type SortKey = 'name' | 'matchesPlayed' | 'totalEvents' | 'successRate';

export default function PlayerSeasonStats({ teamId }: PlayerSeasonStatsProps) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('totalEvents');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    loadStats();
  }, [teamId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .order('number');

      if (!players || players.length === 0) {
        setStats([]);
        return;
      }

      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
        .eq('status', 'completed');

      const matchIds = matches?.map(m => m.id) ?? [];

      let allEvents: {
        player_id: string | null;
        outcome: string;
        match_id: string;
        event_type_id: string | null;
        label: string | null;
        event_type?: { name: string } | null;
      }[] = [];

      if (matchIds.length > 0) {
        const { data: events } = await supabase
          .from('match_events')
          .select('player_id, outcome, match_id, event_type_id, label, event_type:event_types(name)')
          .in('match_id', matchIds)
          .not('player_id', 'is', null);

        allEvents = events ?? [];
      }

      const playerStats: PlayerStat[] = players.map(player => {
        const playerEvents = allEvents.filter(e => e.player_id === player.id);
        const matchSet = new Set(playerEvents.map(e => e.match_id));

        const successCount = playerEvents.filter(e => e.outcome === 'success').length;
        const failureCount = playerEvents.filter(e => e.outcome === 'failure').length;
        const neutralCount = playerEvents.filter(e => e.outcome === 'neutral').length;
        const totalEvents = playerEvents.length;
        const successRate = totalEvents > 0 ? Math.round((successCount / (successCount + failureCount || 1)) * 100) : 0;

        const eventsByType: PlayerStat['eventsByType'] = {};
        playerEvents.forEach(e => {
          const key = e.event_type_id ?? 'other';
          const label = (e.event_type as { name?: string } | null)?.name ?? e.label ?? 'Autre';
          if (!eventsByType[key]) {
            eventsByType[key] = { label, count: 0, success: 0, failure: 0 };
          }
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
          successCount,
          failureCount,
          neutralCount,
          successRate,
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

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') {
        diff = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      } else {
        diff = a[sortKey] - b[sortKey];
      }
      return sortAsc ? diff : -diff;
    });
  }, [stats, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(prev => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortButton = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <button
      onClick={() => handleSort(sKey)}
      className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
        sortKey === sKey ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {sortKey === sKey ? (
        sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : null}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Chargement des statistiques...</div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity size={40} className="text-gray-600 mb-3" />
        <p className="text-gray-400 text-sm">Aucun joueur dans l'effectif</p>
        <p className="text-gray-600 text-xs mt-1">Ajoutez des joueurs pour voir leurs statistiques</p>
      </div>
    );
  }

  const totalMatches = stats[0] ? Math.max(...stats.map(s => s.matchesPlayed), 0) : 0;

  return (
    <div className="space-y-4">
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
          <div className="text-2xl font-bold text-white">
            {stats.reduce((acc, s) => acc + s.totalEvents, 0)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Actions codées</div>
        </div>
      </div>

      <div className="bg-dark-secondary border border-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-gray-800 bg-dark-tertiary/50">
          <SortButton label="Joueur" sKey="name" />
          <SortButton label="Matchs" sKey="matchesPlayed" />
          <SortButton label="Actions" sKey="totalEvents" />
          <SortButton label="Réussite" sKey="successRate" />
        </div>

        <div className="divide-y divide-gray-800/60">
          {sorted.map(player => {
            const isExpanded = expandedPlayer === player.id;
            const typeEntries = Object.entries(player.eventsByType).sort((a, b) => b[1].count - a[1].count);

            return (
              <div key={player.id}>
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 py-3 hover:bg-dark-tertiary/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={`${player.first_name} ${player.last_name}`}
                        className="w-8 h-8 rounded-full object-cover border border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {player.number}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {player.first_name} {player.last_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{player.position || `#${player.number}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-300">{player.matchesPlayed}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-300">{player.totalEvents}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 max-w-[40px] bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${player.successRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${
                      player.successRate >= 70 ? 'text-green-400' :
                      player.successRate >= 50 ? 'text-yellow-400' :
                      player.totalEvents === 0 ? 'text-gray-600' :
                      'text-red-400'
                    }`}>
                      {player.totalEvents === 0 ? '-' : `${player.successRate}%`}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-dark-tertiary/20 border-t border-gray-800/50">
                    {player.totalEvents === 0 ? (
                      <p className="text-gray-500 text-xs py-3 text-center">Aucune action codée pour ce joueur</p>
                    ) : (
                      <div className="pt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <Target size={12} className="text-green-400" />
                              <span className="text-xs text-green-400 font-medium">Réussies</span>
                            </div>
                            <div className="text-lg font-bold text-green-300">{player.successCount}</div>
                          </div>
                          <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <TrendingUp size={12} className="text-red-400" />
                              <span className="text-xs text-red-400 font-medium">Manquées</span>
                            </div>
                            <div className="text-lg font-bold text-red-300">{player.failureCount}</div>
                          </div>
                          <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <Award size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-400 font-medium">Neutres</span>
                            </div>
                            <div className="text-lg font-bold text-gray-300">{player.neutralCount}</div>
                          </div>
                        </div>

                        {typeEntries.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Par type d'action
                            </div>
                            <div className="space-y-1.5">
                              {typeEntries.map(([key, type]) => {
                                const rate = type.count > 0 && (type.success + type.failure) > 0
                                  ? Math.round((type.success / (type.success + type.failure)) * 100)
                                  : null;
                                return (
                                  <div key={key} className="flex items-center gap-3">
                                    <div className="flex-1 text-xs text-gray-300 truncate">{type.label}</div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-semibold text-white w-5 text-right">{type.count}</span>
                                      {rate !== null && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-12 bg-gray-800 rounded-full h-1 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                              style={{ width: `${rate}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs font-bold w-8 text-right ${rate >= 70 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {rate}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
