import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Mail, Lock, Shield, Save, Check, Eye, EyeOff, AlertCircle, LogOut, Trash2, Camera, Bell, Globe, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ClubManager from './ClubManager';
import { useT } from '../i18n/I18nContext';
import { validateImageFile } from '../utils/uploadImage';

interface ProfilePageProps {
  onBack: () => void;
}

const ROLES = ['Analyste vidéo', 'Entraîneur principal', 'Entraîneur adjoint', 'Préparateur physique', 'Dirigeant', 'Autre'];

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'security' | 'preferences' | 'danger'>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Identité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Sécurité
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Préférences
  const [notifMatchReport, setNotifMatchReport] = useState(true);
  const [notifClubRequests, setNotifClubRequests] = useState(true);
  const [language, setLanguage] = useState('fr');

  // Danger
  const { t, setLanguage: setAppLanguage } = useT();
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const meta = user.user_metadata || {};
    setEmail(user.email || '');
    setNewEmail(user.email || '');
    setFirstName(meta.first_name || '');
    setLastName(meta.last_name || '');
    setRole(meta.role || '');
    setClubId(meta.club_id || null);
    setClubLogo(meta.club_logo || null);
    setClubName(meta.club_name || '');
    setAvatarUrl(meta.avatar_url || '');
    setAvatarPreview(meta.avatar_url || '');
    setNotifMatchReport(meta.notif_match_report !== false);
    setNotifClubRequests(meta.notif_club_requests !== false);
    setLanguage(meta.language || 'fr');
    setLoading(false);
  };

  const [avatarUploadError, setAvatarUploadError] = useState('');

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { setAvatarUploadError(v.error || 'Fichier invalide'); e.target.value = ''; return; }
    setAvatarUploadError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return avatarUrl || null;
    const ext = avatarFile.name.split('.').pop();
    const path = `avatars/${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('player-photos').upload(path, avatarFile, { upsert: true });
    if (error) return null;
    return supabase.storage.from('player-photos').getPublicUrl(path).data.publicUrl;
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg); setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveIdentity = async () => {
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const finalAvatar = await uploadAvatar(user.id);
      await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName, role, avatar_url: finalAvatar || avatarUrl }
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      showSuccess('Profil sauvegardé !');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === email) return;
    setSaving(true); setError('');
    try {
      await supabase.auth.updateUser({ email: newEmail });
      showSuccess('Email de confirmation envoyé à ' + newEmail);
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 8) { setError('Minimum 8 caractères'); return; }
    setSaving(true); setError('');
    try {
      await supabase.auth.updateUser({ password: newPassword });
      setNewPassword(''); setConfirmPassword('');
      showSuccess('Mot de passe modifié !');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleSavePreferences = async () => {
    setAppLanguage(language as any);
    setSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { notif_match_report: notifMatchReport, notif_club_requests: notifClubRequests, language }
      });
      showSuccess('Préférences sauvegardées !');
    } catch (err: any) { setError(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== email) { setError('Email incorrect'); return; }
    // Supabase ne permet pas la suppression côté client — on peut désactiver le compte
    setError('Pour supprimer votre compte, contactez support@orion-app.com');
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || email.charAt(0).toUpperCase();

  const TABS = [
    { key: 'identity', label: 'Profil', icon: User },
    { key: 'security', label: 'Sécurité', icon: Shield },
    { key: 'preferences', label: 'Préférences', icon: Bell },
    { key: 'danger', label: 'Compte', icon: Trash2 },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--orion-bg)", color:"var(--orion-text)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="o-btn o-btn--ghost o-btn--sm">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-base font-medium text-orion-text">Mon Compte</h1>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/40  text-sm font-semibold transition-colors"
          >
            <LogOut size={15} />
            Se déconnecter
          </button>
        </div>

        {/* Avatar + résumé */}
        <div className="flex items-center gap-4 bg-dark-secondary border border-orion-line  p-5 mb-6">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} className="w-16 h-16 rounded-full object-cover border-2 border-orion-accent" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-primary/20 border-2 border-orion-accent flex items-center justify-center text-xl font-black text-orion-accent">
                {initials || <User size={24} />}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-primary rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors"
            >
              <Camera size={12} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Utilisateur ORION'}
            </div>
            <div className="text-xs text-gray-400">{role || 'Rôle non défini'}</div>
            {clubName && <div className="text-xs text-orion-accent mt-0.5">🏟️ {clubName}</div>}
            <div className="text-xs text-gray-600 mt-0.5">{email}</div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50  p-3 mb-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 bg-green-900/20 border border-green-800/50  p-3 mb-4">
            <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-orion-line mb-6 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => { setActiveTab(t.key as any); setError(''); setSuccess(''); }}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 flex-shrink-0 ${
                  activeTab === t.key ? 'text-orion-accent border-orange-400' : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Profil */}
        {activeTab === 'identity' && (
          <div className="space-y-5">
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Prénom</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Lucas"
                    autoComplete="off"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Nom</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Giovenco"
                    autoComplete="off"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Rôle</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`px-3 py-1.5  text-xs font-semibold transition-all ${
                        role === r ? 'bg-orange-primary text-white' : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <ClubManager
              currentClubId={clubId}
              onClubSelected={(club) => {
                setClubId(club?.id || null);
                setClubLogo(club?.logo_url || null);
                if (club) setClubName(club.name);
              }}
            />

            <button onClick={handleSaveIdentity} disabled={saving}
              className={`w-full py-3  font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                saved ? 'bg-green-600 text-white' : 'bg-orange-primary hover:bg-orange-600 text-white'
              }`}
            >
              {saved ? <><Check size={16} /> Sauvegardé</> : <><Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}</>}
            </button>
          </div>
        )}

        {/* Tab Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            {/* Email */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <div className="flex items-center gap-2 mb-4">
                <Mail size={15} className="text-orange-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adresse email</h3>
              </div>
              <div className="flex gap-2">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-tertiary border border-orion-line text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                <button onClick={handleUpdateEmail} disabled={newEmail === email || saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white  text-sm font-semibold transition-colors">
                  Modifier
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">Un email de confirmation sera envoyé à la nouvelle adresse</p>
            </div>

            {/* Mot de passe */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={15} className="text-orange-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mot de passe</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="w-full px-3 py-2 pr-10 bg-dark-tertiary border border-orion-line text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Confirmer</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line text-white  text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-400">Les mots de passe ne correspondent pas</p>}
                {newPassword.length >= 8 && newPassword === confirmPassword && <p className="text-xs text-green-400">✓ Mot de passe valide</p>}
              </div>
              <button onClick={handleUpdatePassword} disabled={!newPassword || !confirmPassword || saving}
                className="w-full mt-4 py-2.5 bg-orange-primary hover:bg-orange-600 disabled:opacity-40 text-white  font-semibold text-sm transition-colors">
                Mettre à jour le mot de passe
              </button>
            </div>

            {/* Sessions */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone size={15} className="text-orange-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session active</h3>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-tertiary ">
                <div>
                  <div className="text-sm text-white font-medium">Session actuelle</div>
                  <div className="text-xs text-gray-500">Navigateur web · {new Date().toLocaleDateString('fr-FR')}</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <button onClick={handleSignOut}
                className="w-full mt-3 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/40  text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <LogOut size={14} /> Se déconnecter de cette session
              </button>
            </div>
          </div>
        )}

        {/* Tab Préférences */}
        {activeTab === 'preferences' && (
          <div className="space-y-5">
            {/* Notifications */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={15} className="text-orange-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notifications</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Rapports de match générés', value: notifMatchReport, set: setNotifMatchReport, desc: 'Recevoir une notification quand un rapport est prêt' },
                  { label: 'Demandes d\'adhésion club', value: notifClubRequests, set: setNotifClubRequests, desc: 'Être notifié quand quelqu\'un veut rejoindre votre club' },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between p-3 bg-dark-tertiary ">
                    <div>
                      <div className="text-sm text-white font-medium">{n.label}</div>
                      <div className="text-xs text-gray-500">{n.desc}</div>
                    </div>
                    <button onClick={() => n.set(!n.value)}
                      className={`w-11 h-6 rounded-full transition-all ${n.value ? 'bg-orange-primary' : 'bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-all ${n.value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Langue */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={15} className="text-orange-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Langue</h3>
              </div>
              <div className="flex gap-2">
                {[{ code: 'fr', label: '🇫🇷 Français' }, { code: 'en', label: '🇬🇧 English' }, { code: 'es', label: '🇪🇸 Español' }].map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`flex-1 py-2  text-sm font-semibold transition-all ${
                      language === l.code ? 'bg-orange-primary text-white' : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white'
                    }`}
                  >{l.label}</button>
                ))}
              </div>
            </div>

            <button onClick={handleSavePreferences} disabled={saving}
              className="w-full py-3 bg-orange-primary hover:bg-orange-600 text-white  font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <Save size={15} /> Sauvegarder les préférences
            </button>
          </div>
        )}

        {/* Tab Danger / Compte */}
        {activeTab === 'danger' && (
          <div className="space-y-5">

            {/* Déconnexion rapide */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Session</h3>
              <p className="text-sm text-gray-400 mb-4">Vous êtes connecté en tant que <span className="text-white font-semibold">{email}</span></p>
              <button onClick={handleSignOut}
                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/40  font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                <LogOut size={15} /> Se déconnecter
              </button>
            </div>

            {/* Export données */}
            <div className="bg-dark-secondary border border-orion-line  p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Mes données</h3>
              <p className="text-sm text-gray-400 mb-4">Téléchargez toutes vos données ORION (matchs, stats, équipes) en format JSON.</p>
              <button className="w-full py-2.5 bg-dark-tertiary hover:bg-dark-tertiary text-gray-300 border border-orion-line  text-sm font-semibold transition-colors">
                📦 Exporter mes données
              </button>
            </div>

            {/* Suppression compte */}
            <div className="bg-red-950/20 border border-red-900/50  p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 size={15} className="text-red-500" />
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Zone dangereuse</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">La suppression de votre compte est <strong className="text-red-400">irréversible</strong>. Toutes vos données (matchs, équipes, stats) seront définitivement supprimées.</p>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1.5">Confirmez en tapant votre email</label>
                <input type="email" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={email}
                  className="w-full px-3 py-2 bg-dark-tertiary border border-red-800/50 text-white  text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== email}
                className="w-full py-2.5 bg-red-700/30 hover:bg-red-700/50 disabled:opacity-30 text-red-400 border border-red-700/50  text-sm font-semibold transition-colors">
                Supprimer définitivement mon compte
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
