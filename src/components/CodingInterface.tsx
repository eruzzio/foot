import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EventType, MatchEventWithDetails, PanelButtonWithEventType, Panel } from '../types/database';
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
import FieldPositionSelector from './FieldPositionSelector';
import GoalZoneSelector from './GoalZoneSelector';
import ZoneSelector from './ZoneSelector';
import HalftimeReport from './HalftimeReport';

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
  const [showCompoSelector, setShowCompoSelector] = useState(false);
  const [savedCompositions, setSavedCompositions] = useState<any[]>([]);
  const [selectedCompoId, setSelectedCompoId] = useState<string | null>(null);
  
  const [showHalftimeReport, setShowHalftimeReport] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastEventButtonId, setLastEventButtonId] = useState<string | null>(null);
  const [showUndoBar, setShowUndoBar] = useState(false);
  const [undoEvent, setUndoEvent] = useState<MatchEventWithDetails | null>(null);

  // Sauvegarde locale anti-crash toutes les 30 secondes
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (matchId && events.length > 0) {
        const backup = {
          matchId,
          events,
          currentTime,
          teamAScore,
          teamBScore,
          teamAName,
          teamBName,
          savedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`orion_backup_${matchId}`, JSON.stringify(backup));
        } catch {}
      }
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [matchId, events, currentTime, teamAScore, teamBScore]);

  // Sauvegarder aussi à chaque nouvel événement
  useEffect(() => {
    if (matchId && events.length > 0) {
      try {
        const backup = {
          matchId,
          events,
          currentTime,
          teamAScore,
          teamBScore,
          teamAName,
          teamBName,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`orion_backup_${matchId}`, JSON.stringify(backup));
      } catch {}
    }
  }, [events]);
  const [teamAColor, setTeamAColor] = useState<string>('#22c55e');
  const [teamALogoUrl, setTeamALogoUrl] = useState<string>('');
  const [halftimes, setHalftimes] = useState<number[]>([]);
  const [championship, setChampionship] = useState<string>('');
  const [matchday, setMatchday] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [kickoffRealTime, setKickoffRealTime] = useState<Date | null>(null);
  const [veoUrl, setVeoUrl] = useState<string>('');
  const [, setVeoOffsetSeconds] = useState<number | null>(null);
  const [showVeoSync, setShowVeoSync] = useState(false);
  const [veoKickoffInput, setVeoKickoffInput] = useState<string>('');
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [showOutcomeSelector, setShowOutcomeSelector] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [fieldSelectorEventId, setFieldSelectorEventId] = useState<string | null>(null);
  const [fieldSelectorEventName, setFieldSelectorEventName] = useState<string>('');

  useEffect(() => {
    initializeData();
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      }
      if (e.code === 'Escape') {
        setShowFieldSelector(false);
        setShowZoneSelector(false);
        setShowEndMatchConfirm(false);
        setShowHalftimeReport(false);
        setIsMatchSheetOpen(false);
      }
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (undoEvent) handleUndo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRunning, undoEvent]);

  const [backupToRestore, setBackupToRestore] = useState<any>(null);

  const initializeData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await createDefaultFootballPanel(userData.user.id);
    }
    await initializeMatch();
    await loadAllPanels();
    setIsMatchSheetOpen(true);
  };

  // Vérifier si un backup existe après la création du match
  useEffect(() => {
    if (!matchId) return;
    // Chercher un backup pour ce match
    const raw = localStorage.getItem(`orion_backup_${matchId}`);
    if (raw) {
      try {
        const backup = JSON.parse(raw);
        if (backup.events?.length > 0) setBackupToRestore(backup);
      } catch {}
    }
  }, [matchId]);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: user.id,
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
    // Réinitialiser le chrono à 45:00 pour la 2ème mi-temps
    setCurrentTime(2700);
    setIsRunning(false);
  };

  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);

  const handleEndMatch = async () => {
    if (!matchId) return;
    setShowEndMatchConfirm(true);
  };

  const handleBack = async () => {
    // Si aucune action codée et match non terminé → supprimer le match fantôme
    if (matchId && events.length === 0) {
      await supabase.from('matches').delete().eq('id', matchId);
    }
    if (onBack) onBack();
  };

  const confirmEndMatch = async () => {
    if (!matchId) return;
    setShowEndMatchConfirm(false);
    setIsRunning(false);

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        match_time: currentTime,
        team_a_score: teamAScore,
        team_b_score: teamBScore,
      })
      .eq('id', matchId);

    localStorage.removeItem(`orion_backup_${matchId}`);
    if (onBack) onBack();
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

        // Undo bar
        setUndoEvent(eventWithDetails);
        setShowUndoBar(true);
        setTimeout(() => setShowUndoBar(false), 8000);

        // Déterminer le mode de localisation du bouton cliqué
        const clickedButton = panelButtons.find(b => b.id === (parentButtonId ?? ''));
        const locMode = clickedButton?.location_mode ?? 'none';

        if (locMode === 'field' || locMode === 'field_and_goal') {
          setFieldSelectorEventId(data[0].id);
          setFieldSelectorEventName(buttonLabel ?? eventType?.name ?? 'Action');
          setShowFieldSelector(true);
        } else if (locMode === 'zones') {
          setFieldSelectorEventId(data[0].id);
          setFieldSelectorEventName(buttonLabel ?? eventType?.name ?? 'Action');
          setShowZoneSelector(true);
        }
      }
    }
  };

  const handleZoneSelected = async (zoneButtonId: string, _zoneLabel: string) => {
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

  const handleFieldPositionSelected = async (x: number, y: number) => {
    if (fieldSelectorEventId) {
      await supabase
        .from('match_events')
        .update({ field_x: x, field_y: y })
        .eq('id', fieldSelectorEventId);

      setEvents(prev =>
        prev.map(e => e.id === fieldSelectorEventId ? { ...e, field_x: x, field_y: y } : e)
      );

      // Vérifier si le bouton a le mode field_and_goal
      const lastBtn = panelButtons.find(b => b.id === lastEventButtonId);
      const locMode = lastBtn?.location_mode ?? 'none';

      setShowFieldSelector(false);

      if (locMode === 'field_and_goal') {
        // Afficher le sélecteur de résultat avant la cage
        setShowOutcomeSelector(true);
      } else {
        setFieldSelectorEventId(null);
        setFieldSelectorEventName('');
      }
    }
  };

  const handleOutcomeSelected = async (outcome: 'success' | 'failure' | 'neutral') => {
    if (fieldSelectorEventId) {
      await supabase
        .from('match_events')
        .update({ outcome })
        .eq('id', fieldSelectorEventId);

      setEvents(prev =>
        prev.map(e => e.id === fieldSelectorEventId ? { ...e, outcome } : e)
      );
    }
    setShowOutcomeSelector(false);
    // Passer à la cage de but
    setShowGoalSelector(true);
  };

  const handleGoalPositionSelected = async (x: number, y: number) => {
    if (fieldSelectorEventId) {
      await supabase
        .from('match_events')
        .update({ goal_x: x, goal_y: y })
        .eq('id', fieldSelectorEventId);

      setEvents(prev =>
        prev.map(e => e.id === fieldSelectorEventId ? { ...e, goal_x: x, goal_y: y } : e)
      );
    }
    setShowGoalSelector(false);
    setFieldSelectorEventId(null);
    setFieldSelectorEventName('');
  };

  const handleSkipFieldSelector = () => {
    setShowFieldSelector(false);
    setShowGoalSelector(false);
    setShowOutcomeSelector(false);
    setShowZoneSelector(false);
    setFieldSelectorEventId(null);
    setFieldSelectorEventName('');
  };

  const handleZoneSelectorSelected = async (zone: string, x: number, y: number) => {
    // Pour l'équipe B (droite→gauche), inverser x pour que la zone défensive soit bien à droite
    const adjustedX = selectedTeam === 'B' ? 100 - x : x;
    if (fieldSelectorEventId) {
      await supabase
        .from('match_events')
        .update({ field_x: adjustedX, field_y: y, label: zone })
        .eq('id', fieldSelectorEventId);

      setEvents(prev =>
        prev.map(e => e.id === fieldSelectorEventId ? { ...e, field_x: adjustedX, field_y: y } : e)
      );
    }
    setShowZoneSelector(false);
    setFieldSelectorEventId(null);
    setFieldSelectorEventName('');
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
    } else {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  const handleUndo = async () => {
    if (!undoEvent) return;
    await handleDeleteEvent(undoEvent.id);
    setUndoEvent(null);
    setShowUndoBar(false);
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
    } else {
      // Verrouiller le panneau actif par défaut
      setMatchSheetPanelId(selectedPanelId);
    }
  };

  const handleKickoff = (realTime: Date) => {
    setKickoffRealTime(realTime);
    if (matchId) {
      supabase.from('matches').update({ kickoff_real_time: realTime.toISOString() }).eq('id', matchId);
    }
  };

  const loadSavedCompositions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: formations } = await supabase
      .from('team_formations')
      .select('*, formation_positions(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (formations) {
      // Récupérer les noms d'équipes liées
      const teamIds = [...new Set(formations.map((f: any) => f.team_id).filter(Boolean))];
      let teamsMap: Record<string, string> = {};
      if (teamIds.length > 0) {
        const { data: teams } = await supabase.from('teams').select('id, name').in('id', teamIds);
        if (teams) {
          teams.forEach((t: any) => { teamsMap[t.id] = t.name; });
        }
      }

      const composWithTeam = formations.map((f: any) => ({
        ...f,
        team_name: teamsMap[f.team_id] || 'Équipe',
        positions_count: f.formation_positions?.filter((p: any) => p.player_id).length || 0,
        total_positions: f.formation_positions?.length || 0,
      }));

      setSavedCompositions(composWithTeam);
    }
    setShowCompoSelector(true);
  };

  const applyComposition = async (compoId: string) => {
    if (!matchId) return;
    const compo = savedCompositions.find((c: any) => c.id === compoId);
    if (!compo) return;

    // Sauvegarder le lien match-formation
    await supabase.from('match_formations').upsert({
      match_id: matchId,
      formation_id: compoId,
      team: 'A',
    }, { onConflict: 'match_id,team' });

    setSelectedCompoId(compoId);
    setShowCompoSelector(false);
  };

  // Calcule le décalage VEO : on saisit le timecode VEO du coup d'envoi (ex: "2:34")
  // VEO offset = secondes VEO au coup d'envoi
  const handleVeoSync = async () => {
    if (!veoUrl || !kickoffRealTime || !veoKickoffInput) return;

    const parts = veoKickoffInput.split(':').map(Number);
    const veoKickoffSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
    setVeoOffsetSeconds(veoKickoffSeconds);

    if (matchId) {
      await supabase.from('matches').update({
        video_url: veoUrl,
        video_provider: 'veo',
      }).eq('id', matchId);

      // Mettre à jour le video_timestamp de chaque événement
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('id, timestamp')
        .eq('match_id', matchId);

      if (eventsData) {
        for (const ev of eventsData) {
          const videoTs = veoKickoffSeconds + ev.timestamp;
          await supabase.from('match_events').update({ video_timestamp: videoTs }).eq('id', ev.id);
        }
      }
      await loadEvents();
    }
    setShowVeoSync(false);
  };

  const buildVeoLink = (videoTimestamp: number): string => {
    if (!veoUrl) return '';
    const base = veoUrl.split('?')[0];
    return `${base}?t=${videoTimestamp}`;
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

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', color:'var(--orion-text)' }}>
      <div style={{ maxWidth:1400, margin:'0 auto' }}>

        {/* TOP BAR */}
        <header style={{ display:'flex', alignItems:'center', gap:18, height:56, padding:'0 24px', borderBottom:'1px solid var(--orion-line)', position:'sticky', top:0, background:'var(--orion-bg)', zIndex:40 }}>
          {onBack && (
            <button onClick={handleBack} className="o-btn o-btn--ghost o-btn--sm" style={{ padding:'6px 8px' }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div style={{ width:'1px', background:'var(--orion-line)', alignSelf:'stretch' }} />
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, fontFamily:'var(--orion-font-mono)', letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--orion-text-mute)' }}>
              Codage Live
            </span>
            {isRunning && (
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--orion-red)', fontFamily:'var(--orion-font-mono)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--orion-red)', animation:'pulse 1s infinite' }} />
                EN DIRECT
              </span>
            )}
            {championship && (
              <span style={{ fontSize:11, color:'var(--orion-text-mute)' }}>· {championship}</span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <ExportButton
              events={events}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAColor={teamAColor}
              teamBColor="#f97316"
              scoreA={teamAScore}
              scoreB={teamBScore}
              duration={currentTime}
            />
            <button onClick={() => setIsMatchSheetOpen(true)} className="o-btn o-btn--sm">
              Fiche Match
            </button>
            <button
              onClick={loadSavedCompositions}
              className="o-btn o-btn--sm"
              style={selectedCompoId ? { borderColor:'var(--orion-green)', color:'var(--orion-green)' } : {}}
            >
              {selectedCompoId ? '✓ Compo' : 'Compo'}
            </button>
            <button onClick={() => setShowHalftimeReport(true)} className="o-btn o-btn--sm" style={{ borderColor:'var(--orion-amber)', color:'var(--orion-amber)' }}>
              Mi-Temps
            </button>
            <button onClick={handleEndMatch} className="o-btn o-btn--sm" style={{ borderColor:'var(--orion-red)', color:'var(--orion-red)' }}>
              Fin de match
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6" style={{ padding:'20px 24px' }}>
          <div className="lg:col-span-2 space-y-6">
            {(championship || matchday || location || matchDate) && (
              <div style={{ background:"var(--orion-surface)", border:"1px solid var(--orion-line)", padding:"20px" }}>
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
              kickoffRealTime={kickoffRealTime}
              onKickoff={handleKickoff}
              onOpenFormation={(team) => {
                setFormationTeam(team);
                setShowFormationManager(true);
              }}
            />

            {/* Barre Undo */}
            {showUndoBar && undoEvent && (
              <div style={{ position:'relative', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', overflow:'hidden' }}>
                {/* Barre de progression */}
                <div style={{ position:'absolute', bottom:0, left:0, height:2, background:'var(--orion-amber)', animation:'undoProgress 8s linear forwards' }} />
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, color:'var(--orion-amber)', fontWeight:500 }}>
                    ✓ {undoEvent.event_type?.name || undoEvent.label || 'Action'} enregistré
                  </span>
                  <span className="o-num" style={{ fontSize:10, color:'var(--orion-text-mute)' }}>
                    {Math.floor(undoEvent.timestamp / 60).toString().padStart(2,'0')}:{(undoEvent.timestamp % 60).toString().padStart(2,'0')}
                  </span>
                </div>
                <button onClick={handleUndo} className="o-btn o-btn--sm" style={{ borderColor:'var(--orion-amber)', color:'var(--orion-amber)', fontSize:11 }}>
                  ↩ Annuler (Ctrl+Z)
                </button>
              </div>
            )}

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
              dualTeamMode={true}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAColor={teamAColor}
              onSelectTeam={setSelectedTeam}
            />

            <Statistics
              events={events}
              teamAName={teamAName}
              teamBName={teamBName}
              halftimes={halftimes}
            />
          </div>

          <div className="lg:col-span-1">
            <Timeline
              events={events}
              onDeleteEvent={handleDeleteEvent}
              teamAName={teamAName}
              teamBName={teamBName}
              veoUrl={veoUrl}
              buildVeoLink={buildVeoLink}
            />
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
      {showCompoSelector && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary border border-blue-800/50  p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Choisir une composition</h2>
            <p className="text-sm text-gray-400 mb-5">
              {"S\u00e9lectionnez la composition \u00e0 utiliser pour ce match"}
            </p>

            {savedCompositions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">Aucune composition sauvegardée</p>
                <p className="text-xs text-gray-600">{"Cr\u00e9ez des compositions dans Mes \u00c9quipes d\u2019abord"}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                {savedCompositions.map((compo: any) => (
                  <button
                    key={compo.id}
                    onClick={() => applyComposition(compo.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg text-left transition-all ${
                      selectedCompoId === compo.id
                        ? 'bg-blue-900/30 border-2 border-blue-500'
                        : 'bg-dark-tertiary border border-gray-700 hover:border-blue-800/50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {compo.name?.match(/\d[-]\d[-]?\d?/)?.[0] || 'FC'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{compo.name}</div>
                      <div className="text-xs text-gray-500">
                        {compo.team_name} — {compo.positions_count}/{compo.total_positions} joueurs
                      </div>
                    </div>
                    {compo.is_active && (
                      <span className="text-[9px] bg-green-600 text-white px-2 py-0.5 rounded font-medium">Actif</span>
                    )}
                    {selectedCompoId === compo.id && (
                      <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded font-medium">Match</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCompoSelector(false)}
                className="flex-1 py-2 bg-dark-tertiary hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showFieldSelector && (
        <FieldPositionSelector
          onPositionSelected={handleFieldPositionSelected}
          onSkip={handleSkipFieldSelector}
          eventName={fieldSelectorEventName}
        />
      )}

      {/* Banner restauration backup */}
      {backupToRestore && (
        <div style={{ padding:'10px 24px', background:'rgba(245,158,11,0.12)', borderBottom:'1px solid rgba(245,158,11,0.3)', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--orion-amber)', flex:1 }}>
            ⚡ Backup trouvé — {backupToRestore.events.length} actions du {new Date(backupToRestore.savedAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
          </span>
          <button
            onClick={() => {
              setEvents(backupToRestore.events);
              setCurrentTime(backupToRestore.currentTime || 0);
              setTeamAScore(backupToRestore.teamAScore || 0);
              setTeamBScore(backupToRestore.teamBScore || 0);
              setBackupToRestore(null);
            }}
            className="o-btn o-btn--sm"
            style={{ borderColor:'var(--orion-amber)', color:'var(--orion-amber)', fontSize:11 }}
          >
            Restaurer
          </button>
          <button
            onClick={() => { localStorage.removeItem(`orion_backup_${matchId}`); setBackupToRestore(null); }}
            className="o-btn o-btn--ghost o-btn--sm"
            style={{ fontSize:11 }}
          >
            Ignorer
          </button>
        </div>
      )}

      {/* Modal confirmation fin de match */}
      {showEndMatchConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.85)', backdropFilter:'blur(4px)', display:'grid', placeItems:'center', zIndex:200 }}>
          <div style={{ width:'min(380px, 92vw)', background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', padding:'28px 24px' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--orion-text)', marginBottom:8 }}>Terminer le match ?</div>
            <div style={{ fontSize:12, color:'var(--orion-text-mute)', marginBottom:24 }}>
              Le match sera enregistré dans vos statistiques avec le score actuel&nbsp;
              <span style={{ color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)' }}>
                {teamAScore} – {teamBScore}
              </span>
              &nbsp;et la durée&nbsp;
              <span style={{ color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)' }}>
                {Math.floor(currentTime / 60)}'
              </span>.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowEndMatchConfirm(false)} className="o-btn o-btn--ghost" style={{ flex:1, justifyContent:'center' }}>
                Annuler
              </button>
              <button onClick={confirmEndMatch} className="o-btn" style={{ flex:1, justifyContent:'center', borderColor:'var(--orion-red)', color:'var(--orion-red)' }}>
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {showHalftimeReport && (
        <HalftimeReport
          events={events}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAScore={teamAScore}
          teamBScore={teamBScore}
          teamAColor={teamAColor}
          teamBColor="#f97316"
          currentTime={currentTime}
          onClose={() => setShowHalftimeReport(false)}
        />
      )}

      {showZoneSelector && (
        <ZoneSelector
          onZoneSelected={handleZoneSelectorSelected}
          onSkip={handleSkipFieldSelector}
          eventName={fieldSelectorEventName}
        />
      )}

      {showOutcomeSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary border-2 border-orange-primary  w-full max-w-sm p-6">
            <h2 className="font-bold text-white text-lg mb-1 text-center">Résultat du tir</h2>
            <p className="text-xs text-gray-400 mb-6 text-center">{fieldSelectorEventName}</p>
            <div className="space-y-3">
              <button
                onClick={() => handleOutcomeSelected('success')}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white  text-lg font-bold transition-colors"
              >
                But
              </button>
              <button
                onClick={() => handleOutcomeSelected('neutral')}
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white  text-lg font-bold transition-colors"
              >
                Arrêté / Cadré
              </button>
              <button
                onClick={() => handleOutcomeSelected('failure')}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white  text-lg font-bold transition-colors"
              >
                Hors cadre / Manqué
              </button>
            </div>
            <button
              onClick={handleSkipFieldSelector}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Passer
            </button>
          </div>
        </div>
      )}

      {showGoalSelector && (
        <GoalZoneSelector
          onPositionSelected={handleGoalPositionSelected}
          onSkip={handleSkipFieldSelector}
        />
      )}

      {showVeoSync && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary border border-yellow-800/50  p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              Synchronisation VEO
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Après le match, collez le lien VEO et indiquez à quelle minute la vidéo VEO montre le coup d'envoi.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Lien de partage VEO</label>
                <input
                  type="text"
                  value={veoUrl}
                  onChange={e => setVeoUrl(e.target.value)}
                  placeholder="https://app.veo.co/matches/..."
                  className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                />
              </div>

              {kickoffRealTime ? (
                <div className="bg-dark-tertiary rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Coup d&apos;envoi enregistré dans ORION</p>
                  <p className="text-sm font-mono text-yellow-400">
                    {kickoffRealTime.toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ) : (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <p className="text-xs text-red-400">! Pas de coup d&apos;envoi enregistré. Pendant le prochain match, appuyez sur &quot;Coup d&apos;envoi&quot; au moment exact du début.</p>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  À quel timecode VEO voit-on le coup d&apos;envoi ? (ex: 2:34)
                </label>
                <input
                  type="text"
                  value={veoKickoffInput}
                  onChange={e => setVeoKickoffInput(e.target.value)}
                  placeholder="2:34"
                  className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 font-mono"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Ouvrez VEO, trouvez le coup d&apos;envoi, notez le timecode affiché
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVeoSync(false)}
                className="flex-1 py-2 bg-dark-tertiary hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleVeoSync}
                disabled={!veoUrl || !veoKickoffInput}
                className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Synchroniser
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
