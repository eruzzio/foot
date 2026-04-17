import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Star } from 'lucide-react';
import OrionLogo from './OrionLogo';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0c0e14 0%, #0d1120 40%, #0c1028 70%, #0c0e14 100%)' }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #2f8de4 0%, transparent 70%)' }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2f8de4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
        {[
          { top: '10%', left: '8%' }, { top: '30%', right: '6%' },
          { top: '65%', left: '4%' }, { top: '80%', right: '12%' },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              top: s.top, left: (s as any).left, right: (s as any).right,
              background: '#5aaff7', opacity: 0.4,
              boxShadow: '0 0 6px rgba(90,175,247,0.8)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <OrionLogo size={88} className="mb-4 drop-shadow-2xl" />
          <h1
            className="text-3xl font-black tracking-widest text-white uppercase mb-1"
            style={{ letterSpacing: '0.25em', textShadow: '0 0 25px rgba(47,141,228,0.4)' }}
          >
            ORION
          </h1>
          <div className="flex items-center gap-2">
            <Star size={10} style={{ color: '#5aaff7' }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#5aaff7', letterSpacing: '0.2em' }}>
              Analysed Solution
            </span>
            <Star size={10} style={{ color: '#5aaff7' }} />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: 'linear-gradient(145deg, #161a27 0%, #1a1e2e 100%)',
            borderColor: 'rgba(47,141,228,0.2)',
            boxShadow: '0 0 60px rgba(47,141,228,0.08), 0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-7"
            style={{ background: 'rgba(47,141,228,0.06)', border: '1px solid rgba(47,141,228,0.12)' }}
          >
            {['login', 'register'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(tab === 'login'); setError(null); }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={
                  (tab === 'login') === isLogin
                    ? { background: 'rgba(47,141,228,0.2)', color: '#5aaff7', border: '1px solid rgba(47,141,228,0.3)' }
                    : { color: '#6b7280' }
                }
              >
                {tab === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#7a8499' }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(47,141,228,0.2)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(47,141,228,0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(47,141,228,0.2)'}
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#7a8499' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(47,141,228,0.2)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(47,141,228,0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(47,141,228,0.2)'}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? 'rgba(47,141,228,0.4)' : 'linear-gradient(135deg, #2f8de4 0%, #1a6bbf 100%)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(47,141,228,0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Chargement...
                </>
              ) : (
                isLogin ? 'Se connecter' : "Créer un compte"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'rgba(90,175,247,0.3)' }}>
          Orion &mdash; Sports Video Analytics &amp; Coding
        </p>
      </div>
    </div>
  );
}
