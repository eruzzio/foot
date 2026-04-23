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

  useEffect(() => {
    // Pas d'auth nécessaire - mode test
  }, []);

  const handleBackToHome = () => {
    setHomeKey(prev => prev + 1);
    setCurrentPage('home');
  };

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
