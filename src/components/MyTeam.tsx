import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Users, Settings, Plus, ChevronRight, Shield, BarChart2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import FieldVisualization from './FieldVisualization';
import PlayerForm from './PlayerForm';
import { exportTeamPdf } from '../utils/exportTeamPdf';
import { useT } from '../i18n/I18nContext';
import TeamSettings from './TeamSettings';
import PlayerSeasonStats from './PlayerSeasonStats';

interface MyTeamProps {
  onBack: () => void;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  user_id: string;
  team_id?: string;
  photo_url?: string;
}

interface Formation {
  id: string;
  name: string;
  is_active: boolean;
  team_id?: string;
}

interface FormationPosition {
  id: string;
  formation_id: string;
  player_id: string | null;
  position_x: number;
  position_y: number;
  role: string;
}

interface Team {
  id: string;
  name: string;
  category: string;
  logo_url: string;
  description: string;
  founded_year: number | null;
  colors: {
    primary: string;
    secondary: string;
  };
  user_id: string;
}

const FORMATIONS = {
  '4-4-2': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 20, y: 50 },
    { role: 'MF', x: 40, y: 50 },
    { role: 'MF', x: 60, y: 50 },
    { role: 'MF', x: 80, y: 50 },
    { role: 'FW', x: 35, y: 25 },
    { role: 'FW', x: 65, y: 25 },
  ],
  '4-3-3': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 30, y: 50 },
    { role: 'MF', x: 50, y: 50 },
    { role: 'MF', x: 70, y: 50 },
    { role: 'FW', x: 25, y: 25 },
    { role: 'FW', x: 50, y: 20 },
    { role: 'FW', x: 75, y: 25 },
  ],
  '3-5-2': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 30, y: 75 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 70, y: 75 },
    { role: 'MF', x: 15, y: 50 },
    { role: 'MF', x: 35, y: 50 },
    { role: 'MF', x: 50, y: 55 },
    { role: 'MF', x: 65, y: 50 },
    { role: 'MF', x: 85, y: 50 },
    { role: 'FW', x: 35, y: 25 },
    { role: 'FW', x: 65, y: 25 },
  ],
  '5-3-2': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 15, y: 75 },
    { role: 'DF', x: 32, y: 75 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 68, y: 75 },
    { role: 'DF', x: 85, y: 75 },
    { role: 'MF', x: 30, y: 50 },
    { role: 'MF', x: 50, y: 50 },
    { role: 'MF', x: 70, y: 50 },
    { role: 'FW', x: 35, y: 25 },
    { role: 'FW', x: 65, y: 25 },
  ],
  '3-4-3': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 30, y: 75 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 70, y: 75 },
    { role: 'MF', x: 20, y: 50 },
    { role: 'MF', x: 40, y: 50 },
    { role: 'MF', x: 60, y: 50 },
    { role: 'MF', x: 80, y: 50 },
    { role: 'FW', x: 25, y: 25 },
    { role: 'FW', x: 50, y: 20 },
    { role: 'FW', x: 75, y: 25 },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 35, y: 60 },
    { role: 'MF', x: 65, y: 60 },
    { role: 'MF', x: 25, y: 40 },
    { role: 'MF', x: 50, y: 35 },
    { role: 'MF', x: 75, y: 40 },
    { role: 'FW', x: 50, y: 20 },
  ],
  '4-5-1': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 15, y: 50 },
    { role: 'MF', x: 32, y: 50 },
    { role: 'MF', x: 50, y: 50 },
    { role: 'MF', x: 68, y: 50 },
    { role: 'MF', x: 85, y: 50 },
    { role: 'FW', x: 50, y: 20 },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 50, y: 60 },
    { role: 'MF', x: 15, y: 40 },
    { role: 'MF', x: 38, y: 40 },
    { role: 'MF', x: 62, y: 40 },
    { role: 'MF', x: 85, y: 40 },
    { role: 'FW', x: 50, y: 20 },
  ],
  '4-4-1-1': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 20, y: 52 },
    { role: 'MF', x: 40, y: 52 },
    { role: 'MF', x: 60, y: 52 },
    { role: 'MF', x: 80, y: 52 },
    { role: 'FW', x: 50, y: 32 },
    { role: 'FW', x: 50, y: 17 },
  ],
  '4-3-1-2': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 30, y: 55 },
    { role: 'MF', x: 50, y: 55 },
    { role: 'MF', x: 70, y: 55 },
    { role: 'MF', x: 50, y: 35 },
    { role: 'FW', x: 35, y: 20 },
    { role: 'FW', x: 65, y: 20 },
  ],
  '4-1-2-3': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 20, y: 75 },
    { role: 'DF', x: 40, y: 75 },
    { role: 'DF', x: 60, y: 75 },
    { role: 'DF', x: 80, y: 75 },
    { role: 'MF', x: 50, y: 60 },
    { role: 'MF', x: 35, y: 42 },
    { role: 'MF', x: 65, y: 42 },
    { role: 'FW', x: 25, y: 22 },
    { role: 'FW', x: 50, y: 17 },
    { role: 'FW', x: 75, y: 22 },
  ],
  '5-4-1': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 15, y: 75 },
    { role: 'DF', x: 32, y: 75 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 68, y: 75 },
    { role: 'DF', x: 85, y: 75 },
    { role: 'MF', x: 20, y: 47 },
    { role: 'MF', x: 40, y: 47 },
    { role: 'MF', x: 60, y: 47 },
    { role: 'MF', x: 80, y: 47 },
    { role: 'FW', x: 50, y: 20 },
  ],
  '3-4-1-2': [
    { role: 'GK', x: 50, y: 95 },
    { role: 'DF', x: 30, y: 75 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 70, y: 75 },
    { role: 'MF', x: 15, y: 50 },
    { role: 'MF', x: 38, y: 52 },
    { role: 'MF', x: 62, y: 52 },
    { role: 'MF', x: 85, y: 50 },
    { role: 'MF', x: 50, y: 35 },
    { role: 'FW', x: 35, y: 20 },
    { role: 'FW', x: 65, y: 20 },
  ],
};

