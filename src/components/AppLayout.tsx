import { useState, useEffect } from 'react';
import { Menu, X, Radio, PanelLeft, BarChart2, TrendingUp, Users, User, Home, Shield, Zap } from 'lucide-react';
import { OrionLogo } from './orion/Orion';
import { supabase } from '../lib/supabase';

interface AppLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  currentPage?: string;
  userName?: string;
  isAdmin?: boolean;
  trialDaysLeft?: number;
  trialExpired?: boolean;
  isPro?: boolean;
}

const NAV_ITEMS = [
  { id: 'home',      label: 'Accueil',        icon: Home },
  { id: 'live',      label: 'Codage Live',     icon: Radio },
  { id: 'panels',    label: 'Mes Panneaux',    icon: PanelLeft },
  { id: 'stats',     label: 'Mes Stats',       icon: BarChart2 },
  { id: 'evolution', label: 'Évolution',       icon: TrendingUp },
  { id: 'team',      label: 'Mes Équipes',     icon: Users },
  { id: 'profile',   label: 'Mon Profil',      icon: User },
];

export default function AppLayout({ children, onNavigate, currentPage, userName, isAdmin = false, trialDaysLeft = 7, trialExpired = false, isPro = false }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid var(--orion-line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <OrionLogo height={15} />
          {isPro && (
            <span style={{ fontSize:9, fontWeight:800, color:'var(--orion-accent)', background:'var(--orion-accent-dim)', border:'1px solid var(--orion-accent-line)', padding:'2px 6px', borderRadius:3, fontFamily:'var(--orion-font-mono)', letterSpacing:'0.1em' }}>PRO</span>
          )}
        </div>
      </div>
      {userName && (
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--orion-line)' }}>
          <div style={{ fontSize:10, color:'var(--orion-text-mute)', fontFamily:'var(--orion-font-mono)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Connecté</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginTop:2 }}>{userName}</div>
        </div>
      )}
      <nav style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
        {[...NAV_ITEMS, ...(isAdmin ? [{ id: 'admin', label: 'Administration', icon: Shield }] : [])].map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button key={item.id}
              onClick={() => { onNavigate(item.id); onClose?.(); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'11px 16px', background: isActive ? 'var(--orion-surface-3)' : 'none',
                border:'none', borderLeft: isActive ? '3px solid var(--orion-accent)' : '3px solid transparent',
                cursor:'pointer', textAlign:'left', transition:'all .12s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--orion-surface-2)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
            >
              <Icon size={17} style={{ color: isActive ? 'var(--orion-accent)' : 'var(--orion-text-mute)', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--orion-text)' : 'var(--orion-text-dim)' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--orion-line)' }}>
        {!isPro && (
          <button onClick={() => { onNavigate('pricing'); onClose?.(); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(61,128,224,0.1)', border:'1px solid var(--orion-accent-line)', borderRadius:4, cursor:'pointer', marginBottom:8 }}>
            <Zap size={14} style={{ color:'var(--orion-accent)' }} />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--orion-accent)' }}>Passer en Pro — 8,99€/mois</span>
          </button>
        )}
        <div style={{ fontSize:10, color:'var(--orion-text-faint)', fontFamily:'var(--orion-font-mono)' }}>
          ORION · Sports Analytics
        </div>
      </div>
    </>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', display:'flex' }}>

      {/* SIDEBAR DESKTOP */}
      <aside className="orion-sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* DRAWER MOBILE */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.75)', zIndex:100, backdropFilter:'blur(4px)' }} />
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:260, background:'var(--orion-surface)', borderRight:'1.5px solid var(--orion-line-strong)', zIndex:101, display:'flex', flexDirection:'column', animation:'orionSlideIn .2s ease' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--orion-line)' }}>
              <OrionLogo height={14} />
              <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', display:'flex' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent onClose={() => setMenuOpen(false)} />
          </div>
        </>
      )}

      {/* CONTENU */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {/* TOPBAR MOBILE UNIQUEMENT */}
        <header className="orion-topbar-mobile">
          <button onClick={() => setMenuOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-dim)', display:'flex', padding:6 }}>
            <Menu size={22} />
          </button>
          <OrionLogo height={14} />
          <span style={{ flex:1 }} />
          <button onClick={() => onNavigate('profile')} className="o-avatar" style={{ cursor:'pointer', width:32, height:32 }}>
            {(userName || '?')[0].toUpperCase()}
          </button>
        </header>

        {/* Slot contenu */}
        <div style={{ flex:1 }}>
          {/* Bannière trial */}
          {!isPro && !trialExpired && trialDaysLeft <= 3 && (
            <div style={{ background:'rgba(61,128,224,0.1)', borderBottom:'1px solid var(--orion-accent-line)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--orion-accent)', fontWeight:600 }}>
                ⏳ Essai gratuit — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}
              </span>
              <button onClick={() => onNavigate('pricing')} className="o-btn o-btn--primary o-btn--sm" style={{ fontSize:11 }}>
                Passer en Pro — 8,99€/mois →
              </button>
            </div>
          )}
          {trialExpired && (
            <div style={{ background:'var(--orion-red-dim)', borderBottom:'1px solid var(--orion-red)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--orion-red)', fontWeight:700 }}>
                ⚠️ Essai expiré — accès limité
              </span>
              <button onClick={() => onNavigate('pricing')} className="o-btn o-btn--sm" style={{ borderColor:'var(--orion-red)', color:'var(--orion-red)', fontSize:11 }}>
                Voir les plans →
              </button>
            </div>
          )}
          {children}
        </div>
      </div>

      <style>{`
        @keyframes orionSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .orion-sidebar-desktop {
          width: 220px;
          flex-shrink: 0;
          background: var(--orion-surface);
          border-right: 1.5px solid var(--orion-line-strong);
          display: none;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        .orion-topbar-mobile {
          display: flex;
          align-items: center;
          height: 52px;
          padding: 0 16px;
          gap: 12px;
          background: var(--orion-surface);
          border-bottom: 1.5px solid var(--orion-line-strong);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        @media (min-width: 768px) {
          .orion-sidebar-desktop { display: flex !important; }
          .orion-topbar-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
