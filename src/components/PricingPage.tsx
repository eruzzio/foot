import { useState, useEffect } from 'react';
import { Check, Zap, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OrionLogo } from './orion/Orion';
import { usePlan } from '../hooks/usePlan';

interface PricingPageProps { onBack: () => void; }

export default function PricingPage({ onBack }: PricingPageProps) {
  const { plan, trialDaysLeft, trialExpired, isPro } = usePlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Non connecté'); setLoading(false); return; }

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Erreur lors de la création du paiement');
    } catch {
      setError('Erreur réseau');
    }
    setLoading(false);
  };

  const PRO_FEATURES = [
    'Matchs illimités',
    'Panneaux illimités',
    'Rapport PDF personnalisable',
    'Export Excel, CSV, XML, Once Sport',
    'Partage de rapports (lien public)',
    'Analyse vidéo (fichier local)',
    'Dashboard Évolution',
    'Heatmaps avancées',
    'Accès à toutes les futures fonctionnalités',
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 16px' }}>
      <div style={{ marginBottom:32 }}>
        <OrionLogo height={18} />
      </div>

      {/* Bannière essai */}
      {plan === 'trial' && !trialExpired && (
        <div style={{ background:'rgba(61,128,224,0.1)', border:'1px solid var(--orion-accent-line)', borderRadius:6, padding:'10px 20px', marginBottom:24, display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={14} style={{ color:'var(--orion-accent)' }} />
          <span style={{ fontSize:13, color:'var(--orion-accent)', fontWeight:600 }}>
            Essai gratuit — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {trialExpired && (
        <div style={{ background:'var(--orion-red-dim)', border:'1px solid var(--orion-red)', borderRadius:6, padding:'10px 20px', marginBottom:24, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, color:'var(--orion-red)', fontWeight:600 }}>
            ⚠️ Ton essai a expiré — passe en Pro pour continuer à utiliser ORION
          </span>
        </div>
      )}

      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Card Pro */}
        <div style={{ background:'var(--orion-surface)', border:`2px solid ${isPro ? 'var(--orion-green)' : 'var(--orion-accent)'}`, borderRadius:8, overflow:'hidden' }}>
          {/* Badge */}
          <div style={{ background:'var(--orion-accent)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, fontWeight:800, color:'white', letterSpacing:'0.1em', textTransform:'uppercase' }}>
              {isPro ? '✓ Plan actif' : 'Plan Pro'}
            </span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.8)' }}>Recommandé</span>
          </div>

          <div style={{ padding:'28px 28px 24px' }}>
            {/* Prix */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                <span style={{ fontSize:42, fontWeight:800, color:'var(--orion-text)', lineHeight:1 }}>8,99€</span>
                <span style={{ fontSize:14, color:'var(--orion-text-mute)' }}>/mois</span>
              </div>
              <div style={{ fontSize:12, color:'var(--orion-text-mute)', marginTop:4 }}>Sans engagement · Résiliable à tout moment</div>
            </div>

            {/* Features */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {PRO_FEATURES.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Check size={14} style={{ color:'var(--orion-green)', flexShrink:0 }} />
                  <span style={{ fontSize:13, color:'var(--orion-text-dim)' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isPro ? (
              <div style={{ textAlign:'center', padding:'12px', background:'var(--orion-green-dim)', border:'1px solid var(--orion-green)', borderRadius:4, fontSize:13, fontWeight:700, color:'var(--orion-green)' }}>
                ✓ Tu es déjà abonné Pro
              </div>
            ) : (
              <button onClick={handleSubscribe} disabled={loading}
                className="o-btn o-btn--primary"
                style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, fontWeight:800, borderRadius:6 }}>
                <Zap size={16} />
                {loading ? 'Redirection…' : trialExpired ? 'Passer en Pro maintenant' : 'Commencer avec Pro'}
              </button>
            )}

            {error && (
              <div style={{ marginTop:10, fontSize:12, color:'var(--orion-red)', textAlign:'center' }}>{error}</div>
            )}

            {!isPro && (
              <div style={{ marginTop:12, textAlign:'center', fontSize:11, color:'var(--orion-text-faint)' }}>
                Paiement sécurisé par Stripe · CB, Visa, Mastercard
              </div>
            )}
          </div>
        </div>

        {/* Retour */}
        {!trialExpired && (
          <button onClick={onBack} style={{ width:'100%', marginTop:16, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--orion-text-mute)' }}>
            ← Retour à l'app
          </button>
        )}
      </div>
    </div>
  );
}