export default function MyTeam({ onBack }: MyTeamProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const { addToast } = useToastContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [formation, setFormation] = useState<Formation | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<keyof typeof FORMATIONS>('4-4-2');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'composition' | 'squad' | 'stats'>('composition');
  const [showNewCompoForm, setShowNewCompoForm] = useState(false);
  const [newCompoName, setNewCompoName] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (!error && data) setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    setView('detail');
    await loadTeamDetail(team.id);
  };

  const loadTeamDetail = async (teamId: string) => {
    setLoadingDetail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [playersRes, formationsRes] = await Promise.all([
        supabase.from('players').select('*').eq('user_id', user.id).eq('team_id', teamId).order('number'),
        supabase.from('team_formations').select('*').eq('user_id', user.id).eq('team_id', teamId).order('created_at'),
      ]);

      if (playersRes.data) setPlayers(playersRes.data);

      if (formationsRes.data && formationsRes.data.length > 0) {
        setFormations(formationsRes.data);
        const active = formationsRes.data.find((f: any) => f.is_active) || formationsRes.data[0];
        setFormation(active);
        setSelectedFormation(active.name as keyof typeof FORMATIONS);
        const positionsRes = await supabase
          .from('formation_positions')
          .select('*')
          .eq('formation_id', active.id);
        if (positionsRes.data) setPositions(positionsRes.data);
      } else {
        await createDefaultFormation(teamId);
      }
    } catch (error) {
      console.error('Error loading team detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const createDefaultFormation = async (teamId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newFormation, error: formationError } = await supabase
        .from('team_formations')
        .insert({ user_id: user.id, name: '4-4-2', is_active: true, team_id: teamId })
        .select()
        .single();

      if (formationError) throw formationError;

      const formationPositions = FORMATIONS['4-4-2'].map(pos => ({
        formation_id: newFormation.id,
        position_x: pos.x,
        position_y: pos.y,
        role: pos.role,
        player_id: null,
      }));

      const { data: newPositions, error: positionsError } = await supabase
        .from('formation_positions')
        .insert(formationPositions)
        .select();

      if (positionsError) throw positionsError;

      setFormation(newFormation);
      setPositions(newPositions || []);
      setSelectedFormation('4-4-2');
    } catch (error) {
      console.error('Error creating formation:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Supprimer cette équipe ? Tous les joueurs et formations associés seront supprimés.')) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      await loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleSavePlayer = async (playerData: Omit<Player, 'id' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (editingPlayer) {
      const { error } = await supabase
        .from('players')
        .update(playerData)
        .eq('id', editingPlayer.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('players')
        .insert({ ...playerData, user_id: user.id, team_id: selectedTeam?.id });
      if (error) throw error;
    }

    if (selectedTeam) await loadTeamDetail(selectedTeam.id);
    setShowPlayerForm(false);
    setEditingPlayer(null);
    addToast(editingPlayer ? 'Joueur modifié ✓' : 'Joueur ajouté ✓', 'success');
  };

  const handleExportTeamPdf = () => {
    if (!selectedTeam) {
      setError('Aucune équipe sélectionnée');
      return;
    }
    try {
      exportTeamPdf({
        teamName: selectedTeam.name,
        category: selectedTeam.category || 'Senior',
        logoUrl: selectedTeam.logo_url || undefined,
        formation: selectedFormation || '4-2-3-1',
        players: players || [],
        positions: (positions || []).map(p => ({
          player_id: p.player_id,
          position_x: p.position_x,
          position_y: p.position_y,
          role: p.role,
        })),
      });
    } catch (err: any) {
      setError('Erreur export PDF: ' + (err?.message || err));
    }
  };

  const handleCreateComposition = async () => {
    if (!selectedTeam || !newCompoName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Désactiver toutes les formations existantes
      await supabase.from('team_formations').update({ is_active: false }).eq('team_id', selectedTeam.id).eq('user_id', user.id);

      const { data: newFormation } = await supabase
        .from('team_formations')
        .insert({ user_id: user.id, team_id: selectedTeam.id, name: selectedFormation, is_active: true })
        .select()
        .single();

      if (newFormation) {
        // Créer les positions vides
        const formationPositions = FORMATIONS[selectedFormation].map(pos => ({
          formation_id: newFormation.id,
          player_id: null,
          position_x: pos.x,
          position_y: pos.y,
          role: pos.role,
        }));
        await supabase.from('formation_positions').insert(formationPositions);

        // Renommer avec le nom custom
        await supabase.from('team_formations').update({ name: newCompoName.trim() }).eq('id', newFormation.id);
        newFormation.name = newCompoName.trim();

        setFormations(prev => [...prev, newFormation]);
        setFormation(newFormation);
        const { data: posData } = await supabase.from('formation_positions').select('*').eq('formation_id', newFormation.id);
        if (posData) setPositions(posData);
      }
      setShowNewCompoForm(false);
      setNewCompoName('');
    } catch (err) {
      console.error('Error creating composition:', err);
    }
  };

  const handleSwitchComposition = async (compoId: string) => {
    if (!selectedTeam) return;
    const compo = formations.find(f => f.id === compoId);
    if (!compo) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Désactiver toutes puis activer celle-ci
      await supabase.from('team_formations').update({ is_active: false }).eq('team_id', selectedTeam.id).eq('user_id', user.id);
      await supabase.from('team_formations').update({ is_active: true }).eq('id', compoId);

      setFormation(compo);
      setSelectedFormation(compo.name as keyof typeof FORMATIONS || '4-4-2');
      setFormations(prev => prev.map(f => ({ ...f, is_active: f.id === compoId })));

      const { data: posData } = await supabase.from('formation_positions').select('*').eq('formation_id', compoId);
      if (posData) setPositions(posData);
    } catch (err) {
      console.error('Error switching composition:', err);
    }
  };

  const handleDeleteComposition = async (compoId: string) => {
    if (formations.length <= 1) return; // Garder au moins 1
    try {
      await supabase.from('formation_positions').delete().eq('formation_id', compoId);
      await supabase.from('team_formations').delete().eq('id', compoId);
      const remaining = formations.filter(f => f.id !== compoId);
      setFormations(remaining);
      if (formation?.id === compoId && remaining.length > 0) {
        handleSwitchComposition(remaining[0].id);
      }
    } catch (err) {
      console.error('Error deleting composition:', err);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      if (selectedTeam) await loadTeamDetail(selectedTeam.id);
      addToast('Joueur supprimé', 'success');
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handlePositionClick = async (positionId: string, currentPlayerId: string | null) => {
    if (currentPlayerId && confirm('Voulez-vous retirer ce joueur de cette position ?')) {
      try {
        const { error } = await supabase
          .from('formation_positions')
          .update({ player_id: null })
          .eq('id', positionId);
        if (error) throw error;
        if (formation) {
          const positionsRes = await supabase
            .from('formation_positions')
            .select('*')
            .eq('formation_id', formation.id);
          if (positionsRes.data) setPositions(positionsRes.data);
        }
      } catch (error) {
        console.error('Error removing player:', error);
      }
    }
  };

  const handleAssignPlayer = async (positionId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('formation_positions')
        .update({ player_id: playerId })
        .eq('id', positionId);
      if (error) throw error;
      if (formation) {
        const positionsRes = await supabase
          .from('formation_positions')
          .select('*')
          .eq('formation_id', formation.id);
        if (positionsRes.data) setPositions(positionsRes.data);
      }
    } catch (error) {
      console.error('Error assigning player:', error);
    }
  };

  const handleChangeFormation = async (formationName: keyof typeof FORMATIONS) => {
    if (!formation) return;
    try {
      await supabase.from('formation_positions').delete().eq('formation_id', formation.id);

      const formationPositions = FORMATIONS[formationName].map(pos => ({
        formation_id: formation.id,
        position_x: pos.x,
        position_y: pos.y,
        role: pos.role,
        player_id: null,
      }));

      const { data: newPositions } = await supabase
        .from('formation_positions')
        .insert(formationPositions)
        .select();

      await supabase
        .from('team_formations')
        .update({ name: formationName })
        .eq('id', formation.id);

      setSelectedFormation(formationName);
      setPositions(newPositions || []);
      setFormation({ ...formation, name: formationName });
    } catch (error) {
      console.error('Error changing formation:', error);
    }
  };

  if (view === 'detail' && selectedTeam) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--orion-bg)', padding:16 }}>
        <div className="max-w-7xl mx-auto">
          {/* Hero sombre */}
          <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'22px 24px 20px', color:'#fff', marginBottom:20, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
            <div style={{ position:'absolute', top:0, right:0, width:320, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              {/* Logo équipe */}
              {selectedTeam.logo_url ? (
                <img src={selectedTeam.logo_url} alt={selectedTeam.name} style={{ width:56, height:56, borderRadius:12, objectFit:'cover', border:'2px solid rgba(255,255,255,0.15)', flexShrink:0 }} />
              ) : (
                <div style={{ width:56, height:56, borderRadius:12, background:'rgba(61,128,224,0.2)', border:'2px solid rgba(61,128,224,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Shield size={24} style={{ color:'var(--orion-accent)' }} />
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:6 }}>Mes Équipes</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff' }}>{selectedTeam.name}</h1>
                  {selectedTeam.category && (
                    <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(61,128,224,0.2)', border:'1px solid rgba(61,128,224,0.4)', color:'#7ab4f0' }}>{selectedTeam.category}</span>
                  )}
                </div>
                {selectedTeam.description && <p style={{ margin:'4px 0 0', fontSize:12, color:'#8aa0bd' }}>{selectedTeam.description}</p>}
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button onClick={() => { setView('list'); setSelectedTeam(null); }} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:999, fontSize:12, fontWeight:600, color:'#dbe3ee', cursor:'pointer' }}>← Retour</button>
                <button onClick={() => { setEditingTeamId(selectedTeam.id); setShowTeamSettings(true); }} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:999, fontSize:12, fontWeight:600, color:'#dbe3ee', cursor:'pointer' }}>
                  <Settings size={14} /> Paramètres
                </button>
                <button onClick={handleExportTeamPdf} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-accent)', border:'none', borderRadius:999, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(61,128,224,0.4)' }}>
                  <Download size={14} /> Fiche PDF
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mb-6 bg-dark-secondary border border-orion-line rounded-xl p-1">
            {([
              { key: 'composition', label: 'Composition', icon: Shield },
              { key: 'squad', label: 'Effectif', icon: Users },
              { key: 'stats', label: 'Stats saison', icon: BarChart2 },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === key
                    ? 'bg-orange-primary text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400">Chargement...</div>
            </div>
          ) : activeTab === 'composition' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* Sélecteur de compositions */}
                <div className="bg-dark-secondary border border-orion-line rounded-lg shadow-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Compositions</h3>
                    <button
                      onClick={() => setShowNewCompoForm(!showNewCompoForm)}
                      className="text-xs px-3 py-1.5 bg-orange-primary hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
                    >
                      + Nouvelle
                    </button>
                  </div>

                  {showNewCompoForm && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newCompoName}
                        onChange={e => setNewCompoName(e.target.value)}
                        placeholder="Nom de la composition (ex: vs Toulouse)"
                        className="flex-1 px-3 py-2 bg-dark-tertiary border border-orion-line rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={handleCreateComposition}
                        disabled={!newCompoName.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Créer
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {formations.map(f => (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 px-3 py-2  text-sm cursor-pointer transition-all ${
                          formation?.id === f.id
                            ? 'bg-orange-primary/20 border-2 border-orion-accent text-white'
                            : 'bg-dark-tertiary border border-orion-line text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                        onClick={() => handleSwitchComposition(f.id)}
                      >
                        <span className="font-medium">{f.name}</span>
                        {f.is_active && <span className="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded">Actif</span>}
                        {formations.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteComposition(f.id); }}
                            className="text-gray-600 hover:text-red-400 transition-colors ml-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-dark-secondary border border-orion-line rounded-lg shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Composition Tactique</h2>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-300">Formation:</label>
                      <select
                        value={selectedFormation}
                        onChange={(e) => handleChangeFormation(e.target.value as keyof typeof FORMATIONS)}
                        className="px-3 py-2 bg-dark-tertiary border border-orion-line text-white rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-orion-accent"
                      >
                        {Object.keys(FORMATIONS).map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ maxHeight: 480, overflow: 'hidden' }}>
                    <FieldVisualization
                      players={players}
                      positions={positions}
                      onPositionClick={handlePositionClick}
                      onAssignPlayer={handleAssignPlayer}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-dark-secondary border border-orion-line rounded-lg shadow-2xl p-4">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Joueurs disponibles</h3>
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                    {players.filter(p => !positions.some(pos => pos.player_id === p.id)).length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">Tous les joueurs sont placés</p>
                    ) : (
                      players.filter(p => !positions.some(pos => pos.player_id === p.id)).map(player => (
                        <div
                          key={player.id}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('playerId', player.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => {
                            const emptyPos = positions.find(pos => pos.player_id === null);
                            if (emptyPos) {
                              handleAssignPlayer(emptyPos.id, player.id);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-2.5  bg-dark-tertiary hover:bg-dark-tertiary border border-orion-line/50 hover:border-orion-accent/50 transition-all text-left group cursor-grab active:cursor-grabbing select-none"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                            player.position === 'GK' ? 'bg-yellow-500' :
                            player.position === 'DF' ? 'bg-blue-500' :
                            player.position === 'MF' ? 'bg-green-500' :
                            player.position === 'FW' || player.position === 'AT' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}>
                            {player.number || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {player.first_name || ''} {player.last_name || (player as any).name || '' || ''}
                            </div>
                            <div className="text-[10px] text-gray-500">{player.position || 'N/A'}</div>
                          </div>
                          <span className="text-[10px] text-gray-600 group-hover:text-orion-accent transition-colors">
                            + Placer
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {positions.some(pos => pos.player_id !== null) && (
                    <>
                      <div className="border-t border-orion-line mt-4 pt-3">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Sur le terrain</h3>
                        <div className="space-y-1.5">
                          {positions.filter(pos => pos.player_id !== null).map(pos => {
                            const player = players.find(p => p.id === pos.player_id);
                            if (!player) return null;
                            return (
                              <div
                                key={pos.id}
                                className="flex items-center gap-3 p-2.5  bg-dark-tertiary border border-orion-line/50"
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                  pos.role === 'GK' ? 'bg-yellow-500' :
                                  pos.role === 'DF' ? 'bg-blue-500' :
                                  pos.role === 'MF' ? 'bg-green-500' :
                                  'bg-red-500'
                                }`}>
                                  {player.number || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">
                                    {player.first_name || ''} {player.last_name || (player as any).name || '' || ''}
                                  </div>
                                  <div className="text-[10px] text-gray-500">{pos.role}</div>
                                </div>
                                <button
                                  onClick={() => handlePositionClick(pos.id, pos.player_id)}
                                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Retirer
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'squad' ? (
            <div className="bg-dark-secondary border border-orion-line rounded-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-white">Effectif</h2>
                <button
                  onClick={() => { setEditingPlayer(null); setShowPlayerForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-primary text-white rounded-lg hover-orange transition-colors"
                >
                  <UserPlus size={18} />
                  Ajouter
                </button>
              </div>
              {players.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={48} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-xs text-white-mute">Aucun joueur dans l'effectif</p>
                  <p className="text-gray-600 text-xs mt-1">Ajoutez vos premiers joueurs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {players.map((player) => {
                    const isAssigned = positions.some(pos => pos.player_id === player.id);
                    const pos = (player.position || '').toUpperCase();
                    const circleColor = pos === 'GK' ? '#E6A817'
                      : pos.startsWith('D') ? 'var(--orion-accent)'
                      : pos.startsWith('M') ? 'var(--orion-green)'
                      : pos.startsWith('A') || pos === 'BU' ? 'var(--orion-red)'
                      : 'var(--orion-text-mute)';
                    return (
                      <div
                        key={player.id}
                        style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'12px 14px', borderRadius:10,
                          background: isAssigned ? 'rgba(31,168,90,0.06)' : 'var(--orion-surface)',
                          border: `1.5px solid ${isAssigned ? 'rgba(31,168,90,0.3)' : 'var(--orion-line)'}`,
                          transition:'all .12s',
                        }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                          {player.photo_url ? (
                            <div style={{ position:'relative', flexShrink:0 }}>
                              <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`}
                                style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--orion-line)' }} />
                              <div style={{ position:'absolute', bottom:-2, right:-2, width:18, height:18, borderRadius:'50%', background:circleColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff', border:'1.5px solid var(--orion-surface)' }}>
                                {player.number}
                              </div>
                            </div>
                          ) : (
                            <div style={{ width:38, height:38, borderRadius:'50%', background:circleColor, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', flexShrink:0, fontSize:13, fontFamily:'var(--orion-font-mono)' }}>
                              {player.number}
                            </div>
                          )}
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, color:'var(--orion-text)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {player.first_name} {player.last_name}
                            </div>
                            <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:2 }}>{player.position}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <button onClick={() => { setEditingPlayer(player); setShowPlayerForm(true); }}
                            style={{ padding:6, borderRadius:6, border:'none', background:'none', cursor:'pointer', color:'var(--orion-accent)' }}>
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDeletePlayer(player.id)}
                            style={{ padding:6, borderRadius:6, border:'none', background:'none', cursor:'pointer', color:'var(--orion-red)' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-dark-secondary border border-orion-line rounded-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-medium text-white">Stats par joueurs</h2>
                <span className="text-xs text-gray-500 bg-dark-tertiary px-2.5 py-1 rounded-full">Saison complète</span>
              </div>
              <PlayerSeasonStats teamId={selectedTeam.id} teamName={selectedTeam.name} />
            </div>
          )}
        </div>

        {showPlayerForm && (
          <PlayerForm
            player={editingPlayer}
            onSave={handleSavePlayer}
            onCancel={() => { setShowPlayerForm(false); setEditingPlayer(null); }}
          />
        )}

        {showTeamSettings && (
          <TeamSettings
            teamId={editingTeamId}
            onClose={() => { setShowTeamSettings(false); setEditingTeamId(null); }}
            onSave={async () => {
              await loadTeams();
              const updated = teams.find(t => t.id === selectedTeam.id);
              if (updated) setSelectedTeam(updated);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', padding:16 }}>
      <div className="max-w-4xl mx-auto">
        {/* Hero sombre */}
        <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'24px 24px 20px', color:'#fff', marginBottom:20, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
          <div style={{ position:'absolute', top:0, right:0, width:320, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:8 }}>Gestion</div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#fff' }}>Mes Équipes</h1>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'#8aa0bd' }}>Gérez vos équipes, effectifs et compositions tactiques</p>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button onClick={onBack} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:999, fontSize:13, fontWeight:600, color:'#dbe3ee', cursor:'pointer' }}>← Retour</button>
              <button onClick={() => { setEditingTeamId(null); setShowTeamSettings(true); }} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', background:'var(--orion-accent)', border:'none', borderRadius:999, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(61,128,224,0.4)' }}>
                <Plus size={15} /> Créer une équipe
              </button>
            </div>
          </div>
        </div>

        {loadingTeams ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Chargement...</div>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-dark-secondary border-2 border-orion-line flex items-center justify-center mb-6">
              <Shield size={36} className="text-gray-500" />
            </div>
            <h2 className="text-base font-medium text-white mb-2">Aucune équipe créée</h2>
            <p className="text-gray-400 mb-8 max-w-xs">Commencez par créer votre première équipe pour gérer votre effectif et vos compositions.</p>
            <button
              onClick={() => { setEditingTeamId(null); setShowTeamSettings(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-primary text-white rounded-lg hover-orange transition-colors font-medium"
            >
              <Plus size={20} />
              Créer une équipe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-dark-secondary border border-orion-line rounded-lg p-5 hover:border-gray-600 transition-all duration-200 group cursor-pointer"
                onClick={() => handleSelectTeam(team)}
              >
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-14 h-14  object-cover border-2 border-orion-line flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14  bg-dark-tertiary border-2 border-orion-line flex items-center justify-center flex-shrink-0">
                      <Shield size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-orion-accent transition-colors">{team.name}</h3>
                    {team.category && (
                      <span className="inline-block px-2 py-0.5 bg-orange-primary/20 text-orion-accent rounded-full text-xs font-medium mt-1">
                        {team.category}
                      </span>
                    )}
                    {team.description && (
                      <p className="text-gray-400 text-xs mt-1 truncate">{team.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTeamId(team.id); setShowTeamSettings(true); }}
                      className="p-2 text-gray-400 hover:text-orion-accent hover:bg-orange-900/20  transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20  transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 transition-colors ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTeamSettings && (
        <TeamSettings
          teamId={editingTeamId}
          onClose={() => { setShowTeamSettings(false); setEditingTeamId(null); }}
          onSave={async () => { await loadTeams(); }}
        />
      )}
    </div>
  );
}
