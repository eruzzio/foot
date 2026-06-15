import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './orion/Orion';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function ConfirmEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    const type = params.get('type');

    if (type === 'signup' && accessToken) {
      // Session déjà établie par Supabase via le lien
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('success');
          // Redirection auto vers l'app après 3s
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          setError('Lien invalide ou expiré.');
          setStatus('error');
        }
      });
    } else {
      // Essayer de récupérer la session depuis l'URL
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('success');
          setTimeout(() => { window.location.href = '/'; }, 3000);
        } else {
          setError('Lien invalide ou expiré. Demande un nouvel email de confirmation.');
          setStatus('error');
        }
      });
    }
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      
      <div style={{ marginBottom:32 }}>
        <OrionLogo height={20} />
      </div>

      <div style={{ width:'100%', maxWidth:420, background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:8, padding:'40px 32px', textAlign:'center' }}>

        {status === 'loading' && (
          <>
            <Loader size={40} style={{ color:'var(--orion-accent)', margin:'0 auto 20px', animation:'spin 1s linear infinite' }} />
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--orion-text)', marginBottom:8 }}>Vérification en cours…</h2>
            <p style={{ fontSize:13, color:'var(--orion-text-mute)' }}>Confirmation de ton adresse email</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--orion-green-dim)', border:'2px solid var(--orion-green)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <CheckCircle size={32} style={{ color:'var(--orion-green)' }} />
            </div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--orion-text)', marginBottom:10 }}>
              Bienvenue sur ORION ! ⚽
            </h2>
            <p style={{ fontSize:13, color:'var(--orion-text-mute)', lineHeight:1.6, marginBottom:24 }}>
              Ton adresse email a bien été confirmée.<br />
              Tu vas être redirigé automatiquement…
            </p>
            {/* Barre de progression */}
            <div style={{ height:4, background:'var(--orion-surface-3)', borderRadius:2, overflow:'hidden', marginBottom:20 }}>
              <div style={{ height:'100%', background:'var(--orion-green)', borderRadius:2, animation:'progress 3s linear forwards' }} />
            </div>
            <button onClick={() => window.location.href = '/'} className="o-btn o-btn--primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
              Accéder à l'app →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--orion-red-dim)', border:'2px solid var(--orion-red)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <XCircle size={32} style={{ color:'var(--orion-red)' }} />
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--orion-text)', marginBottom:10 }}>
              Lien invalide
            </h2>
            <p style={{ fontSize:13, color:'var(--orion-text-mute)', lineHeight:1.6, marginBottom:24 }}>
              {error}
            </p>
            <button onClick={() => window.location.href = '/'} className="o-btn o-btn--primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
              Retour à la connexion
            </button>
          </>
        )}
      </div>

      <p style={{ marginTop:24, fontSize:11, color:'var(--orion-text-faint)', fontFamily:'var(--orion-font-mono)' }}>
        ORION · Sports Video Analytics
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}
