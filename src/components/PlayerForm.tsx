import { useState, useEffect } from 'react';
import { X, Upload, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadPlayerPhoto, validateImageFile } from '../utils/uploadImage';

interface Player {
  id?: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
  birth_date?: string;
  height?: number;
  weight?: number;
  strong_foot?: string;
  secondary_position?: string;
  nationality?: string;
  coach_notes?: string;
}

interface PlayerFormProps {
  player?: Player | null;
  onSave: (player: Omit<Player, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const POSITIONS = ['GK', 'DF', 'MF', 'FW'];
const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien', DF: 'Défenseur', MF: 'Milieu', FW: 'Attaquant'
};

export default function PlayerForm({ player, onSave, onCancel }: PlayerFormProps) {
  const [tab, setTab] = useState<'identity' | 'physical' | 'notes'>('identity');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', number: '' as string | number,
    position: 'MF', secondary_position: '', photo_url: '',
    birth_date: '', height: '' as string | number, weight: '' as string | number,
    strong_foot: 'right', nationality: '', coach_notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (player) {
      setFormData({
        first_name: player.first_name || '', last_name: player.last_name || '',
        number: player.number || '', position: player.position || 'MF',
        secondary_position: player.secondary_position || '', photo_url: player.photo_url || '',
        birth_date: player.birth_date || '', height: player.height || '',
        weight: player.weight || '', strong_foot: player.strong_foot || 'right',
        nationality: player.nationality || '', coach_notes: player.coach_notes || '',
      });
      setPreviewUrl(player.photo_url || '');
    }
  }, [player]);

  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { setUploadError(validation.error || 'Fichier invalide'); e.target.value = ''; return; }
    setUploadError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFormData(f => ({ ...f, photo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalPhotoUrl = formData.photo_url;
      if (selectedFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        finalPhotoUrl = await uploadPlayerPhoto(selectedFile, user.id);
      }
      await onSave({
        ...formData,
        number: typeof formData.number === 'string' ? parseInt(formData.number) || 0 : formData.number,
        height: formData.height ? (typeof formData.height === 'string' ? parseInt(formData.height) : formData.height) : undefined,
        weight: formData.weight ? (typeof formData.weight === 'string' ? parseInt(formData.weight) : formData.weight) : undefined,
        photo_url: finalPhotoUrl,
        birth_date: formData.birth_date || undefined,
        secondary_position: formData.secondary_position || undefined,
        nationality: formData.nationality || undefined,
        coach_notes: formData.coach_notes || undefined,
      } as any);
    } catch (err) { setUploading(false); }
  };

  const age = formData.birth_date ? Math.floor((Date.now() - new Date(formData.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-dark-secondary border border-orion-line shadow-2xl w-full max-w-lg flex flex-col rounded-lg" style={{ maxHeight: "calc(100svh - 2rem)", overflowY: "auto" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-orion-line">
          <h3 className="text-sm font-medium text-orion-text">{player ? 'Modifier le joueur' : 'Ajouter un joueur'}</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-dark-tertiary  transition-colors"><X size={18} className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          {/* Photo + identité rapide */}
          <div className="px-4 pt-3 pb-3 flex items-center gap-4 border-b border-orion-line">
            <div className="relative">
              {previewUrl ? (
                <img src={previewUrl} className="w-16 h-16 rounded-full object-cover border-2 border-orion-accent" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-dark-tertiary border-2 border-gray-600 flex items-center justify-center">
                  <User size={24} className="text-gray-500" />
                </div>
              )}
              <label htmlFor="photo-upload" className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors">
                <Upload size={12} className="text-white" />
              </label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <div className="flex-1 space-y-2">
              {uploadError && (
                <div style={{ fontSize:11, color:'var(--orion-red)', padding:'4px 8px', background:'rgba(255,80,80,0.08)', borderLeft:'2px solid var(--orion-red)' }}>
                  {uploadError}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" required value={formData.first_name} onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))} placeholder="Prénom *" className="flex-1 px-3 py-2 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                <input type="text" required value={formData.last_name} onChange={e => setFormData(f => ({ ...f, last_name: e.target.value }))} placeholder="Nom *" className="flex-1 px-3 py-2 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
              </div>
              <div className="flex gap-2">
                <input type="number" required min="1" max="99" value={formData.number} onChange={e => setFormData(f => ({ ...f, number: e.target.value }))} placeholder="N° *" className="w-20 px-3 py-1.5 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                <input type="text" value={formData.nationality} onChange={e => setFormData(f => ({ ...f, nationality: e.target.value }))} placeholder="Nationalité" className="flex-1 px-3 py-1.5 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div><div className="flex border-b border-orion-line">
            {[{ key: 'identity', label: 'Identité' }, { key: 'physical', label: 'Physique' }, { key: 'notes', label: 'Notes coach' }].map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key as any)} className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.key ? 'text-orion-accent border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>{t.label}</button>
            ))}
          </div>

          <div className="px-4 py-3 space-y-3">
            {tab === 'identity' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Poste principal</label>
                  <div className="grid grid-cols-4 gap-2">
                    {POSITIONS.map(pos => (
                      <button key={pos} type="button" onClick={() => setFormData(f => ({ ...f, position: pos }))}
                        className={`py-2  text-sm font-bold transition-all ${formData.position === pos ? (pos === 'GK' ? 'bg-yellow-500' : pos === 'DF' ? 'bg-blue-500' : pos === 'MF' ? 'bg-green-500' : 'bg-red-500') + ' text-white' : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white'}`}
                      >{pos}</button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{POSITION_LABELS[formData.position]}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Poste secondaire (optionnel)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {POSITIONS.filter(p => p !== formData.position).map(pos => (
                      <button key={pos} type="button" onClick={() => setFormData(f => ({ ...f, secondary_position: f.secondary_position === pos ? '' : pos }))}
                        className={`py-2  text-sm font-bold transition-all ${formData.secondary_position === pos ? 'bg-gray-500 text-white' : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white'}`}
                      >{pos}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pied fort</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ value: 'right', label: '🦵 Droit' }, { value: 'left', label: '🦵 Gauche' }, { value: 'both', label: '⚡ Les deux' }].map(foot => (
                      <button key={foot.value} type="button" onClick={() => setFormData(f => ({ ...f, strong_foot: foot.value }))}
                        className={`py-2  text-sm font-semibold transition-all ${formData.strong_foot === foot.value ? 'bg-orange-primary text-white' : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white'}`}
                      >{foot.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date de naissance</label>
                  <div className="flex items-center gap-3">
                    <input type="date" value={formData.birth_date} onChange={e => setFormData(f => ({ ...f, birth_date: e.target.value }))} className="flex-1 px-3 py-2 bg-dark-tertiary border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" style={{ colorScheme: "dark", color: "var(--orion-text)" }} />
                    {age !== null && <span className="text-sm text-gray-400 font-medium">{age} ans</span>}
                  </div>
                </div>
              </>
            )}

            {tab === 'physical' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Taille (cm)</label>
                    <input type="number" min="140" max="220" value={formData.height} onChange={e => setFormData(f => ({ ...f, height: e.target.value }))} placeholder="Ex: 178" className="w-full px-3 py-2 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Poids (kg)</label>
                    <input type="number" min="40" max="120" value={formData.weight} onChange={e => setFormData(f => ({ ...f, weight: e.target.value }))} placeholder="Ex: 72" className="w-full px-3 py-2 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                  </div>
                </div>
                {(formData.height || formData.weight) && (
                  <div className="bg-dark-tertiary  p-4 flex items-center gap-6 justify-center">
                    {formData.height && <div className="text-center"><div className="text-2xl font-black text-white">{formData.height}<span className="text-sm text-gray-400 font-normal"> cm</span></div><div className="text-xs text-gray-500">Taille</div></div>}
                    {formData.weight && <div className="text-center"><div className="text-2xl font-black text-white">{formData.weight}<span className="text-sm text-gray-400 font-normal"> kg</span></div><div className="text-xs text-gray-500">Poids</div></div>}
                    {formData.height && formData.weight && (
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">{(Number(formData.weight) / Math.pow(Number(formData.height) / 100, 2)).toFixed(1)}</div>
                        <div className="text-xs text-gray-500">IMC</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {tab === 'notes' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes du coach</label>
                <textarea value={formData.coach_notes} onChange={e => setFormData(f => ({ ...f, coach_notes: e.target.value }))} rows={8} placeholder="Forces, axes de progression, comportement, observations tactiques..." className="w-full px-3 py-2 bg-dark-tertiary border border-gray-600 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary placeholder-gray-600 resize-none" />
                <p className="text-xs text-gray-600 mt-1">{formData.coach_notes.length} caractères</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-4 py-3 border-t border-orion-line">
            <button type="button" onClick={onCancel} disabled={uploading} className="flex-1 py-2 border border-gray-600 text-gray-300  hover:bg-dark-tertiary transition-colors text-sm">Annuler</button>
            <button type="submit" disabled={uploading} className="flex-1 py-2 bg-orange-primary hover:bg-orange-600 text-white  text-sm font-semibold flex items-center justify-center gap-2">
              {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Upload...</> : player ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
