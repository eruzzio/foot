import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronUp, Activity, Calendar, Clock } from 'lucide-react';

interface MatchSummary {
  id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  team_a_id: string | null;
  match_time: number;
  created_at: string;
  status: string;
}

interface EventTypeStat {
  name: string;
  color: string;
  teamA: number;
  teamB: number;
  total: number;
  teamAPercentage: number;
}

interface MatchWithStats extends MatchSummary {
  stats: EventTypeStat[];
  isTeamA: boolean;
}

interface TeamMatchHistoryProps {
  teamId: string;
  teamName: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}'${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function TeamMatchHistory({ teamId, teamName }: TeamMatchHistoryProps) {
  const [matches, setMatches] = useState<MatchWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [teamId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: matchData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'completed')
        .or(`team_a_id.eq.${teamId},team_a_name.eq.${teamName}`)
        .order('created_at', { ascending: false });

      if (error || !matchData) {
        setMatches([]);
        return;
      }

      const matchesWithStats: MatchWithStats[] = await Promise.all(
        matchData.map(async (match: MatchSummary) => {
          const isTeamA = match.team_a_id === teamId || match.team_a_name === teamName;

          const { data: events } = await supabase
            .from('match_events')
            .select('*, event_type:event_types(*)')
            .eq('match_id', match.id);

          const eventsByType: Record<string, { teamA: number; teamB: number; color: string }> = {};

          (events || []).forEach((event: any) => {
            const typeName = event.event_type?.name || event.label || 'Inconnu';
            if (!eventsByType[typeName]) {
              eventsByType[typeName] = { teamA: 0, teamB: 0, color: event.event_type?.color || '#6B7280' };
            }
            if (event.team === 'A') eventsByType[typeName].teamA++;
            else if (event.team === 'B') eventsByType[typeName].teamB++;
          });

          const stats: EventTypeStat[] = Object.entries(eventsByType)
            .map(([name, data]) => {
              const total = data.teamA + data.teamB;
              const teamAPercentage = total > 0 ? (data.teamA / total) * 100 : 50;
              return { name, color: data.color, teamA: data.teamA, teamB: data.teamB, total, teamAPercentage };
            })
            .sort((a, b) => b.total - a.total);

          return { ...match, stats, isTeamA };
        })
      );

      setMatches(matchesWithStats);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-secondary border border-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-sm">Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6 text-white">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity size={20} className="text-orange-400" />
        Historique des matchs
      </h3>

      {matches.length === 0 ? (
        <div className="text-center py-10">
          <Calendar size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun match enregistré pour cette équipe</p>
          <p className="text-gray-600 text-xs mt-1">Les matchs codés en live apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const ourScore = match.isTeamA ? match.team_a_score : match.team_b_score;
            const theirScore = match.isTeamA ? match.team_b_score : match.team_a_score;
            const opponentName = match.isTeamA ? match.team_b_name : match.team_a_name;
            const isWin = ourScore > theirScore;
            const isDraw = ourScore === theirScore;
            const isExpanded = expandedMatchId === match.id;

            const resultColor = isWin ? 'text-green-400' : isDraw ? 'text-gray-400' : 'text-red-400';
            const resultBg = isWin ? 'bg-green-500/10 border-green-500/30' : isDraw ? 'bg-gray-700/30 border-gray-600/30' : 'bg-red-500/10 border-red-500/30';
            const resultLabel = isWin ? 'V' : isDraw ? 'N' : 'D';

            return (
              <div key={match.id} className={`border rounded-lg overflow-hidden transition-all duration-200 ${resultBg}`}>
                <button
                  className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                  onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${resultColor} border ${resultBg}`}>
                    {resultLabel}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm truncate">{teamName}</span>
                      <span className={`text-lg font-bold tabular-nums ${resultColor}`}>
                        {ourScore} - {theirScore}
                      </span>
                      <span className="text-gray-400 text-sm truncate">{opponentName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(match.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(match.match_time)}
                      </span>
                      <span>{match.stats.reduce((s, e) => s + e.total, 0)} actions codées</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-gray-500">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700/50">
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Par type d'action</h4>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-green-500" />
                            <span className="text-gray-400">{match.isTeamA ? match.team_a_name : match.team_b_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-orange-400" />
                            <span className="text-gray-400">{match.isTeamA ? match.team_b_name : match.team_a_name}</span>
                          </div>
                        </div>
                      </div>

                      {match.stats.length === 0 ? (
                        <p className="text-gray-600 text-sm">Aucun événement enregistré</p>
                      ) : (
                        <div className="space-y-2">
                          {match.stats.map((stat) => {
                            const ourCount = match.isTeamA ? stat.teamA : stat.teamB;
                            const theirCount = match.isTeamA ? stat.teamB : stat.teamA;
                            const ourPct = match.isTeamA ? stat.teamAPercentage : 100 - stat.teamAPercentage;
                            const usDominant = ourCount > theirCount;
                            const themDominant = theirCount > ourCount;
                            const equal = ourCount === theirCount;

                            return (
                              <div key={stat.name} className="bg-dark-tertiary/40 rounded-lg p-2.5 border border-gray-800/40">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                                    <span className="text-xs font-medium text-white">{stat.name}</span>
                                  </div>
                                  <span className="text-xs text-gray-600">total : {stat.total}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold w-6 text-right tabular-nums ${usDominant ? 'text-green-400' : 'text-gray-500'}`}>
                                    {ourCount}
                                  </span>
                                  <div className="flex-1 relative h-4 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                      className="absolute inset-y-0 left-0 transition-all duration-300"
                                      style={{
                                        width: `${ourPct}%`,
                                        backgroundColor: equal ? '#4B5563' : (usDominant ? '#22C55E' : '#86EFAC55'),
                                      }}
                                    />
                                    <div
                                      className="absolute inset-y-0 right-0 transition-all duration-300"
                                      style={{
                                        width: `${100 - ourPct}%`,
                                        backgroundColor: equal ? '#4B5563' : (themDominant ? '#fb923c' : '#fb923c44'),
                                      }}
                                    />
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-200/80"
                                      style={{ left: `calc(${ourPct}% - 1px)` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold w-6 text-left tabular-nums ${themDominant ? 'text-orange-400' : 'text-gray-500'}`}>
                                    {theirCount}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
