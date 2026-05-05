import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Users, Copy, Check, Upload, X, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
  city?: string;
  logo_url?: string;
  color_primary: string;
  color_secondary: string;
  join_code: string;
  created_by: string;
}

interface ClubManagerProps {
  onClubSelected: (club: Club | null) => void;
  currentClubId?: string | null;
}

export default function ClubManager({ onClubSelected, currentClubId }: ClubManagerProps) {
  const [mode, setMode] = useState<'view' | 'create' | 'join'>('view');
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Formulaire création
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [colorPrimary, setColorPrimary] = useState('#22c55e');
  const [colorSecondary, setColorSecondary] = useState('#f97316');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Rejoindre
  const [joinCode, setJoinCode] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentClubId) loadClub(currentClubId);
    else setLoading(false);
  }, [currentClubId]);

  const loadClub = async (id: string) => {
    const { data } = await supabase.from('clubs').select('*').eq('id', id).single();
    if (data) setClub(data);
    setLoading(false);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (userId: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop();
    const path = `clubs/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, logoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Le nom du club est requis'); return; }
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      let logoUrl: string | null = null;
      if (logoFile) logoUrl = await uploadLogo(user.id);

      const { data, error } = await supabase
        .from('clubs')
        .insert({
          name: name.trim(),
          city: city.trim() || null,
          logo_url: logoUrl,
          color_primary: colorPrimary,
          color_secondary: colorSecondary,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Sauvegarder dans le profil utilisateur
      await supabase.auth.updateUser({ data: { club_id: data.id, club_name: data.name, club_logo: data.logo_url } });

      setClub(data);
      onClubSelected(data);
      setMode('view');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    }
    setSaving(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Entrez le code du club'); return; }
    setSaving(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) { setError('Code invalide — club introuvable'); setSaving(false); return; }

      await supabase.auth.updateUser({ data: { club_id: data.id, club_name: data.name, club_logo: data.logo_url } });

      setClub(data);
      onClubSelected(data);
      setMode('view');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
    setSaving(false);
  };

  const handleCopyCode = () => {
    if (club?.join_code) {
      navigator.clipboard.writeText(club.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    await supabase.auth.updateUser({ data: { club_id: null, club_name: null, club_logo: null } });
    setClub(null);
    onClubSelected(null);
  };

  if (loading) return null;

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={18} className="text-orange-primary" />
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Mon Club</h3>
      </div>

      {/* Vue club existant */}
      {club && mode === 'view' && (
        <div className="space-y-4">
          {/* Card club */}
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${club.color_primary}15, ${club.color_secondary}10)`, border: `1px solid ${club.color_primary}30` }}>
            {club.logo_url ? (
              <img src={club.logo_url} className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: club.color_primary + '20', color: club.color_primary }}>
                {club.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="text-lg font-black text-white">{club.name}</div>
              {club.city && <div className="text-sm text-gray-400">📍 {club.city}</div>}
              <div className="flex gap-1.5 mt-1">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: club.color_primary }} />
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: club.color_secondary }} />
              </div>
            </div>
          </div>

          {/* Code de partage */}
          <div className="bg-dark-tertiary rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Code d'invitation</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xl font-black text-orange-400 tracking-widest">{club.join_code}</code>
              <button onClick={handleCopyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-primary/20 hover:bg-orange-primary/30 text-orange-300 rounded-lg text-xs font-semibold transition-colors">
                {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Partagez ce code pour que vos collègues rejoignent le club</p>
          </div>

          <button onClick={handleLeave} className="w-full py-2 border border-red-800/40 text-red-400 hover:bg-red-900/20 rounded-lg text-xs font-semibold transition-colors">
            Quitter ce club
          </button>
        </div>
      )}

      {/* Pas de club */}
      {!club && mode === 'view' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Créez votre club ou rejoignez-en un existant avec un code d'invitation.</p>
          <button onClick={() => { setMode('create'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-orange-primary/50 rounded-xl transition-all text-left"
          >
            <div className="w-10 h-10 bg-orange-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus size={18} className="text-orange-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Créer un club</div>
              <div className="text-xs text-gray-500">Nouveau club avec logo et couleurs</div>
            </div>
          </button>
          <button onClick={() => { setMode('join'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <LogIn size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Rejoindre un club</div>
              <div className="text-xs text-gray-500">Entrer un code d'invitation</div>
            </div>
          </button>
        </div>
      )}

      {/* Formulaire création */}
      {mode === 'create' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Créer un club</span>
            <button onClick={() => setMode('view')} className="p-1 hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400" /></button>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-600 hover:border-orange-primary cursor-pointer flex items-center justify-center overflow-hidden transition-colors">
              {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload size={20} className="text-gray-500" />}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Logo du club (optionnel)</div>
              <button onClick={() => fileRef.current?.click()} className="text-xs text-orange-400 hover:text-orange-300">Choisir une image</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom du club *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="AS Béziers"
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ville</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Béziers"
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Couleur principale</label>
              <div className="flex items-center gap-2">
                <input type="color" value={colorPrimary} onChange={e => setColorPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer" />
                <span className="text-xs text-gray-400">{colorPrimary}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Couleur secondaire</label>
              <div className="flex items-center gap-2">
                <input type="color" value={colorSecondary} onChange={e => setColorSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer" />
                <span className="text-xs text-gray-400">{colorSecondary}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 bg-orange-primary hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {saving ? 'Création...' : 'Créer le club'}
          </button>
        </div>
      )}

      {/* Formulaire rejoindre */}
      {mode === 'join' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Rejoindre un club</span>
            <button onClick={() => setMode('view')} className="p-1 hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400" /></button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Code d'invitation</label>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123"
              maxLength={6}
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white rounded-lg text-xl font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-600 mt-1">Demandez le code à l'administrateur du club</p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleJoin} disabled={saving || joinCode.length < 6}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {saving ? 'Vérification...' : 'Rejoindre'}
          </button>
        </div>
      )}
    </div>
  );
}
