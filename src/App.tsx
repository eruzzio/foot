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
import { I18nProvider } from './i18n/I18nContext';

type PageType = 'home' | 'live' | 'stats' | 'team' | 'panels' | 'evolution' | 'profile';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [initialMatchId, setInitialMatchId] = useState<string | null>(null);
  const [homeKey, setHomeKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleNavigate = (page: string) => {
    // Format stats-{matchId} — ouvrir directement un match
    if (page.startsWith('stats-')) {
      const matchId = page.replace('stats-', '');
      setInitialMatchId(matchId);
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

  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:'100vh', background:'#111118', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#4a4a58', fontSize:13 }}>Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={checkAuth} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':     return <HomePage key={homeKey} onNavigate={handleNavigate} />;
      case 'live':     return <CodingInterface onBack={handleBackToHome} />;
      case 'stats':    return <MyStats onBack={handleBackToHome} initialMatchId={initialMatchId} />;
      case 'team':     return <MyTeam onBack={handleBackToHome} />;
      case 'panels':   return <PanelsManager onBack={handleBackToHome} />;
      case 'evolution':return <EvolutionDashboard onBack={handleBackToHome} />;
      case 'profile':  return <ProfilePage onBack={handleBackToHome} />;
      default:         return <HomePage key={homeKey} onNavigate={handleNavigate} />;
    }
  };

  return <I18nProvider>{renderPage()}</I18nProvider>;
}

export default App;
