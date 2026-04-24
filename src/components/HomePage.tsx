import { useState, useEffect } from 'react';
import { BarChart3, Users, Video, LayoutGrid, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
import OrionLogo from './OrionLogo';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [hasCompletedMatches, setHasCompletedMatches] = useState(false);

  useEffect(() => {
    initializeUserData();
  }, []);

  const initializeUserData = async () => {
    await checkCompletedMatches();
    await ensureDefaultPanel();
  };

  const ensureDefaultPanel = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await createDefaultFootballPanel(userData.user.id);
    }
  };

  const checkCompletedMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setHasCompletedMatches(true);
    }
  };

  const menuItems = [
    {
      id: 'live',
      title: 'Codage Live',
      description: 'Codez les actions en temps réel pendant le match',
      icon: Video,
      available: true,
      badge: null,
    },
    {
      id: 'panels',
      title: 'Mon Panneau',
      description: 'Configurez vos boutons de codage personnalisés',
      icon: LayoutGrid,
      available: true,
      badge: null,
    },
    {
      id: 'stats',
      title: 'Mes Stats',
      description: 'Consultez vos analyses et statistiques de match',
      icon: BarChart3,
      available: hasCompletedMatches,
      badge: hasCompletedMatches ? null : 'Bientôt',
    },
    {
      id: 'evolution',
      title: 'Évolution',
      description: 'Suivez votre progression sur plusieurs matchs',
      icon: TrendingUp,
      available: hasCompletedMatches,
      badge: hasCompletedMatches ? null : 'Bientôt',
    },
    {
      id: 'team',
      title: 'Mes Équipes',
      description: 'Gérez vos équipes et vos joueurs',
      icon: Users,
      available: true,
      badge: null,
    },
  ];

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0c0e14 0%, #0d1120 40%, #0c1028 70%, #0c0e14 100%)' }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #2f8de4 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(ellipse, #2f8de4 0%, transparent 70%)' }}
        />
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2f8de4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Scattered stars */}
        {[
          { top: '12%', left: '8%', size: 3, opacity: 0.5 },
          { top: '25%', right: '10%', size: 2, opacity: 0.4 },
          { top: '60%', left: '5%', size: 2, opacity: 0.3 },
          { top: '75%', right: '15%', size: 3, opacity: 0.5 },
          { top: '40%', right: '5%', size: 2, opacity: 0.35 },
          { top: '85%', left: '20%', size: 2, opacity: 0.3 },
        ].map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: star.top,
              left: (star as any).left,
              right: (star as any).right,
              width: star.size,
              height: star.size,
              background: '#5aaff7',
              opacity: star.opacity,
              boxShadow: `0 0 ${star.size * 2}px rgba(90, 175, 247, 0.8)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex flex-col items-center mb-16 pt-4">
          <div className="relative mb-6">
            <OrionLogo
              size={128}
              className="drop-shadow-2xl"
            />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <h1
              className="text-5xl font-black tracking-widest text-white uppercase"
              style={{ letterSpacing: '0.25em', textShadow: '0 0 30px rgba(47,141,228,0.4)' }}
            >
              ORION
            </h1>
          </div>
          <p className="text-sm font-medium tracking-[0.3em] uppercase"
            style={{ color: '#5aaff7', letterSpacing: '0.3em' }}>
            Sports Video Analytics &amp; Coding
          </p>
          <div className="mt-5 flex items-center gap-2 px-4 py-1.5 rounded-full border"
            style={{ borderColor: 'rgba(47,141,228,0.3)', background: 'rgba(47,141,228,0.06)' }}>
            <Star size={12} style={{ color: '#5aaff7' }} />
            <span className="text-xs font-medium" style={{ color: '#5aaff7' }}>Analysed Solution</span>
            <Star size={12} style={{ color: '#5aaff7' }} />
          </div>
        </header>

        {/* Menu grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => item.available && onNavigate(item.id)}
                disabled={!item.available}
                className={`group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
                  item.available
                    ? 'cursor-pointer hover:scale-[1.03] hover:-translate-y-1'
                    : 'cursor-not-allowed opacity-50'
                }`}
                style={{
                  background: 'linear-gradient(145deg, #161a27 0%, #1a1e2e 100%)',
                  borderColor: 'rgba(47,141,228,0.15)',
                }}
              >
                {/* Hover glow overlay */}
                {item.available && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(145deg, rgba(47,141,228,0.08) 0%, rgba(47,141,228,0.03) 100%)',
                      boxShadow: 'inset 0 0 0 1px rgba(47,141,228,0.3)',
                      borderRadius: '1rem',
                    }}
                  />
                )}

                <div className="p-7">
                  {/* Icon container */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, rgba(47,141,228,0.15) 0%, rgba(47,141,228,0.08) 100%)',
                      border: '1px solid rgba(47,141,228,0.25)',
                      boxShadow: item.available ? '0 0 20px rgba(47,141,228,0.1)' : 'none',
                    }}
                  >
                    <Icon
                      size={26}
                      style={{ color: item.available ? '#5aaff7' : '#6b7280' }}
                    />
                  </div>

                  {/* Title + badge */}
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold text-white leading-tight">{item.title}</h2>
                    {item.badge && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(47,141,228,0.12)', color: '#5aaff7', border: '1px solid rgba(47,141,228,0.2)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed mb-5" style={{ color: '#7a8499' }}>
                    {item.description}
                  </p>

                  {/* CTA */}
                  {item.available && (
                    <div className="flex items-center gap-1 text-xs font-semibold transition-all duration-200 group-hover:gap-2"
                      style={{ color: '#2f8de4' }}>
                      <span>Accéder</span>
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>

                {/* Bottom border accent */}
                {item.available && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(90deg, transparent, #2f8de4, transparent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(90,175,247,0.35)' }}>
            Orion &mdash; Version 1.0 &mdash; Sports Video Analytics &amp; Coding
          </p>
        </div>
      </div>
    </div>
  );
}
