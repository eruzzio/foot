import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, TrendingUp, TrendingDown, BarChart3, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';
import Statistics from './Statistics';
import Timeline from './Timeline';
import ExportButton from './ExportButton';
import PostMatchTab from './PostMatchTab';

interface MatchReportProps {
  matchId: string;
  onBack: () => void;
}

interface MatchWithEvents extends Match {
  events: MatchEventWithDetails[];
}

export default function MatchReport({ matchId, onBack }: MatchReportProps) {
  const [match, setMatch] = useState<MatchWithEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamALogoUrl, setTeamALogoUrl] = useState<string | undefined>(undefined);
  const [teamBLogoUrl, setTeamBLogoUrl] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'postmatch'>('overview');

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  const loadMatchData = async () => {
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !matchData) {
      console.error('Error loading match:', matchError);
      setLoading(false);
      return;
    }

    const { data: eventsData } = await supabase
      .from('match_events')
      .select(`
        *,
        event_type:event_types(*),
        player:players(*)
      `)
      .eq('match_id', matchId)
      .order('timestamp', { ascending: true });

    const teamAId = matchData.team_a_id;
    const teamBId = matchData.team_b_id;

    if (teamAId || teamBId) {
      const ids = [teamAId, teamBId].filter(Boolean) as string[];
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, logo_url')
        .in('id', ids);

      if (teamsData) {
        const teamAData = teamsData.find(t => t.id === teamAId);
        const teamBData = teamsData.find(t => t.id === teamBId);
        if (teamAData?.logo_url) setTeamALogoUrl(teamAData.logo_url);
        if (teamBData?.logo_url) setTeamBLogoUrl(teamBData.logo_url);
      }
    }

    setMatch({
      ...matchData,
      events: eventsData as MatchEventWithDetails[] || [],
    });
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMatchStats = () => {
    if (!match) return null;

    const teamAEvents = match.events.filter(e => e.team === 'A');
    const teamBEvents = match.events.filter(e => e.team === 'B');

    const teamASuccess = teamAEvents.filter(e => e.outcome === 'success').length;
    const teamBSuccess = teamBEvents.filter(e => e.outcome === 'success').length;

    return {
      teamATotal: teamAEvents.length,
      teamBTotal: teamBEvents.length,
      teamASuccess,
      teamBSuccess,
      teamASuccessRate: teamAEvents.length > 0 ? (teamASuccess / teamAEvents.length * 100).toFixed(1) : '0',
      teamBSuccessRate: teamBEvents.length > 0 ? (teamBSuccess / teamBEvents.length * 100).toFixed(1) : '0',
      totalEvents: match.events.length,
    };
  };

  const handleMatchUpdate = (updatedMatch: MatchWithEvents) => {
    setMatch(updatedMatch);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Match non trouvé</div>
      </div>
    );
  }

  const stats = calculateMatchStats();

  return (
    <div className="min-h-screen bg-dark text-white p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-dark-secondary rounded-lg transition-colors mb-6 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="bg-gradient-to-br from-dark-secondary to-dark border border-gray-800 rounded-2xl p-8 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-primary/5 rounded-full -mr-48 -mt-48 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Match de football</p>
                  <h1 className="text-4xl font-bold text-white">
                    {match.team_a_name} <span className="text-orange-primary">vs</span> {match.team_b_name}
                  </h1>
                </div>
                <ExportButton
                  events={match.events}
                  teamAName={match.team_a_name}
                  teamBName={match.team_b_name}
                  matchDate={new Date(match.match_date).toLocaleDateString('fr-FR')}
                  scoreA={match.team_a_score}
                  scoreB={match.team_b_score}
                  duration={match.match_time}
                  teamALogoUrl={teamALogoUrl}
                  teamBLogoUrl={teamBLogoUrl}
                />
              </div>

              <div className="grid grid-cols-3 gap-6 items-center mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">{match.team_a_score}</div>
                  <p className="text-gray-400">Buts</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Calendar size={16} />
                      {new Date(match.match_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full" />
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock size={16} />
                      {formatDuration(match.match_time)}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">{match.team_b_score}</div>
                  <p className="text-gray-400">Buts</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-6 flex gap-3 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'overview'
                ? 'text-orange-primary'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Aperçu du match
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('postmatch')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === 'postmatch'
                ? 'text-orange-primary'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Post Match
            {activeTab === 'postmatch' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-primary" />
            )}
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp size={20} className="text-blue-400" />
                    </div>
                    <span className="font-semibold text-white">{match.team_a_name}</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-400 mb-1">
                    {stats.teamATotal}
                  </div>
                  <div className="text-sm text-gray-400">
                    {stats.teamASuccess} réussies <span className="text-blue-400 font-semibold">({stats.teamASuccessRate}%)</span>
                  </div>
                </div>

                <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-orange-primary/50 transition-colors shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-primary/20 rounded-lg">
                      <Users size={20} className="text-orange-primary" />
                    </div>
                    <span className="font-semibold text-white">{match.team_b_name}</span>
                  </div>
                  <div className="text-4xl font-bold text-orange-primary mb-1">
                    {stats.teamBTotal}
                  </div>
                  <div className="text-sm text-gray-400">
                    {stats.teamBSuccess} réussies <span className="text-orange-primary font-semibold">({stats.teamBSuccessRate}%)</span>
                  </div>
                </div>

                <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-colors shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <BarChart3 size={20} className="text-green-400" />
                    </div>
                    <span className="font-semibold text-white">Total</span>
                  </div>
                  <div className="text-4xl font-bold text-green-400 mb-1">
                    {stats.totalEvents}
                  </div>
                  <div className="text-sm text-gray-400">
                    événements codés
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <Statistics
                events={match.events}
                teamAName={match.team_a_name}
                teamBName={match.team_b_name}
              />
              <Timeline
                events={match.events}
                match={match}
                teamAName={match.team_a_name}
                teamBName={match.team_b_name}
              />
            </div>
          </>
        )}

        {activeTab === 'postmatch' && (
          <PostMatchTab
            match={{ ...match, events: match.events }}
            onMatchUpdate={handleMatchUpdate}
          />
        )}
      </div>
    </div>
  );
}
