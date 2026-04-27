import { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadPlayerPhoto } from '../utils/uploadImage';

interface Player {
  id?: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
}

interface PlayerFormProps {
  player?: Player | null;
  onSave: (player: Omit<Player, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export default function PlayerForm({ player, onSave, onCancel }: PlayerFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    number: '' as string | number,
    position: 'Milieu',
    photo_url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (player) {
      setFormData({
        first_name: player.first_name,
        last_name: player.last_name,
        number: player.number,
        position: player.position,
        photo_url: player.photo_url || '',
      });
      setPreviewUrl(player.photo_url || '');
    }
  }, [player]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setFormData({ ...formData, photo_url: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let finalPhotoUrl = formData.photo_url;

      if (selectedFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        finalPhotoUrl = await uploadPlayerPhoto(selectedFile, user.id);
      }

      await onSave({
        ...formData,
        number: typeof formData.number === 'string' ? parseInt(formData.number) : formData.number,
        photo_url: finalPhotoUrl
      });

      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors de l\'upload de la photo');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-8 text-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {player ? 'Modifier le joueur' : 'Ajouter un joueur'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Kylian"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Mbappé"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro
            </label>
            <input
              type="number"
              required
              min="1"
              max="99"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value ? parseInt(e.target.value) : '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poste
            </label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Gardien">Gardien</option>
              <option value="Défenseur">Défenseur</option>
              <option value="Milieu">Milieu</option>
              <option value="Attaquant">Attaquant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo du joueur
            </label>

            {previewUrl && (
              <div className="mb-3 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Upload size={20} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {selectedFile ? selectedFile.name : 'Choisir une photo'}
                  </span>
                </label>
                <input
                  id="file-upload"
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
                  value={formData.photo_url}
                  onChange={(e) => {
                    setFormData({ ...formData, photo_url: e.target.value });
                    setPreviewUrl(e.target.value);
                    setSelectedFile(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL d'une image (ex: depuis Pexels)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
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
                  Upload...
                </>
              ) : (
                player ? 'Modifier' : 'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
