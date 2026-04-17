import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Trophy, Target, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';

interface EvolutionDashboardProps {
  onBack: () => void;
}

interface MatchStats {
  match: Match;
  goalsFor: number;
  goalsAgainst: number;
  teamATotal: number;
  teamBTotal: number;
  teamASuccess: number;
  teamBSuccess: number;
  teamASuccessRate: number;
  teamBSuccessRate: number;
}

export default function EvolutionDashboard({ onBack }: EvolutionDashboardProps) {
  const [matchesStats, setMatchesStats] = useState<MatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvolutionData();
  }, []);

  const loadEvolutionData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .order('match_date', { ascending: true });

    if (matchesError || !matches) {
      console.error('Error loading matches:', matchesError);
      setLoading(false);
      return;
    }

    const stats: MatchStats[] = [];

    for (const match of matches) {
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', match.id);

      const events = (eventsData || []) as MatchEventWithDetails[];
      const teamAEvents = events.filter(e => e.team === 'A');
      const teamBEvents = events.filter(e => e.team === 'B');

      const teamASuccess = teamAEvents.filter(e => e.outcome === 'success').length;
      const teamBSuccess = teamBEvents.filter(e => e.outcome === 'success').length;

      const teamAGoals = teamAEvents.filter(e => e.label === 'But').length;
      const teamBGoals = teamBEvents.filter(e => e.label === 'But').length;
      const goalsFor = teamAGoals;
      const goalsAgainst = teamBGoals;

      stats.push({
        match,
        goalsFor,
        goalsAgainst,
        teamATotal: teamAEvents.length,
        teamBTotal: teamBEvents.length,
        teamASuccess,
        teamBSuccess,
        teamASuccessRate: teamAEvents.length > 0 ? teamASuccess / teamAEvents.length : 0,
        teamBSuccessRate: teamBEvents.length > 0 ? teamBSuccess / teamBEvents.length : 0,
      });
    }

    setMatchesStats(stats);
    setLoading(false);
  };

  const calculateAverages = () => {
    if (matchesStats.length === 0) return null;

    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let avgGoalsFor = 0;
    let avgGoalsAgainst = 0;

    matchesStats.forEach(stat => {
      totalGoalsFor += stat.goalsFor;
      totalGoalsAgainst += stat.goalsAgainst;
    });

    avgGoalsFor = (totalGoalsFor / matchesStats.length).toFixed(2);
    avgGoalsAgainst = (totalGoalsAgainst / matchesStats.length).toFixed(2);

    return {
      totalGoalsFor,
      totalGoalsAgainst,
      avgGoalsFor,
      avgGoalsAgainst,
      matchesPlayed: matchesStats.length,
      goalDifference: totalGoalsFor - totalGoalsAgainst,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark p-4 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Évolution des Stats</h1>
            <p className="text-gray-400">Suivi de votre progression sur plusieurs matchs</p>
          </div>
        </header>

        {matchesStats.length === 0 ? (
          <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-12 text-center">
            <TrendingUp size={80} className="text-orange-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">
              Aucune donnée disponible
            </h2>
            <p className="text-gray-400">
              Vous avez besoin d'au moins un match complété pour voir votre évolution.
            </p>
          </div>
        ) : (
          <>
            {calculateAverages() && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-dark-secondary border border-gray-800 rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Buts marqués</span>
                    <Trophy size={20} className="text-green-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-green-500">{calculateAverages()!.totalGoalsFor}</div>
                    <div className="text-gray-400 text-sm">({calculateAverages()!.avgGoalsFor} /match)</div>
                  </div>
                </div>
                <div className="bg-dark-secondary border border-gray-800 rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Buts encaissés</span>
                    <Target size={20} className="text-red-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-red-500">{calculateAverages()!.totalGoalsAgainst}</div>
                    <div className="text-gray-400 text-sm">({calculateAverages()!.avgGoalsAgainst} /match)</div>
                  </div>
                </div>
                <div className="bg-dark-secondary border border-gray-800 rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Différence de buts</span>
                    <TrendingUp size={20} className={calculateAverages()!.goalDifference > 0 ? "text-orange-primary" : "text-red-500"} />
                  </div>
                  <div className={`text-3xl font-bold ${calculateAverages()!.goalDifference > 0 ? "text-orange-primary" : "text-red-500"}`}>
                    {calculateAverages()!.goalDifference > 0 ? '+' : ''}{calculateAverages()!.goalDifference}
                  </div>
                </div>
                <div className="bg-dark-secondary border border-gray-800 rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Matchs joués</span>
                    <Zap size={20} className="text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-blue-500">{calculateAverages()!.matchesPlayed}</div>
                </div>
              </div>
            )}

            <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Progression par match</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-tertiary border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Match</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Équipe A - Événements</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Équipe A - Succès</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Équipe B - Événements</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Équipe B - Succès</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {matchesStats.map((stat) => (
                      <tr key={stat.match.id} className="hover:bg-dark-tertiary transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            {new Date(stat.match.match_date).toLocaleDateString('fr-FR', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {stat.match.team_a_name} vs {stat.match.team_b_name}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-orange-primary">
                          {stat.teamATotal}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-green-500">
                          {stat.teamASuccess} ({(stat.teamASuccessRate * 100).toFixed(0)}%)
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-orange-primary">
                          {stat.teamBTotal}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-green-500">
                          {stat.teamBSuccess} ({(stat.teamBSuccessRate * 100).toFixed(0)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
