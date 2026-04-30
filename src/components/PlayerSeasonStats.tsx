import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
  tirs: number;
  passes: number;
  pertes: number;
  recuperations: number;
  fautes: number;
  tacles: number;
  duels: number;
  eventsByType: Record<string, { label: string; count: number; success: number; failure: number }>;
}

interface PlayerSeasonStatsProps {
  teamId: string;
  teamName: string;
}

type SortKey = 'name' | 'matchesPlayed' | 'totalEvents' | 'successRate' | 'tirs' | 'passes' | 'pertes' | 'recuperations' | 'fautes' | 'tacles' | 'duels';

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
      const { data: { user } } = await supabase.auth.getUser();
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

        // Stats par type d'action (correspondance sur le nom)
        const countByName = (keywords: string[]) => playerEvents.filter(e => {
          const name = ((e.event_type as { name?: string } | null)?.name ?? e.label ?? '').toLowerCase();
          return keywords.some(k => name.includes(k));
        }).length;

        const tirs = countByName(['tir', 'shot', 'frappe', 'penalty']);
        const passes = countByName(['passe', 'pass', 'centre', 'relance']);
        const pertes = countByName(['perte', 'perd', 'lost', 'dépossédé']);
        const recuperations = countByName(['récup', 'recup', 'interception', 'intercepté']);
        const fautes = countByName(['faute', 'foul']);
        const tacles = countByName(['tacle', 'tackle']);
        const duels = countByName(['duel', 'combat', '1v1', '1 contre 1']);

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
          tirs,
          passes,
          pertes,
          recuperations,
          fautes,
          tacles,
          duels,
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-800 bg-dark-tertiary/50">
                <th className="text-left px-4 py-2"><SortButton label="Joueur" sKey="name" /></th>
                <th className="text-center px-2 py-2"><SortButton label="MJ" sKey="matchesPlayed" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Actions" sKey="totalEvents" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Tirs" sKey="tirs" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Passes" sKey="passes" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Récup" sKey="recuperations" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Pertes" sKey="pertes" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Tacles" sKey="tacles" /></th>
                <th className="text-center px-2 py-2"><SortButton label="Fautes" sKey="fautes" /></th>
                <th className="text-center px-2 py-2"><SortButton label="%" sKey="successRate" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {sorted.map(player => {
                const isExpanded = expandedPlayer === player.id;
                const typeEntries = Object.entries(player.eventsByType).sort((a, b) => b[1].count - a[1].count);
                return (
                  <>
                    <tr
                      key={player.id}
                      onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                      className="hover:bg-dark-tertiary/40 transition-colors cursor-pointer"
                    >
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
                        </div>
                      </td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-gray-300">{player.matchesPlayed}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-orange-400">{player.totalEvents}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-green-400">{player.tirs || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-blue-400">{player.passes || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-teal-400">{player.recuperations || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-red-400">{player.pertes || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-indigo-400">{player.tacles || '–'}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold text-yellow-400">{player.fautes || '–'}</td>
                      <td className="text-center px-2 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-10 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${player.successRate}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{player.successRate}%</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${player.id}-expanded`}>
                        <td colSpan={10} className="px-4 py-3 bg-dark-tertiary/30">
                          <div className="flex flex-wrap gap-2">
                            {typeEntries.map(([key, data]) => (
                              <span key={key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-secondary border border-gray-700 text-xs">
                                <span className="text-gray-300 font-medium">{data.label}</span>
                                <span className="text-orange-400 font-bold">{data.count}</span>
                                {data.success > 0 && <span className="text-green-400 text-[10px]">✓{data.success}</span>}
                                {data.failure > 0 && <span className="text-red-400 text-[10px]">✗{data.failure}</span>}
                              </span>
                            ))}
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
