import { useState, useEffect } from 'react';
import { X, Copy, Plus, Save, LayoutGrid as Layout, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, getCurrentUserId } from '../lib/auth';
import { TeamFormation, FormationPosition, Player } from '../types/database';
import FieldVisualization from './FieldVisualization';

interface MatchFormationManagerProps {
  matchId: string;
  team: 'A' | 'B';
  onClose: () => void;
}

interface PlayerData {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
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
};

export default function MatchFormationManager({ matchId, team, onClose }: MatchFormationManagerProps) {
  const [currentFormation, setCurrentFormation] = useState<TeamFormation | null>(null);
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [selectedFormationType, setSelectedFormationType] = useState<keyof typeof FORMATIONS>('4-4-2');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formationName, setFormationName] = useState('');

  useEffect(() => {
    loadData();
  }, [matchId, team]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const [playersRes, matchFormationRes] = await Promise.all([
        supabase.from('players').select('*').eq('user_id', user.id).order('number'),
        supabase
          .from('match_formations')
          .select('*, team_formations(*)')
          .eq('match_id', matchId)
          .eq('team', team)
          .maybeSingle(),
      ]);

      if (playersRes.data) setPlayers(playersRes.data);

      if (matchFormationRes.data) {
        const formation = matchFormationRes.data.team_formations as unknown as TeamFormation;
        setCurrentFormation(formation);
        setFormationName(formation.name);

        const positionsRes = await supabase
          .from('formation_positions')
          .select('*')
          .eq('formation_id', formation.id);

        if (positionsRes.data) {
          setPositions(positionsRes.data);
        }
      } else {
        const activeFormationRes = await supabase
          .from('team_formations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeFormationRes.data) {
          setFormationName(`${activeFormationRes.data.name} - Match`);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromActive = async () => {
    try {
      setSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { data: activeFormation } = await supabase
        .from('team_formations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!activeFormation) {
        alert('Aucune formation active trouvée');
        return;
      }

      const { data: activePositions } = await supabase
        .from('formation_positions')
        .select('*')
        .eq('formation_id', activeFormation.id);

      const { data: newFormation, error: formationError } = await supabase
        .from('team_formations')
        .insert({
          user_id: user.id,
          name: formationName || `${activeFormation.name} - Match`,
          is_active: false,
        })
        .select()
        .single();

      if (formationError) throw formationError;

      if (activePositions && activePositions.length > 0) {
        const newPositions = activePositions.map(pos => ({
          formation_id: newFormation.id,
          player_id: pos.player_id,
          position_x: pos.position_x,
          position_y: pos.position_y,
          role: pos.role,
        }));

        const { error: posError } = await supabase
          .from('formation_positions')
          .insert(newPositions);

        if (posError) throw posError;
      }

      const { error: matchFormError } = await supabase
        .from('match_formations')
        .upsert({
          match_id: matchId,
          formation_id: newFormation.id,
          team: team,
        }, {
          onConflict: 'match_id,team'
        });

      if (matchFormError) throw matchFormError;

      await loadData();
      alert('Formation copiée et enregistrée pour ce match!');
    } catch (error) {
      console.error('Error creating formation:', error);
      alert('Erreur lors de la création de la formation');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { data: newFormation, error: formationError } = await supabase
        .from('team_formations')
        .insert({
          user_id: user.id,
          name: formationName || `${selectedFormationType} - Match`,
          is_active: false,
        })
        .select()
        .single();

      if (formationError) throw formationError;

      const newPositions = FORMATIONS[selectedFormationType].map(pos => ({
        formation_id: newFormation.id,
        position_x: pos.x,
        position_y: pos.y,
        role: pos.role,
        player_id: null,
      }));

      const { error: posError } = await supabase
        .from('formation_positions')
        .insert(newPositions);

      if (posError) throw posError;

      const { error: matchFormError } = await supabase
        .from('match_formations')
        .upsert({
          match_id: matchId,
          formation_id: newFormation.id,
          team: team,
        }, {
          onConflict: 'match_id,team'
        });

      if (matchFormError) throw matchFormError;

      await loadData();
      alert('Nouvelle formation créée pour ce match!');
    } catch (error) {
      console.error('Error creating formation:', error);
      alert('Erreur lors de la création de la formation');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPlayer = async (positionId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('formation_positions')
        .update({ player_id: playerId })
        .eq('id', positionId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error assigning player:', error);
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

        await loadData();
      } catch (error) {
        console.error('Error removing player:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-gray-900">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8 text-gray-900">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              Composition Tactique - Équipe {team}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Gérez la formation spécifique pour ce match
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {currentFormation ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layout className="text-green-600" size={20} />
                  <h4 className="font-semibold text-green-800">Formation enregistrée</h4>
                </div>
                <p className="text-gray-700">
                  Formation actuelle: <span className="font-bold">{currentFormation.name}</span>
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Visualisation</h4>
                <FieldVisualization
                  players={players}
                  positions={positions}
                  onPositionClick={handlePositionClick}
                  onAssignPlayer={handleAssignPlayer}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-blue-600" size={20} />
                  <h4 className="font-semibold text-blue-800">Aucune formation enregistrée</h4>
                </div>
                <p className="text-gray-700 text-sm">
                  Créez une nouvelle formation pour ce match ou copiez votre formation active.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la formation
                </label>
                <input
                  type="text"
                  value={formationName}
                  onChange={(e) => setFormationName(e.target.value)}
                  placeholder="Ex: 4-3-3 vs PSG"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleCreateFromActive}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy size={20} />
                  <span>Copier formation active</span>
                </button>

                <div className="space-y-2">
                  <select
                    value={selectedFormationType}
                    onChange={(e) => setSelectedFormationType(e.target.value as keyof typeof FORMATIONS)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.keys(FORMATIONS).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateNew}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={20} />
                    <span>Créer nouvelle formation</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
