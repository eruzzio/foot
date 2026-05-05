import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, Shield, Building2, Save, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  onBack: () => void;
}

const ROLES = ['Analyste vidéo', 'Entraîneur principal', 'Entraîneur adjoint', 'Préparateur physique', 'Dirigeant', 'Autre'];
const CATEGORIES = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Senior', 'Vétérans', 'Féminin'];

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'security'>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Identité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [clubName, setClubName] = useState('');
  const [clubCategory, setClubCategory] = useState('');
  const [clubCity, setClubCity] = useState('');

  // Sécurité
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || '');
    setNewEmail(user.email || '');

    // Charger le profil depuis user_metadata ou une table profiles
    const meta = user.user_metadata || {};
    setFirstName(meta.first_name || '');
    setLastName(meta.last_name || '');
    setRole(meta.role || '');
    setClubName(meta.club_name || '');
    setClubCategory(meta.club_category || '');
    setClubCity(meta.club_city || '');
    setLoading(false);
  };

  const handleSaveIdentity = async () => {
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          club_name: clubName,
          club_category: clubCategory,
          club_city: clubCity,
        }
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === email) return;
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setError('Un email de confirmation a été envoyé à ' + newEmail);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
    setSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
    setSaving(false);
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Mon Profil</h1>
            <p className="text-sm text-gray-400">Gérez vos informations personnelles et de sécurité</p>
          </div>
        </div>

        {/* Avatar + nom */}
        <div className="flex items-center gap-4 bg-dark-secondary border border-gray-800 rounded-xl p-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-primary/20 border-2 border-orange-primary flex items-center justify-center text-xl font-black text-orange-400">
            {initials || <User size={24} />}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Utilisateur ORION'}</div>
            <div className="text-sm text-gray-400">{role || 'Rôle non défini'}</div>
            {clubName && <div className="text-xs text-orange-400 mt-0.5">🏟️ {clubName}{clubCategory ? ` — ${clubCategory}` : ''}</div>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-6">
          {[
            { key: 'identity', label: 'Identité', icon: User },
            { key: 'security', label: 'Sécurité', icon: Shield },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === t.key
                    ? 'text-orange-400 border-orange-400'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className={`flex items-start gap-3 rounded-lg p-3 mb-4 ${
            error.includes('confirmation') ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-red-900/20 border border-red-800/50'
          }`}>
            <AlertCircle size={16} className={error.includes('confirmation') ? 'text-blue-400' : 'text-red-400'} />
            <p className="text-sm text-gray-300">{error}</p>
          </div>
        )}

        {/* Tab Identité */}
        {activeTab === 'identity' && (
          <div className="space-y-6">

            {/* Informations personnelles */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Prénom</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Lucas"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rôle</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        role === r ? 'bg-orange-primary text-white' : 'bg-dark-tertiary text-gray-400 border border-gray-700 hover:text-white'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Club */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={16} className="text-orange-primary" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mon Club</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom du club</label>
                  <input type="text" value={clubName} onChange={e => setClubName(e.target.value)} placeholder="AS Béziers"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Catégorie</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button key={c} type="button" onClick={() => setClubCategory(c)}
                          className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                            clubCategory === c ? 'bg-blue-600 text-white' : 'bg-dark-tertiary text-gray-400 border border-gray-700 hover:text-white'
                          }`}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ville</label>
                    <input type="text" value={clubCity} onChange={e => setClubCity(e.target.value)} placeholder="Béziers"
                      className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleSaveIdentity} disabled={saving}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                saved ? 'bg-green-600 text-white' : 'bg-orange-primary hover:bg-orange-600 text-white'
              }`}
            >
              {saved ? <><Check size={16} /> Sauvegardé !</> : <><Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</>}
            </button>
          </div>
        )}

        {/* Tab Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-5">

            {/* Email */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Mail size={16} className="text-orange-primary" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Adresse email</h3>
              </div>
              <div className="flex gap-2">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                <button onClick={handleUpdateEmail} disabled={newEmail === email || saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors">
                  Modifier
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">Un email de confirmation sera envoyé à la nouvelle adresse</p>
            </div>

            {/* Mot de passe */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-orange-primary" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mot de passe</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="w-full px-3 py-2 pr-10 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirmer le mot de passe</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary" />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">Les mots de passe ne correspondent pas</p>
                )}
                {newPassword && newPassword.length >= 8 && newPassword === confirmPassword && (
                  <p className="text-xs text-green-400">✓ Mot de passe valide</p>
                )}
              </div>
              <button onClick={handleUpdatePassword} disabled={!newPassword || !confirmPassword || saving}
                className="w-full mt-4 py-2.5 bg-orange-primary hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saved ? <><Check size={14} /> Mot de passe modifié</> : <><Lock size={14} /> Mettre à jour le mot de passe</>}
              </button>
            </div>

            {/* Déconnexion */}
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              className="w-full py-3 border border-red-800/50 text-red-400 hover:bg-red-900/20 rounded-xl font-semibold text-sm transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
