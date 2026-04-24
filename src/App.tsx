import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import CodingInterface from './components/CodingInterface';
import MyStats from './components/MyStats';
import MyTeam from './components/MyTeam';
import PanelsManager from './components/PanelsManager';
import EvolutionDashboard from './components/EvolutionDashboard';

type PageType = 'home' | 'live' | 'stats' | 'team' | 'panels' | 'evolution';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [homeKey, setHomeKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleBackToHome = () => {
    setHomeKey(prev => prev + 1);
    setCurrentPage('home');
  };

  const handleAuthSuccess = () => {
    checkAuth();
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage key={homeKey} onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'live':
        return <CodingInterface onBack={handleBackToHome} />;
      case 'stats':
        return <MyStats onBack={handleBackToHome} />;
      case 'team':
        return <MyTeam onBack={handleBackToHome} />;
      case 'panels':
        return <PanelsManager onBack={handleBackToHome} />;
      case 'evolution':
        return <EvolutionDashboard onBack={handleBackToHome} />;
      default:
        return <HomePage key={homeKey} onNavigate={(page) => setCurrentPage(page as PageType)} />;
    }
  };

  return <>{renderPage()}</>;
}

export default App;
