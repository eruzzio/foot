import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface TeamSettingsProps {
  onClose: () => void;
  onSave: () => void;
  teamId?: string | null;
}

export default function TeamSettings({ onClose, onSave, teamId: propTeamId }: TeamSettingsProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    logo_url: '',
    description: '',
    color: '#3b82f6',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(propTeamId ?? null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!propTeamId) {
        setLoading(false);
        return;
      }

      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', propTeamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (team) {
        setTeamId(team.id);
        setFormData({
          name: team.name || '',
          category: team.category || '',
          logo_url: team.logo_url || '',
          description: team.description || '',
          color: team.colors?.primary || '#3b82f6',
        });
        setPreviewUrl(team.logo_url || '');
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setFormData({ ...formData, logo_url: '' });
    }
  };

  const uploadLogo = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('team-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let finalLogoUrl = formData.logo_url;

      if (selectedFile) {
        finalLogoUrl = await uploadLogo(selectedFile, user.id);
      }

      const teamData = {
        name: formData.name,
        category: formData.category,
        logo_url: finalLogoUrl,
        description: formData.description,
        user_id: user.id,
        colors: { primary: formData.color, secondary: formData.color },
      };

      if (teamId) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', teamId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teams')
          .insert(teamData);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8 text-gray-900">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">
            {teamId ? "Paramètres de l'équipe" : "Créer une équipe"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'équipe *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: FC Marseille"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: U13, U15, Senior, Féminine"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Description de votre équipe..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couleur de l'équipe
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <div className="flex flex-wrap gap-2">
                {['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4','#ec4899','#ffffff','#6b7280'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 font-mono ml-1">{formData.color}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cette couleur sera utilisée dans l'interface de codage live
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo de l'équipe
            </label>

            {previewUrl && (
              <div className="mb-3 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Logo aperçu"
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Upload size={20} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {selectedFile ? selectedFile.name : 'Choisir un logo'}
                  </span>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF ou WEBP (max 5MB)
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <div>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => {
                    setFormData({ ...formData, logo_url: e.target.value });
                    setPreviewUrl(e.target.value);
                    setSelectedFile(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL d'une image
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
