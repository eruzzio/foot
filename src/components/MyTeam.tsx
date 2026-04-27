import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Pencil, Trash2, Users, Settings, Plus, ChevronRight, Shield, BarChart2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FieldVisualization from './FieldVisualization';
import PlayerForm from './PlayerForm';
import { exportTeamPdf } from '../utils/exportTeamPdf';
import TeamSettings from './TeamSettings';
import TeamMatchHistory from './TeamMatchHistory';
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [players, setPlayers] = useState<Player[]>([]);
  const [formation, setFormation] = useState<Formation | null>(null);
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<keyof typeof FORMATIONS>('4-4-2');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'composition' | 'squad' | 'stats'>('composition');

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

      const [playersRes, formationRes] = await Promise.all([
        supabase.from('players').select('*').eq('user_id', user.id).eq('team_id', teamId).order('number'),
        supabase.from('team_formations').select('*').eq('user_id', user.id).eq('team_id', teamId).eq('is_active', true).maybeSingle(),
      ]);

      if (playersRes.data) setPlayers(playersRes.data);

      if (formationRes.data) {
        setFormation(formationRes.data);
        setSelectedFormation(formationRes.data.name as keyof typeof FORMATIONS);
        const positionsRes = await supabase
          .from('formation_positions')
          .select('*')
          .eq('formation_id', formationRes.data.id);
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
  };

  const handleExportTeamPdf = () => {
    if (!selectedTeam) return;
    exportTeamPdf({
      teamName: selectedTeam.name,
      category: selectedTeam.category || 'Senior',
      logoUrl: selectedTeam.logo_url || undefined,
      formation: selectedFormation || '4-2-3-1',
      players: teamPlayers,
      positions: positions.map(p => ({
        player_id: p.player_id,
        position_x: p.position_x,
        position_y: p.position_y,
        role: p.role,
      })),
    });
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      if (selectedTeam) await loadTeamDetail(selectedTeam.id);
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
      <div className="min-h-screen bg-dark p-4 text-white">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => { setView('list'); setSelectedTeam(null); }}
                className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-300" />
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{selectedTeam.name}</h1>
                {selectedTeam.category && (
                  <p className="text-orange-400 text-sm font-medium">{selectedTeam.category}</p>
                )}
              </div>
              <button
                onClick={() => { setEditingTeamId(selectedTeam.id); setShowTeamSettings(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-dark-tertiary text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings size={18} />
                Paramètres
              </button>
              <button
                onClick={handleExportTeamPdf}
                className="flex items-center gap-2 px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Download size={18} />
                Fiche PDF
              </button>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {selectedTeam.logo_url ? (
                  <img
                    src={selectedTeam.logo_url}
                    alt={selectedTeam.name}
                    className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg object-cover border-2 border-gray-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-dark-tertiary border-2 border-gray-700 flex items-center justify-center flex-shrink-0">
                    <Shield size={28} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedTeam.name}</h2>
                    {selectedTeam.category && (
                      <span className="px-3 py-1 bg-orange-primary/20 text-orange-400 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                        {selectedTeam.category}
                      </span>
                    )}
                  </div>
                  {selectedTeam.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{selectedTeam.description}</p>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="flex gap-1 mb-6 bg-dark-secondary border border-gray-800 rounded-xl p-1">
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
                <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Composition Tactique</h2>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-300">Formation:</label>
                      <select
                        value={selectedFormation}
                        onChange={(e) => handleChangeFormation(e.target.value as keyof typeof FORMATIONS)}
                        className="px-3 py-2 bg-dark-tertiary border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-orange-primary focus:border-orange-primary"
                      >
                        {Object.keys(FORMATIONS).map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <FieldVisualization
                    players={players}
                    positions={positions}
                    onPositionClick={handlePositionClick}
                    onAssignPlayer={handleAssignPlayer}
                  />
                </div>
              </div>
              <div>
                <TeamMatchHistory teamId={selectedTeam.id} teamName={selectedTeam.name} />
              </div>
            </div>
          ) : activeTab === 'squad' ? (
            <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Effectif</h2>
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
                  <p className="text-gray-400 text-sm">Aucun joueur dans l'effectif</p>
                  <p className="text-gray-600 text-xs mt-1">Ajoutez vos premiers joueurs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {players.map((player) => {
                    const isAssigned = positions.some(pos => pos.player_id === player.id);
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isAssigned ? 'bg-green-900/20 border-green-700' : 'bg-dark-tertiary border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {player.photo_url ? (
                            <div className="relative w-10 h-10 flex-shrink-0">
                              <img
                                src={player.photo_url}
                                alt={`${player.first_name} ${player.last_name}`}
                                className="w-full h-full rounded-full object-cover border-2 border-gray-700 shadow"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                isAssigned ? 'bg-green-600' : 'bg-gray-600'
                              }`}>
                                {player.number}
                              </div>
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                              isAssigned ? 'bg-green-600' : 'bg-gray-600'
                            }`}>
                              {player.number}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {player.first_name} {player.last_name}
                            </div>
                            <div className="text-xs text-gray-400">{player.position}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingPlayer(player); setShowPlayerForm(true); }}
                            className="p-2 text-orange-400 hover:bg-orange-900/30 rounded transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Stats par joueurs</h2>
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
    <div className="min-h-screen bg-dark p-4 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">Mes Équipes</h1>
              <p className="text-gray-400">Gérez vos équipes, effectifs et compositions tactiques</p>
            </div>
            <button
              onClick={() => { setEditingTeamId(null); setShowTeamSettings(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-primary text-white rounded-lg hover-orange transition-colors font-medium"
            >
              <Plus size={18} />
              Créer une équipe
            </button>
          </div>
        </header>

        {loadingTeams ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Chargement...</div>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-dark-secondary border-2 border-gray-700 flex items-center justify-center mb-6">
              <Shield size={36} className="text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Aucune équipe créée</h2>
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
                className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all duration-200 group cursor-pointer"
                onClick={() => handleSelectTeam(team)}
              >
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-14 h-14 rounded-lg object-cover border-2 border-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-dark-tertiary border-2 border-gray-700 flex items-center justify-center flex-shrink-0">
                      <Shield size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-orange-400 transition-colors">{team.name}</h3>
                    {team.category && (
                      <span className="inline-block px-2 py-0.5 bg-orange-primary/20 text-orange-400 rounded-full text-xs font-medium mt-1">
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
                      className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
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
