import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Users, Copy, Check, Upload, X, LogIn, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';
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
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface ClubManagerProps {
  onClubSelected: (club: Club | null) => void;
  currentClubId?: string | null;
}

export default function ClubManager({ onClubSelected, currentClubId }: ClubManagerProps) {
  const [mode, setMode] = useState<'view' | 'create' | 'join'>('view');
  const [club, setClub] = useState<Club | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberStatus, setMemberStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [pendingMembers, setPendingMembers] = useState<ClubMember[]>([]);
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
  const [joinCode, setJoinCode] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentClubId) loadClub(currentClubId);
    else setLoading(false);
  }, [currentClubId]);

  const loadClub = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('clubs').select('*').eq('id', id).single();
    if (data) {
      setClub(data);
      setIsAdmin(data.created_by === user.id);

      if (data.created_by === user.id) {
        // Admin : charger les demandes en attente
        const { data: members } = await supabase
          .from('club_members')
          .select('*')
          .eq('club_id', id)
          .eq('status', 'pending');
        if (members) setPendingMembers(members);
      } else {
        // Membre : vérifier son statut
        const { data: myMembership } = await supabase
          .from('club_members')
          .select('status')
          .eq('club_id', id)
          .eq('user_id', user.id)
          .single();
        setMemberStatus((myMembership?.status as any) || 'none');
      }
    }
    setLoading(false);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const uploadLogo = async (userId: string) => {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop();
    const path = `clubs/${userId}/${Date.now()}.${ext}`;
    await supabase.storage.from('avatars').upload(path, logoFile, { upsert: true });
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Le nom du club est requis'); return; }
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const logoUrl = logoFile ? await uploadLogo(user.id) : null;
      const { data, error } = await supabase.from('clubs').insert({
        name: name.trim(), city: city.trim() || null, logo_url: logoUrl,
        color_primary: colorPrimary, color_secondary: colorSecondary, created_by: user.id,
      }).select().single();
      if (error) throw error;
      // Admin automatiquement approuvé
      await supabase.from('club_members').insert({ club_id: data.id, user_id: user.id, status: 'approved', role: 'admin' });
      await supabase.auth.updateUser({ data: { club_id: data.id, club_name: data.name, club_logo: data.logo_url } });
      setClub(data); setIsAdmin(true); setMemberStatus('approved');
      onClubSelected(data); setMode('view');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleRequestJoin = async () => {
    if (!joinCode.trim()) { setError('Entrez le code du club'); return; }
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const { data: foundClub } = await supabase.from('clubs').select('*').eq('join_code', joinCode.trim().toUpperCase()).single();
      if (!foundClub) { setError('Code invalide — club introuvable'); setSaving(false); return; }

      // Si c'est le créateur, approuver directement
      if (foundClub.created_by === user.id) {
        await supabase.from('club_members').upsert({ club_id: foundClub.id, user_id: user.id, status: 'approved', role: 'admin' });
        await supabase.auth.updateUser({ data: { club_id: foundClub.id, club_name: foundClub.name, club_logo: foundClub.logo_url } });
        setClub(foundClub); setIsAdmin(true); setMemberStatus('approved');
        onClubSelected(foundClub); setMode('view');
        setSaving(false); return;
      }

      // Créer une demande en attente
      const { error } = await supabase.from('club_members').upsert({
        club_id: foundClub.id, user_id: user.id, status: 'pending',
      }, { onConflict: 'club_id,user_id' });
      if (error) throw error;

      // Stocker provisoirement le club_id en attente
      await supabase.auth.updateUser({ data: { pending_club_id: foundClub.id, pending_club_name: foundClub.name } });
      setClub(foundClub); setMemberStatus('pending'); setMode('view');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleApproveMember = async (memberId: string, userId: string) => {
    if (!club) return;
    await supabase.from('club_members').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', memberId);
    // Mettre à jour le profil du membre approuvé
    // Note : on ne peut pas mettre à jour les user_metadata d'un autre utilisateur depuis le client
    // Le membre devra recharger l'app pour voir le changement
    setPendingMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleRejectMember = async (memberId: string) => {
    await supabase.from('club_members').update({ status: 'rejected' }).eq('id', memberId);
    setPendingMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleLeave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !club) return;
    await supabase.from('club_members').delete().eq('club_id', club.id).eq('user_id', user.id);
    await supabase.auth.updateUser({ data: { club_id: null, club_name: null, club_logo: null, pending_club_id: null } });
    setClub(null); setMemberStatus('none'); onClubSelected(null);
  };

  if (loading) return null;

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-orange-primary" />
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Mon Club</h3>
        </div>
        {isAdmin && pendingMembers.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 border border-yellow-700/50 text-yellow-400 rounded-full text-xs font-bold">
            <Bell size={10} /> {pendingMembers.length} demande{pendingMembers.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Club existant */}
      {club && mode === 'view' && (
        <div className="space-y-4">
          {/* Card club */}
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${club.color_primary}15, ${club.color_secondary}10)`, border: `1px solid ${club.color_primary}30` }}>
            {club.logo_url ? (
              <img src={club.logo_url} className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: club.color_primary + '20', color: club.color_primary }}>{club.name.charAt(0)}</div>
            )}
            <div className="flex-1">
              <div className="text-lg font-black text-white">{club.name}</div>
              {club.city && <div className="text-sm text-gray-400">📍 {club.city}</div>}
              <div className="flex gap-1.5 mt-1">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: club.color_primary }} />
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: club.color_secondary }} />
                <span className="text-xs text-gray-500 ml-1">{isAdmin ? '👑 Admin' : '👤 Membre'}</span>
              </div>
            </div>
          </div>

          {/* Statut membre en attente */}
          {memberStatus === 'pending' && !isAdmin && (
            <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
              <Clock size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-yellow-300">Demande en attente</div>
                <div className="text-xs text-yellow-600 mt-0.5">L'administrateur du club doit approuver votre demande. Revenez vérifier dans quelques instants.</div>
              </div>
            </div>
          )}

          {/* Code de partage — admin seulement */}
          {isAdmin && (
            <div className="bg-dark-tertiary rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Code d'invitation (admin uniquement)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xl font-black text-orange-400 tracking-widest">{club.join_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(club.join_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-primary/20 hover:bg-orange-primary/30 text-orange-300 rounded-lg text-xs font-semibold transition-colors">
                  {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Seul l'admin voit ce code. Les demandes doivent être approuvées manuellement.</p>
            </div>
          )}

          {/* Demandes en attente — admin seulement */}
          {isAdmin && pendingMembers.length > 0 && (
            <div className="bg-dark-tertiary rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Bell size={10} /> Demandes d'adhésion
              </div>
              <div className="space-y-2">
                {pendingMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 bg-dark-secondary rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">Utilisateur ORION</div>
                      <div className="text-[10px] text-gray-500">{new Date(member.requested_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveMember(member.id, member.user_id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-colors">
                        <CheckCircle size={12} /> Approuver
                      </button>
                      <button onClick={() => handleRejectMember(member.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors">
                        <XCircle size={12} /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
          <p className="text-sm text-gray-500 mb-4">Créez votre club ou faites une demande pour rejoindre un club existant.</p>
          <button onClick={() => { setMode('create'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-orange-primary/50 rounded-xl transition-all text-left">
            <div className="w-10 h-10 bg-orange-primary/20 rounded-lg flex items-center justify-center"><Plus size={18} className="text-orange-primary" /></div>
            <div><div className="text-sm font-bold text-white">Créer un club</div><div className="text-xs text-gray-500">Vous en devenez l'administrateur</div></div>
          </button>
          <button onClick={() => { setMode('join'); setError(''); }}
            className="w-full flex items-center gap-3 p-4 bg-dark-tertiary hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all text-left">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center"><LogIn size={18} className="text-blue-400" /></div>
            <div><div className="text-sm font-bold text-white">Demander à rejoindre</div><div className="text-xs text-gray-500">Avec un code — approbation requise</div></div>
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
          <div className="flex items-center gap-4">
            <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-600 hover:border-orange-primary cursor-pointer flex items-center justify-center overflow-hidden transition-colors">
              {logoPreview ? <img src={logoPreview} className="w-full h-full object-contain" /> : <Upload size={20} className="text-gray-500" />}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Logo (optionnel)</div>
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
            {[{ label: 'Couleur principale', val: colorPrimary, set: setColorPrimary }, { label: 'Couleur secondaire', val: colorSecondary, set: setColorSecondary }].map(c => (
              <div key={c.label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={c.val} onChange={e => c.set(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer" />
                  <span className="text-xs text-gray-400">{c.val}</span>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 bg-orange-primary hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors">
            {saving ? 'Création...' : 'Créer le club'}
          </button>
        </div>
      )}

      {/* Formulaire rejoindre */}
      {mode === 'join' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Demander à rejoindre</span>
            <button onClick={() => setMode('view')} className="p-1 hover:bg-gray-700 rounded-lg"><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">Votre demande devra être approuvée par l'administrateur du club avant d'accéder aux données.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Code du club</label>
            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white rounded-lg text-xl font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-600 mt-1">Demandez le code à l'administrateur du club</p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleRequestJoin} disabled={saving || joinCode.length < 6}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors">
            {saving ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </div>
      )}
    </div>
  );
}
