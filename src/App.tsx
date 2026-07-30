import { useState, useEffect, lazy, Suspense } from 'react';
import OnboardingWizard from './components/OnboardingWizard';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';
import { ToastProvider } from './contexts/ToastContext';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import AppLayout from './components/AppLayout';
import { usePlan } from './hooks/usePlan';
import { I18nProvider } from './i18n/I18nContext';

// Composants chargés à la demande (code-splitting) : allège le bundle initial
const CodingInterface = lazy(() => import('./components/CodingInterface'));
const MyStats = lazy(() => import('./components/MyStats'));
const MyTeam = lazy(() => import('./components/MyTeam'));
const PanelsManager = lazy(() => import('./components/PanelsManager'));
const EvolutionDashboard = lazy(() => import('./components/EvolutionDashboard'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ConfirmEmail = lazy(() => import('./components/ConfirmEmail'));
const SharedReport = lazy(() => import('./components/SharedReport'));
const SharedPlaylist = lazy(() => import('./components/SharedPlaylist'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const MentionsLegales = lazy(() => import('./components/MentionsLegales'));
const CGU = lazy(() => import('./components/CGU'));
const PolitiqueConfidentialite = lazy(() => import('./components/PolitiqueConfidentialite'));

type PageType = 'home' | 'live' | 'stats' | 'team' | 'panels' | 'evolution' | 'profile' | 'admin' | 'pricing' | 'mentions-legales' | 'cgu' | 'confidentialite';

const PageLoader = () => (
  <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ color:'var(--orion-text-mute)', fontSize:13 }}>Chargement…</div>
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [initialMatchId, setInitialMatchId] = useState<string | null>(null);
  const [homeKey, setHomeKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
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
      supabase.from('orion_users').select('is_admin, onboarding_completed').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true);
          if (data && !data.onboarding_completed) setShowOnboarding(true);
        });
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

  if (isAuthenticated && showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

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
  if (window.location.pathname.startsWith('/playlist/')) {
    return <Suspense fallback={<PageLoader />}><SharedPlaylist /></Suspense>;
  }

  if (window.location.pathname.startsWith('/share/')) {
    return <Suspense fallback={<PageLoader />}><SharedReport /></Suspense>;
  }

  // Détecter la page de confirmation email
  if (window.location.pathname === '/confirm' || window.location.hash.includes('type=signup')) {
    return <Suspense fallback={<PageLoader />}><ConfirmEmail /></Suspense>;
  }

  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'var(--orion-text-mute)', fontSize:13 }}>Chargement…</div>
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
        <Suspense fallback={<PageLoader />}>
          <CodingInterface onBack={handleBackToHome} />
        </Suspense>
      </I18nProvider>
    );
  }

  // HomePage a sa propre sidebar intégrée
  if (currentPage === 'home') {
    return (
      <I18nProvider>
        <HomePage key={homeKey} onNavigate={handleNavigate} isAdmin={isAdmin} isPro={isPro} />
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
      case 'mentions-legales': return <MentionsLegales onBack={handleBackToHome} />;
      case 'cgu':      return <CGU onBack={handleBackToHome} />;
      case 'confidentialite': return <PolitiqueConfidentialite onBack={handleBackToHome} />;
      default:         return <HomePage key={homeKey} onNavigate={handleNavigate} isAdmin={isAdmin} />;
    }
  };

  return (
    <I18nProvider>
      <ToastProvider addToast={addToast}>
        <AppLayout onNavigate={handleNavigate} currentPage={currentPage} userName={userName} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} trialExpired={trialExpired} isPro={isPro}>
          <Suspense fallback={<PageLoader />}>
            {renderContent()}
          </Suspense>
        </AppLayout>
        <Toast toasts={toasts} onRemove={removeToast} />
      </ToastProvider>
    </I18nProvider>
  );
}

export default App;
