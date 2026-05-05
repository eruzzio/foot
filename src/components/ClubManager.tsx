import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Copy, Check, Upload, X, LogIn, Clock, CheckCircle, XCircle, Bell, Users } from 'lucide-react';
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

interface ClubMember {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ClubManagerProps {
  onClubSelected: (club: Club | null) => void;
  currentClubId?: string | null;
}

export default function ClubManager({ onClubSelected, currentClubId }: ClubManagerProps) {
  const [mode, setMode] = useState<'view' | 'create' | 'join'>('view');
  const [club, setClub] = useState<Club | null>(null);
  const [myMembership, setMyMembership] = useState<ClubMember | null>(null);
  const [pendingMembers, setPendingMembers] = useState<ClubMember[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<ClubMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Création
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
    init();
  }, [currentClubId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    if (currentClubId) {
      const { data: clubData } = await supabase.from('clubs').select('*').eq('id', currentClubId).single();
      if (clubData) {
        setClub(clubData);
        const owner = clubData.created_by === user.id;
        setIsOwner(owner);

        if (owner) {
          // Charger les demandes en attente et membres approuvés
          await loadMembers(currentClubId);
        } else {
          // Vérifier mon statut
          const { data: myMember } = await supabase
            .from('club_members')
            .select('*')
            .eq('club_id', currentClubId)
            .eq('user_id', user.id)
            .single();
          setMyMembership(myMember || null);
        }
      }
    }
    setLoading(false);
  };

  const loadMembers = async (clubId: string) => {
    const { data } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', clubId)
      .order('requested_at', { ascending: false });

    if (data) {
      // Enrichir avec les métadonnées utilisateur
      const enriched = await Promise.all(data.map(async (m) => {
        const { data: userData } = await supabase.auth.admin?.getUserById?.(m.user_id).catch(() => ({ data: null })) || { data: null };
        return {
          ...m,
          email: userData?.user?.email || m.user_id.slice(0, 8) + '...',
          first_name: userData?.user?.user_metadata?.first_name || '',
          last_name: userData?.user?.user_metadata?.last_name || '',
        };
      }));
      setPendingMembers(enriched.filter(m => m.status === 'pending'));
      setApprovedMembers(enriched.filter(m => m.status === 'approved'));
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const uploadLogo = async (uid: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop();
    const path = `clubs/${uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('team-logos').upload(path, logoFile, { upsert: true });
    if (error) return null;
    return supabase.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Le nom est requis'); return; }
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const logoUrl = logoFile ? await uploadLogo(user.id) : null;

      const { data, error } = await supabase.from('clubs').insert({
        name: name.trim(), city: city.trim() || null,
        logo_url: logoUrl, color_primary: colorPrimary,
        color_secondary: colorSecondary, created_by: user.id,
      }).select().single();

      if (error) throw error;

      // Créateur = membre approuvé automatiquement
      await supabase.from('club_members').insert({
        club_id: data.id, user_id: user.id,
        role: 'admin', status: 'approved',
      });

      await supabase.auth.updateUser({ data: { club_id: data.id, club_name: data.name, club_logo: data.logo_url } });
      setClub(data); setIsOwner(true); onClubSelected(data); setMode('view');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleRequestJoin = async () => {
    if (!joinCode.trim()) { setError('Entrez le code'); return; }
    setSaving(true); setError('');
    try {
      const { data: clubData } = await supabase.from('clubs').select('*').eq('join_code', joinCode.trim().toUpperCase()).single();
      if (!clubData) { setError('Code invalide — club introuvable'); setSaving(false); return; }

      // Insérer une demande en statut "pending"
      const { error } = await supabase.from('club_members').insert({
        club_id: clubData.id, user_id: userId, status: 'pending',
      });
      if (error && error.code !== '23505') throw error; // ignorer doublon

      // Sauvegarder le club en attente
      await supabase.auth.updateUser({ data: { club_id: clubData.id, club_name: clubData.name, club_logo: clubData.logo_url } });
      setClub(clubData);
      setMyMembership({ id: '', user_id: userId, status: 'pending', requested_at: new Date().toISOString() });
      onClubSelected(null); // pas encore approuvé
      setMode('view');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleApprove = async (memberId: string, memberUserId: string) => {
    await supabase.from('club_members').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', memberId);
    if (club) await loadMembers(club.id);
  };

  const handleReject = async (memberId: string) => {
    await supabase.from('club_members').update({ status: 'rejected' }).eq('id', memberId);
    if (club) await loadMembers(club.id);
  };

  const handleLeave = async () => {
    if (club) await supabase.from('club_members').delete().eq('club_id', club.id).eq('user_id', userId);
    await supabase.auth.updateUser({ data: { club_id: null, club_name: null, club_logo: null } });
    setClub(null); setMyMembership(null); setIsOwner(false); onClubSelected(null);
  };

  const handleCopy = () => {
    if (club?.join_code) { navigator.clipboard.writeText(club.join_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (loading) return null;

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-orange-primary" />
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Mon Club</h3>
        </div>
        {pendingMembers.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-full text-xs font-bold">
            <Bell size={11} /> {pendingMembers.length} demande{pendingMembers.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Club existant */}
      {club && mode === 'view' && (
        <div className="space-y-4">
          {/* Card club */}
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${club.color_primary}12`, border: `1px solid ${club.color_primary}30` }}>
            {club.logo_url ? (
              <img src={club.logo_url} className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: club.color_primary + '20', color: club.color_primary }}>
                {club.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="text-base font-black text-white">{club.name}</div>
              {club.city && <div className="text-xs text-gray-400">📍 {club.city}</div>}
              {isOwner && <div className="text-xs text-orange-400 mt-0.5 font-semibold">👑 Administrateur</div>}
              {!isOwner && myMembership?.status === 'approved' && <div className="text-xs text-green-400 mt-0.5">✓ Membre approuvé</div>}
              {!isOwner && myMembership?.status === 'pending' && <div className="text-xs text-yellow-400 mt-0.5">⏳ En attente d'approbation</div>}
            </div>
          </div>

          {/* Demandes en attente — visible uniquement par le créateur */}
          {isOwner && pendingMembers.length > 0 && (
            <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg p-3">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Bell size={12} /> Demandes d'adhésion ({pendingMembers.length})
              </div>
              <div className="space-y-2">
                {pendingMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-dark-tertiary rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-white">{m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.email}</div>
                      <div className="text-xs text-gray-500">{new Date(m.requested_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(m.id, m.user_id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-colors">
                        <CheckCircle size={12} /> Accepter
                      </button>
                      <button onClick={() => handleReject(m.id)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded-lg text-xs transition-colors">
                        <XCircle size={12} /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Membres approuvés */}
          {isOwner && approvedMembers.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users size={12} /> Membres ({approvedMembers.length})
              </div>
              <div className="space-y-1">
                {approvedMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-dark-tertiary rounded-lg text-xs text-gray-300">
                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    <span>{m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code invitation — visible uniquement par le créateur */}
          {isOwner && (
            <div className="bg-dark-tertiary rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Code d'invitation</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xl font-black text-orange-400 tracking-widest">{club.join_code}</code>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-primary/20 hover:bg-orange-primary/30 text-orange-300 rounded-lg text-xs font-semibold transition-colors">
                  {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Partagez ce code — vous devrez approuver chaque demande</p>
            </div>
          )}

          <button onClick={handleLeave} className="w-full py-2 border border-red-800/40 text-red-400 hover:bg-red-900/20 rounded-lg text-xs font-semibold transition-colors">
            Quitter ce club
          </button>
        </div>
      )}

      {/* Pas de club */}
      {!club && mode === 'view' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-3">Créez votre club ou rejoignez-en un existant.</p>
          <button onClick={() => { setMode('create'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-orange-primary/50 rounded-xl transition-all text-left">
            <div className="w-10 h-10 bg-orange-primary/20 rounded-lg flex items-center justify-center flex-shrink-0"><Plus size={18} className="text-orange-primary" /></div>
            <div><div className="text-sm font-bold text-white">Créer un club</div><div className="text-xs text-gray-500">Vous serez administrateur</div></div>
          </button>
          <button onClick={() => { setMode('join'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all text-left">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><LogIn size={18} className="text-blue-400" /></div>
            <div><div className="text-sm font-bold text-white">Rejoindre un club</div><div className="text-xs text-gray-500">Demande soumise à validation</div></div>
          </button>
        </div>
      )}

      {/* En attente d'approbation sans club sélectionné */}
      {club && myMembership?.status === 'pending' && !isOwner && (
        <div className="mt-3 bg-yellow-900/10 border border-yellow-800/30 rounded-lg p-3 text-center">
          <Clock size={20} className="text-yellow-400 mx-auto mb-1" />
          <div className="text-xs font-semibold text-yellow-300">Demande envoyée à {club.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">En attente de validation par l'administrateur</div>
        </div>
      )}

      {/* Formulaire création */}
      {mode === 'create' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-white">Créer un club</span><button onClick={() => setMode('view')} className="p-1 hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400" /></button></div>
          <div className="flex items-center gap-4">
            <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-600 hover:border-orange-primary cursor-pointer flex items-center justify-center overflow-hidden transition-colors">
              {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload size={20} className="text-gray-500" />}
            </div>
            <div><div className="text-xs text-gray-400 mb-1">Logo (optionnel)</div><button onClick={() => fileRef.current?.click()} className="text-xs text-orange-400">Choisir une image</button></div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </div>
          <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="AS Béziers" className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" /></div>
          <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Ville</label><input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Béziers" className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Couleur principale</label><div className="flex items-center gap-2"><input type="color" value={colorPrimary} onChange={e => setColorPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer" /><span className="text-xs text-gray-400">{colorPrimary}</span></div></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Couleur secondaire</label><div className="flex items-center gap-2"><input type="color" value={colorSecondary} onChange={e => setColorSecondary(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer" /><span className="text-xs text-gray-400">{colorSecondary}</span></div></div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleCreate} disabled={saving} className="w-full py-2.5 bg-orange-primary hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors">{saving ? 'Création...' : 'Créer le club'}</button>
        </div>
      )}

      {/* Formulaire rejoindre */}
      {mode === 'join' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-white">Rejoindre un club</span><button onClick={() => setMode('view')} className="p-1 hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400" /></button></div>
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3 text-xs text-blue-300">
            ℹ️ Votre demande sera soumise à l'administrateur du club pour validation.
          </div>
          <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Code d'invitation</label>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white rounded-lg text-xl font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleRequestJoin} disabled={saving || joinCode.length < 6} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors">{saving ? 'Envoi...' : 'Envoyer la demande'}</button>
        </div>
      )}
    </div>
  );
}
