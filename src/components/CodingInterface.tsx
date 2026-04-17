import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EventType, MatchEvent, MatchEventWithDetails, PanelButtonWithEventType, Panel } from '../types/database';
import MatchTimer from './MatchTimer';
import ActionButtons from './ActionButtons';
import Timeline from './Timeline';
import Statistics from './Statistics';
import MatchSheet from './MatchSheet';
import MatchFormationManager from './MatchFormationManager';
import LocationSelector from './LocationSelector';
import { ArrowLeft } from 'lucide-react';
import ExportButton from './ExportButton';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';

interface CodingInterfaceProps {
  onBack?: () => void;
}

export default function CodingInterface({ onBack }: CodingInterfaceProps) {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [panelButtons, setPanelButtons] = useState<PanelButtonWithEventType[]>([]);
  const [currentPanel, setCurrentPanel] = useState<Panel | null>(null);
  const [allPanels, setAllPanels] = useState<Panel[]>([]);
  const [events, setEvents] = useState<MatchEventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMatchSheetOpen, setIsMatchSheetOpen] = useState(false);
  const [teamAName, setTeamAName] = useState('Équipe A');
  const [teamBName, setTeamBName] = useState('Équipe B');
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [matchSheetPanelId, setMatchSheetPanelId] = useState<string | null>(null);
  const [showFormationManager, setShowFormationManager] = useState(false);
  const [formationTeam, setFormationTeam] = useState<'A' | 'B'>('A');
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastEventButtonId, setLastEventButtonId] = useState<string | null>(null);
  const [teamAColor, setTeamAColor] = useState<string>('#22c55e');
  const [teamALogoUrl, setTeamALogoUrl] = useState<string>('');
  const [halftimes, setHalftimes] = useState<number[]>([]);
  const [championship, setChampionship] = useState<string>('');
  const [matchday, setMatchday] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await createDefaultFootballPanel(userData.user.id);
    }
    await initializeMatch();
    await loadAllPanels();
    setIsMatchSheetOpen(true);
  };

  useEffect(() => {
    if (matchId) {
      loadEvents();
      const subscription = supabase
        .channel('match_events_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_events',
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            loadEvents();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [matchId]);

  const initializeMatch = async () => {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        status: 'setup',
        match_time: 0,
        match_date: new Date().toISOString(),
        team_a_name: 'Équipe A',
        team_b_name: 'Équipe B',
        team_a_score: 0,
        team_b_score: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating match:', error);
      return;
    }

    setMatchId(data.id);
    if (data.team_a_name) setTeamAName(data.team_a_name);
    if (data.team_b_name) setTeamBName(data.team_b_name);
    setTeamAScore(data.team_a_score || 0);
    setTeamBScore(data.team_b_score || 0);
  };

  const loadAllPanels = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const { data: panels } = await supabase
        .from('panels')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('is_default', { ascending: false });

      if (panels && panels.length > 0) {
        setAllPanels(panels);
        const defaultPanel = panels.find(p => p.is_default) || panels[0];
        loadEventTypes(defaultPanel.id);
      } else {
        setAllPanels([]);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const loadEventTypes = async (panelId?: string | null) => {
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      let targetPanelId = panelId;

      if (!targetPanelId) {
        const { data: defaultPanel } = await supabase
          .from('panels')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('is_default', true)
          .maybeSingle();

        if (defaultPanel) {
          targetPanelId = defaultPanel.id;
          setCurrentPanel(defaultPanel);
        }
      } else {
        const { data: panel } = await supabase
          .from('panels')
          .select('*')
          .eq('id', targetPanelId)
          .maybeSingle();

        if (panel) {
          setCurrentPanel(panel);
        }
      }

      if (targetPanelId) {
        const { data: buttons, error } = await supabase
          .from('panel_buttons')
          .select('*, event_type:event_types(*)')
          .eq('panel_id', targetPanelId)
          .order('tab_page', { ascending: true })
          .order('position', { ascending: true });

        if (!error) {
          setPanelButtons((buttons ?? []) as PanelButtonWithEventType[]);
          setSelectedPanelId(targetPanelId);
          setLoading(false);
          return;
        }
      }
    }

    setPanelButtons([]);
    setCurrentPanel(null);
    setLoading(false);
  };

  const loadEvents = async () => {
    if (!matchId) return;

    const { data, error } = await supabase
      .from('match_events')
      .select(`
        *,
        event_type:event_types(*),
        player:players(*)
      `)
      .eq('match_id', matchId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    setEvents(data as MatchEventWithDetails[]);
  };

  const handleTimeUpdate = async (newTime: number) => {
    setCurrentTime(newTime);
    if (matchId) {
      await supabase
        .from('matches')
        .update({ match_time: newTime })
        .eq('id', matchId);
    }
  };

  const handleToggleTimer = async () => {
    const newStatus = isRunning ? 'paused' : 'in_progress';
    setIsRunning(!isRunning);

    if (matchId) {
      await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId);
    }
  };

  const handleResetTimer = async () => {
    setCurrentTime(0);
    setIsRunning(false);
    setHalftimes([]);

    if (matchId) {
      await supabase
        .from('matches')
        .update({ match_time: 0, status: 'setup' })
        .eq('id', matchId);
    }
  };

  const handleHalftime = () => {
    if (halftimes.length >= 2) return;
    setHalftimes(prev => [...prev, currentTime]);
  };

  const handleEndMatch = async () => {
    if (!matchId) return;

    const confirmEnd = window.confirm(
      'Voulez-vous terminer ce match ? Il sera enregistré dans vos statistiques.'
    );

    if (!confirmEnd) return;

    setIsRunning(false);

    await supabase
      .from('matches')
      .update({ status: 'completed' })
      .eq('id', matchId);

    if (onBack) {
      onBack();
    }
  };

  const handlePanelChange = (panelId: string) => {
    loadEventTypes(panelId);
  };

  const handleActionClick = async (
    eventType: EventType | null,
    outcome?: 'success' | 'failure',
    buttonType?: 'event' | 'keyword',
    keywordLabel?: string,
    parentButtonId?: string,
    buttonLabel?: string
  ) => {
    if (!matchId) {
      const { data } = await supabase.from('matches').select('id').eq('status', 'in_progress').maybeSingle();
      if (data?.id) {
        setMatchId(data.id);
      }
      return;
    }

    if (buttonType === 'keyword' && lastEventId && keywordLabel) {
      const targetEvent = events.find(e => e.id === lastEventId);
      if (targetEvent) {
        const currentKeywords = targetEvent.keywords ?? [];
        const alreadyHas = currentKeywords.includes(keywordLabel);
        const newKeywords = alreadyHas
          ? currentKeywords.filter(k => k !== keywordLabel)
          : [...currentKeywords, keywordLabel];

        await supabase
          .from('match_events')
          .update({ keywords: newKeywords })
          .eq('id', lastEventId);

        setEvents(prev =>
          prev.map(e =>
            e.id === lastEventId ? { ...e, keywords: newKeywords } : e
          )
        );
        return;
      }
    }

    if (buttonType === 'event') {
      const newEvent = {
        match_id: matchId,
        event_type_id: eventType?.id ?? null,
        label: buttonLabel ?? null,
        team: selectedTeam,
        timestamp: currentTime,
        outcome: outcome || 'neutral',
        keywords: [] as string[],
        parent_event_id: null,
      };

      const { error, data } = await supabase
        .from('match_events')
        .insert(newEvent)
        .select();

      if (error) {
        console.error('Error creating event:', error);
        return;
      }

      if (data) {
        const eventWithDetails: MatchEventWithDetails = {
          ...data[0],
          event_type: eventType ?? null,
        };
        setEvents((prev) => [eventWithDetails, ...prev]);
        setLastEventId(data[0].id);
        setLastEventButtonId(parentButtonId ?? null);

        const zoneButtons = panelButtons.filter((btn) => btn.is_zone);
        if (zoneButtons.length > 0) {
          setPendingEventId(data[0].id);
          setShowLocationSelector(true);
        }
      }
    }
  };

  const handleZoneSelected = async (zoneButtonId: string, zoneLabel: string) => {
    if (pendingEventId) {
      await supabase
        .from('match_events')
        .update({ location_id: zoneButtonId })
        .eq('id', pendingEventId);

      setLastEventId(null);
      setPendingEventId(null);
      setShowLocationSelector(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleMatchSheetSave = async (data: any) => {
    if (data.teamA) setTeamAName(data.teamA);
    if (data.teamB) setTeamBName(data.teamB);
    if (data.teamAColor) setTeamAColor(data.teamAColor);
    if (data.teamALogoUrl) setTeamALogoUrl(data.teamALogoUrl);
    if (data.championship) setChampionship(data.championship);
    if (data.matchday) setMatchday(data.matchday);
    if (data.location) setLocation(data.location);
    if (data.date) setMatchDate(data.date);

    if (matchId) {
      await supabase
        .from('matches')
        .update({
          team_a_name: data.teamA || 'Équipe A',
          team_b_name: data.teamB || 'Équipe B',
          team_a_id: data.teamAId ?? null,
        })
        .eq('id', matchId);
    }

    if (data.panelId) {
      setMatchSheetPanelId(data.panelId);
      setSelectedPanelId(data.panelId);
      await loadEventTypes(data.panelId);
    }
  };

  const handleScoreChange = async (team: 'A' | 'B', increment: number) => {
    if (!matchId) return;

    const newScoreA = team === 'A' ? teamAScore + increment : teamAScore;
    const newScoreB = team === 'B' ? teamBScore + increment : teamBScore;

    if (newScoreA < 0 || newScoreB < 0) return;

    setTeamAScore(newScoreA);
    setTeamBScore(newScoreB);

    await supabase
      .from('matches')
      .update({
        team_a_score: newScoreA,
        team_b_score: newScoreB,
      })
      .eq('id', matchId);

    if (increment > 0) {
      const { data: eventTypeData } = await supabase
        .from('event_types')
        .select('id')
        .eq('name', 'But')
        .maybeSingle();

      if (eventTypeData?.id) {
        await supabase
          .from('match_events')
          .insert({
            match_id: matchId,
            event_type_id: eventTypeData.id,
            label: 'But',
            team: team,
            timestamp: currentTime,
            outcome: 'success',
          });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  const eventTypes = panelButtons
    .map(pb => pb.event_type)
    .filter(et => et !== null && et !== undefined) as EventType[];

  return (
    <div className="min-h-screen bg-dark p-4 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
                >
                  <ArrowLeft size={24} className="text-gray-300" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">Codage Sportif Live</h1>
                <p className="text-gray-400">Analysez votre match en temps réel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton
                events={events}
                teamAName={teamAName}
                teamBName={teamBName}
                scoreA={teamAScore}
                scoreB={teamBScore}
                duration={currentTime}
              />
              <button
                onClick={() => setIsMatchSheetOpen(true)}
                className="px-4 py-2 bg-orange-primary text-white rounded-lg hover-orange transition-colors font-medium"
              >
                Fiche Match
              </button>
              <button
                onClick={handleEndMatch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Fin de match
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {(championship || matchday || location || matchDate) && (
              <div className="bg-dark-secondary border border-gray-800 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {championship && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Championnat</p>
                      <p className="text-sm font-medium text-white">{championship}</p>
                    </div>
                  )}
                  {matchday && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Journée</p>
                      <p className="text-sm font-medium text-white">{matchday}</p>
                    </div>
                  )}
                  {location && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Lieu</p>
                      <p className="text-sm font-medium text-white">{location}</p>
                    </div>
                  )}
                  {matchDate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Date</p>
                      <p className="text-sm font-medium text-white">{matchDate}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <MatchTimer
              currentTime={currentTime}
              isRunning={isRunning}
              onTimeUpdate={handleTimeUpdate}
              onToggle={handleToggleTimer}
              onReset={handleResetTimer}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAScore={teamAScore}
              teamBScore={teamBScore}
              selectedTeam={selectedTeam}
              onScoreChange={handleScoreChange}
              onSelectTeam={setSelectedTeam}
              teamAColor={teamAColor}
              teamALogoUrl={teamALogoUrl}
              halftimes={halftimes}
              onHalftime={handleHalftime}
              onOpenFormation={(team) => {
                setFormationTeam(team);
                setShowFormationManager(true);
              }}
            />

            <ActionButtons
              panelButtons={panelButtons}
              onActionClick={handleActionClick}
              selectedTeam={selectedTeam}
              useFreeLayout={panelButtons.filter(b => !b.parent_button_id).some(b => b.layout_x !== null && b.layout_y !== null)}
              allPanels={allPanels}
              currentPanelId={selectedPanelId}
              onPanelChange={handlePanelChange}
              lockedPanelId={matchSheetPanelId}
              lastEventId={lastEventId}
              lastEventKeywords={lastEventId ? (events.find(e => e.id === lastEventId)?.keywords ?? []) : []}
              lastEventButtonId={lastEventButtonId}
            />

            <Statistics
              events={events}
              teamAName={teamAName}
              teamBName={teamBName}
              halftimes={halftimes}
            />
          </div>

          <div className="lg:col-span-1">
            <Timeline events={events} onDeleteEvent={handleDeleteEvent} teamAName={teamAName} teamBName={teamBName} />
          </div>
        </div>
      </div>

      <MatchSheet
        isOpen={isMatchSheetOpen}
        onClose={() => setIsMatchSheetOpen(false)}
        onSave={handleMatchSheetSave}
        initialTeamA={teamAName}
        initialTeamB={teamBName}
      />

      {showFormationManager && matchId && (
        <MatchFormationManager
          matchId={matchId}
          team={formationTeam}
          onClose={() => setShowFormationManager(false)}
        />
      )}

      {showLocationSelector && (
        <LocationSelector
          zoneButtons={panelButtons.filter((btn) => btn.is_zone)}
          onZoneSelected={handleZoneSelected}
          onCancel={() => {
            setShowLocationSelector(false);
            setPendingEventId(null);
          }}
        />
      )}
    </div>
  );
}
