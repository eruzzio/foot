import { useState, useEffect } from 'react';
import { X, LayoutGrid as Layout, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Panel } from '../types/database';
import { parseVEOUrl } from '../utils/veoParser';

interface MatchSheetData {
  teamA: string;
  teamB: string;
  teamAId?: string | null;
  championship: string;
  matchday: string;
  location: string;
  date: string;
  panelId: string | null;
  teamAColor?: string;
  teamALogoUrl?: string;
  videoUrl?: string;
  videoProvider?: string;
  videoShareId?: string;
}

interface SavedTeam {
  id: string;
  name: string;
  color?: string;
  logoUrl?: string;
}

interface MatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MatchSheetData) => void;
  initialTeamA?: string;
  initialTeamB?: string;
}

export default function MatchSheet({ isOpen, onClose, onSave, initialTeamA, initialTeamB }: MatchSheetProps) {
  const [formData, setFormData] = useState<MatchSheetData>({
    teamA: initialTeamA || '',
    teamB: initialTeamB || '',
    championship: '',
    matchday: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    panelId: null,
    videoUrl: '',
    videoProvider: undefined,
    videoShareId: undefined,
  });
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(true);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [videoUrlError, setVideoUrlError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        teamA: initialTeamA || prev.teamA,
        teamB: initialTeamB || prev.teamB,
      }));
      loadPanels();
      loadTeams();
    }
  }, [isOpen, initialTeamA, initialTeamB]);

  const loadTeams = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('teams')
      .select('id, name, colors, logo_url')
      .eq('user_id', userData.user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setSavedTeams(data.map((t: any) => ({ id: t.id, name: t.name, color: t.colors?.primary, logoUrl: t.logo_url })));
    }
  };

  const loadPanels = async () => {
    setLoadingPanels(true);
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (!error && data) {
        setPanels(data);
        const defaultPanel = data.find(p => p.is_default);
        if (defaultPanel) {
          setFormData(prev => ({ ...prev, panelId: defaultPanel.id }));
        }
      }
    }
    setLoadingPanels(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setFormData(prev => ({ ...prev, videoUrl: url }));

    if (url) {
      const veoInfo = parseVEOUrl(url);
      if (veoInfo.isValid) {
        setVideoUrlError('');
        setFormData(prev => ({
          ...prev,
          videoProvider: veoInfo.provider,
          videoShareId: veoInfo.shareId,
        }));
      } else {
        setVideoUrlError(veoInfo.errorMessage || 'URL invalide');
        setFormData(prev => ({
          ...prev,
          videoProvider: undefined,
          videoShareId: undefined,
        }));
      }
    } else {
      setVideoUrlError('');
      setFormData(prev => ({
        ...prev,
        videoProvider: undefined,
        videoShareId: undefined,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSavedTeam = savedTeams.find(t => t.name === formData.teamA);
    onSave({
      ...formData,
      teamAColor: selectedSavedTeam?.color,
      teamALogoUrl: selectedSavedTeam?.logoUrl,
      teamAId: selectedSavedTeam?.id ?? null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-dark-secondary sticky top-0 bg-dark">
          <h2 className="text-xl font-semibold text-white">Fiche Match</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-secondary rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Équipe A
            </label>
            {savedTeams.length > 0 ? (
              <select
                name="teamA"
                value={formData.teamA}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white"
              >
                <option value="">Sélectionnez une équipe</option>
                {savedTeams.map(team => (
                  <option key={team.id} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="teamA"
                value={formData.teamA}
                onChange={handleChange}
                placeholder="Nom de l'équipe A"
                className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white placeholder-gray-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Équipe B (Adversaire)
            </label>
            <input
              type="text"
              name="teamB"
              value={formData.teamB}
              onChange={handleChange}
              placeholder="Nom de l'équipe B"
              className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Championnat
            </label>
            <input
              type="text"
              name="championship"
              value={formData.championship}
              onChange={handleChange}
              placeholder="ex: Ligue 1, Division 2"
              className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Journée
            </label>
            <input
              type="text"
              name="matchday"
              value={formData.matchday}
              onChange={handleChange}
              placeholder="ex: J1, Journée 15"
              className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Lieu
            </label>
            <div className="flex gap-3">
              {['Domicile', 'Extérieur'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location: option }))}
                  className={`flex-1 py-2 rounded-lg border font-medium transition-colors ${
                    formData.location === option
                      ? 'bg-orange-primary text-white border-orange-primary'
                      : 'bg-dark-secondary text-gray-300 border-dark-secondary hover:border-orange-primary'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Layout className="inline-block mr-1" size={16} />
              Panneau de codage
            </label>
            {loadingPanels ? (
              <div className="w-full px-3 py-2 border border-dark-secondary rounded-lg bg-dark-secondary text-gray-400">
                Chargement des panneaux...
              </div>
            ) : panels.length === 0 ? (
              <div className="w-full px-3 py-2 border border-dark-secondary rounded-lg bg-dark-secondary text-orange-primary text-sm">
                Aucun panneau disponible. Créez-en un dans "Mes Panneaux".
              </div>
            ) : (
              <select
                name="panelId"
                value={formData.panelId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-dark-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary bg-dark-secondary text-white"
                required
              >
                <option value="">Sélectionnez un panneau</option>
                {panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.name} {panel.is_default ? '(Par défaut)' : ''}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Ce panneau déterminera les boutons d'actions disponibles pendant le match
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Lien vidéo VEO (optionnel)
            </label>
            <input
              type="text"
              value={formData.videoUrl || ''}
              onChange={handleVideoUrlChange}
              placeholder="https://veo.co/shared-videos/..."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-dark-secondary text-white placeholder-gray-500 ${
                videoUrlError
                  ? 'border-red-500 focus:ring-red-400'
                  : formData.videoShareId
                    ? 'border-green-500 focus:ring-green-400'
                    : 'border-dark-secondary focus:ring-orange-primary'
              }`}
            />
            {videoUrlError && (
              <div className="flex items-center gap-1 mt-1.5 text-red-400">
                <AlertCircle size={14} />
                <span className="text-xs">{videoUrlError}</span>
              </div>
            )}
            {formData.videoShareId && (
              <div className="flex items-center gap-1 mt-1.5 text-green-400">
                <CheckCircle size={14} />
                <span className="text-xs">Vidéo VEO reconnue</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-secondary text-gray-300 rounded-lg hover:bg-dark-secondary/80 transition-colors font-medium border border-dark-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-primary/90 transition-colors font-medium"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
