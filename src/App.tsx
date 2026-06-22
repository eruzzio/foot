import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import CodingInterface from './components/CodingInterface';
import MyStats from './components/MyStats';
import MyTeam from './components/MyTeam';
import PanelsManager from './components/PanelsManager';
import EvolutionDashboard from './components/EvolutionDashboard';
import ProfilePage from './components/ProfilePage';
import AppLayout from './components/AppLayout';
import AdminPanel from './components/AdminPanel';
import ConfirmEmail from './components/ConfirmEmail';
import SharedReport from './components/SharedReport';
import PricingPage from './components/PricingPage';
import { usePlan } from './hooks/usePlan';
import { I18nProvider } from './i18n/I18nContext';

type PageType = 'home' | 'live' | 'stats' | 'team' | 'panels' | 'evolution' | 'profile' | 'admin' | 'pricing';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [initialMatchId, setInitialMatchId] = useState<string | null>(null);
  const [homeKey, setHomeKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { trialDaysLeft, trialExpired, isPro, isTrial } = usePlan();

  useEffect(() => {
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (session?.user?.user_metadata?.first_name) {
        setUserName(session.user.user_metadata.first_name);
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session?.user?.user_metadata?.first_name) {
      setUserName(session.user.user_metadata.first_name);
    }
    if (session?.user) {
      supabase.from('orion_users').select('is_admin').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.is_admin) setIsAdmin(true); });
    }
  };

  const handleNavigate = (page: string) => {
    if (page.startsWith('stats-')) {
      setInitialMatchId(page.replace('stats-', ''));
      setCurrentPage('stats');
      return;
    }
    setInitialMatchId(null);
    setCurrentPage(page as PageType);
  };

  const handleBackToHome = () => {
    setInitialMatchId(null);
    setHomeKey(prev => prev + 1);
    setCurrentPage('home');
  };

  // Retour Stripe succès
  if (window.location.search.includes('payment=success')) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, padding:24 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--orion-green-dim)', border:'2px solid var(--orion-green)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--orion-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:'var(--orion-text)', marginBottom:8 }}>Bienvenue dans ORION Pro ! 🎉</h2>
          <p style={{ fontSize:13, color:'var(--orion-text-mute)', marginBottom:24 }}>Ton abonnement est actif. Profite de toutes les fonctionnalités.</p>
          <button onClick={() => window.location.href = '/'} className="o-btn o-btn--primary" style={{ padding:'12px 24px', fontSize:14 }}>
            Accéder à l'app →
          </button>
        </div>
      </div>
    );
  }

  // Rapport partagé public
  if (window.location.pathname.startsWith('/share/')) {
    return <SharedReport />;
  }

  // Détecter la page de confirmation email
  if (window.location.pathname === '/confirm' || window.location.hash.includes('type=signup')) {
    return <ConfirmEmail />;
  }

  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#4a4a58', fontSize:13 }}>Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={checkAuth} />;
  }

  // Pages sans layout (codage live plein écran)
  if (currentPage === 'live') {
    return (
      <I18nProvider>
        <CodingInterface onBack={handleBackToHome} />
      </I18nProvider>
    );
  }

  // HomePage a sa propre sidebar intégrée
  if (currentPage === 'home') {
    return (
      <I18nProvider>
        <HomePage key={homeKey} onNavigate={handleNavigate} isAdmin={isAdmin} />
      </I18nProvider>
    );
  }

  // Toutes les autres pages utilisent AppLayout
  const renderContent = () => {
    switch (currentPage) {
      case 'stats':    return <MyStats onBack={handleBackToHome} initialMatchId={initialMatchId} />;
      case 'team':     return <MyTeam onBack={handleBackToHome} />;
      case 'panels':   return <PanelsManager onBack={handleBackToHome} />;
      case 'evolution':return <EvolutionDashboard onBack={handleBackToHome} />;
      case 'profile':  return <ProfilePage onBack={handleBackToHome} />;
      case 'admin':    return <AdminPanel />;
      case 'pricing':  return <PricingPage onBack={handleBackToHome} />;
      default:         return <HomePage key={homeKey} onNavigate={handleNavigate} isAdmin={isAdmin} />;
    }
  };

  return (
    <I18nProvider>
      <AppLayout onNavigate={handleNavigate} currentPage={currentPage} userName={userName} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} trialExpired={trialExpired} isPro={isPro}>
        {renderContent()}
      </AppLayout>
    </I18nProvider>
  );
}

export default App;
