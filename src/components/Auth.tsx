import { useState } from 'react';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OrionLogo from './OrionLogo';

interface AuthProps { onAuthSuccess: () => void; }

const PASSWORD_RULES = [
  { label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
];

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPwRules, setShowPwRules] = useState(false);

  const pwStrength = PASSWORD_RULES.filter(r => r.test(password)).length;
  const pwValid = pwStrength === PASSWORD_RULES.length;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validations côté client
    if (!emailValid) { setError('Adresse email invalide'); return; }

    if (!isLogin) {
      if (!pwValid) { setError('Le mot de passe ne respecte pas les règles de sécurité'); return; }
      if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Messages d'erreur francisés
          if (error.message.includes('Invalid login')) throw new Error('Email ou mot de passe incorrect');
          if (error.message.includes('Email not confirmed')) throw new Error('Veuillez confirmer votre email avant de vous connecter');
          throw error;
        }
        onAuthSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          if (error.message.includes('already registered')) throw new Error('Cet email est déjà utilisé');
          throw error;
        }
        // Supabase envoie un email de confirmation
        if (data.user && !data.session) {
          setSuccess('Un email de confirmation a été envoyé à ' + email + '. Vérifiez votre boîte mail pour activer votre compte.');
        } else {
          onAuthSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (valid?: boolean) => ({
    width: '100%', padding: '12px 14px', background: 'var(--orion-surface-2)',
    border: `1px solid ${valid === false ? 'rgba(231,76,60,0.6)' : valid === true ? 'rgba(46,204,113,0.6)' : 'var(--orion-line-strong)'}`,
    color: 'var(--orion-text)', fontSize: 14, outline: 'none', transition: 'border-color .15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--orion-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Glow décoratif */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(61,128,224,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><OrionLogo size={64} /></div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--orion-text)', letterSpacing: '0.2em' }}>ORION</div>
          <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginTop: 4, fontFamily: 'monospace', letterSpacing: '0.15em' }}>SPORTS VIDEO ANALYTICS</div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--orion-surface)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 8, padding: '32px 28px', boxShadow: 'var(--orion-shadow-lg)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 6, padding: 3, marginBottom: 28 }}>
            {[{ key: true, label: 'Connexion' }, { key: false, label: 'Inscription' }].map(t => (
              <button key={String(t.key)} onClick={() => { setIsLogin(t.key); setError(null); setSuccess(null); setPassword(''); setConfirmPassword(''); }}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: 4, transition: 'all .15s',
                  background: isLogin === t.key ? 'var(--orion-accent)' : 'transparent',
                  color: isLogin === t.key ? '#fff' : 'var(--orion-text-mute)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Adresse email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="vous@email.com" autoComplete="email"
                  style={inputStyle(email.length > 0 ? emailValid : undefined)} />
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); if (!isLogin) setShowPwRules(true); }}
                    required placeholder="••••••••" autoComplete={isLogin ? 'current-password' : 'new-password'}
                    style={{ ...inputStyle(!isLogin && password.length > 0 ? pwValid : undefined), paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orion-text-mute)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Règles mot de passe (inscription uniquement) */}
                {!isLogin && showPwRules && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--orion-surface-2)', border: '1px solid var(--orion-line)', borderRadius: 6 }}>
                    {/* Barre de force */}
                    <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                      {PASSWORD_RULES.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 3, background: i < pwStrength ? (pwStrength === 3 ? 'var(--orion-green)' : pwStrength === 2 ? 'var(--orion-amber)' : 'var(--orion-red)') : 'var(--orion-line-strong)', transition: 'background .2s' }} />
                      ))}
                    </div>
                    {PASSWORD_RULES.map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        {r.test(password)
                          ? <Check size={12} style={{ color: 'var(--orion-green)', flexShrink: 0 }} />
                          : <X size={12} style={{ color: 'var(--orion-text-faint)', flexShrink: 0 }} />}
                        <span style={{ fontSize: 11, color: r.test(password) ? 'var(--orion-green)' : 'var(--orion-text-mute)' }}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmation mot de passe (inscription) */}
              {!isLogin && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Confirmer le mot de passe
                  </label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required placeholder="••••••••" autoComplete="new-password"
                    style={inputStyle(confirmPassword.length > 0 ? password === confirmPassword : undefined)} />
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p style={{ fontSize: 11, color: 'var(--orion-red)', marginTop: 5 }}>Les mots de passe ne correspondent pas</p>
                  )}
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div style={{ padding: '10px 14px', background: 'var(--orion-red-dim)', border: '1px solid rgba(231,76,60,0.3)', borderLeft: '3px solid var(--orion-red)', borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: 'var(--orion-red)' }}>{error}</p>
                </div>
              )}

              {/* Succès */}
              {success && (
                <div style={{ padding: '10px 14px', background: 'var(--orion-green-dim)', border: '1px solid rgba(46,204,113,0.3)', borderLeft: '3px solid var(--orion-green)', borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: 'var(--orion-green)' }}>{success}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading || (!isLogin && (!pwValid || password !== confirmPassword || !emailValid))}
                style={{ width: '100%', padding: '12px', background: loading ? 'var(--orion-line-strong)' : 'var(--orion-accent)', border: 'none', borderRadius: 6, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, transition: 'all .15s' }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Chargement...</> : isLogin ? 'Se connecter' : 'Créer mon compte'}
              </button>

              {/* Mot de passe oublié */}
              {isLogin && (
                <button type="button" onClick={async () => {
                  if (!emailValid) { setError('Entrez votre email d\'abord'); return; }
                  await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                  setSuccess('Email de réinitialisation envoyé à ' + email);
                }} style={{ background: 'none', border: 'none', color: 'var(--orion-text-mute)', fontSize: 12, cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                  Mot de passe oublié ?
                </button>
              )}
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--orion-text-faint)' }}>
          Orion — Sports Video Analytics & Coding
        </p>
      </div>
    </div>
  );
}
