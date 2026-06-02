import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Search, RefreshCw, Activity, Database, Users, BarChart2, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  matches_count?: number;
  events_count?: number;
  last_match?: string;
}

interface UsageStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  totalEvents: number;
  matchesThisMonth: number;
  usersThisMonth: number;
  supabaseRequestsEstimate: number;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<OUser[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'usage'>('users');

  useEffect(() => { checkAdminAndLoad(); }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: me } = await supabase.from('orion_users').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);
    await Promise.all([loadUsers(), loadUsage()]);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('orion_users').select('*').order('created_at', { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    const withStats = await Promise.all((data || []).map(async u => {
      const { count: mc } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'completed');
      const { data: lastMatch } = await supabase.from('matches').select('match_date').eq('user_id', u.id).eq('status', 'completed').order('match_date', { ascending: false }).limit(1).single();
      const { count: ec } = await supabase.from('match_events').select('match_id', { count: 'exact', head: true });
      return { ...u, matches_count: mc || 0, events_count: ec || 0, last_match: lastMatch?.match_date || null };
    }));
    setUsers(withStats);
    setLoading(false);
  };

  const loadUsage = async () => {
    setLoadingUsage(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalMatches },
      { count: matchesThisMonth },
      { count: usersThisMonth },
    ] = await Promise.all([
      supabase.from('orion_users').select('*', { count: 'exact', head: true }),
      supabase.from('orion_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', monthStart),
      supabase.from('orion_users').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

    const { count: totalEvents } = await supabase.from('match_events').select('*', { count: 'exact', head: true });

    // Estimation des requêtes Supabase (~50 par session, ~3 sessions/user/mois)
    const estimate = (totalUsers || 0) * 3 * 50;

    setUsage({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalMatches: totalMatches || 0,
      totalEvents: totalEvents || 0,
      matchesThisMonth: matchesThisMonth || 0,
      usersThisMonth: usersThisMonth || 0,
      supabaseRequestsEstimate: estimate,
    });
    setLoadingUsage(false);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('orion_users').update({ is_active: !current }).eq('id', userId);
    if (error) { setError(error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u));
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (userId === user?.id) { setError("Vous ne pouvez pas modifier votre propre rôle"); return; }
    const { error } = await supabase.from('orion_users').update({ is_admin: !current }).eq('id', userId);
    if (error) { setError(error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !current } : u));
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const LIMIT_FREE = 50000;
  const usagePercent = usage ? Math.min(100, Math.round((usage.supabaseRequestsEstimate / LIMIT_FREE) * 100)) : 0;
  const usageColor = usagePercent < 50 ? 'var(--orion-green)' : usagePercent < 80 ? 'var(--orion-amber)' : 'var(--orion-red)';

  if (!loading && !isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Shield size={36} style={{ color: 'var(--orion-red)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, color: 'var(--orion-text-dim)' }}>Accès réservé aux administrateurs</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={18} style={{ color: 'var(--orion-accent)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-text)' }}>Panneau Admin</span>
        </div>
        <button onClick={() => { loadUsers(); loadUsage(); }} className="o-btn o-btn--ghost o-btn--sm">
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {error && (
        <div onClick={() => setError('')} style={{ padding: '8px 14px', background: 'var(--orion-red-dim)', border: '1px solid var(--orion-red)', borderRadius: 4, fontSize: 12, color: 'var(--orion-red)', marginBottom: 14, cursor: 'pointer' }}>
          {error} ✕
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid var(--orion-line-strong)', marginBottom: 20 }}>
        {[
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'usage', label: "Utilisation & Limites", icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--orion-accent)' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--orion-text)' : 'var(--orion-text-mute)', marginBottom: -1.5 }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ONGLET UTILISATEURS */}
      {activeTab === 'users' && (
        <>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--orion-text-mute)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 4, color: 'var(--orion-text)', fontSize: 13, outline: 'none' }} />
          </div>

          <div className="o-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--orion-text-mute)', fontSize: 13 }}>Chargement…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'var(--orion-surface-2)', borderBottom: '1.5px solid var(--orion-line-strong)' }}>
                    {['Utilisateur', 'Inscription', 'Matchs', 'Dernier match', 'Statut', 'Rôle', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--orion-line)' : 'none', opacity: u.is_active ? 1 : 0.45 }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--orion-accent-dim)', border: '1.5px solid var(--orion-accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--orion-accent)', flexShrink: 0 }}>
                            {(u.first_name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orion-text)' }}>
                              {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: u.matches_count ? 'var(--orion-accent)' : 'var(--orion-text-faint)', fontFamily: 'var(--orion-font-mono)' }}>{u.matches_count}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', whiteSpace: 'nowrap' }}>
                        {u.last_match ? new Date(u.last_match).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 3, fontSize: 11, fontWeight: 700, fontFamily: 'var(--orion-font-mono)', background: u.is_active ? 'var(--orion-green-dim)' : 'var(--orion-red-dim)', color: u.is_active ? 'var(--orion-green)' : 'var(--orion-red)', border: `1px solid ${u.is_active ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}`, whiteSpace: 'nowrap' }}>
                          {u.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {u.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 3, fontSize: 11, fontWeight: 700, fontFamily: 'var(--orion-font-mono)', background: u.is_admin ? 'var(--orion-accent-dim)' : 'var(--orion-surface-3)', color: u.is_admin ? 'var(--orion-accent)' : 'var(--orion-text-mute)', border: `1px solid ${u.is_admin ? 'var(--orion-accent-line)' : 'var(--orion-line)'}`, whiteSpace: 'nowrap' }}>
                          {u.is_admin ? <><Shield size={10} /> Admin</> : 'Utilisateur'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => toggleActive(u.id, u.is_active)} className="o-btn o-btn--sm"
                            style={{ fontSize: 11, whiteSpace: 'nowrap', borderColor: u.is_active ? 'rgba(231,76,60,0.4)' : 'rgba(46,204,113,0.4)', color: u.is_active ? 'var(--orion-red)' : 'var(--orion-green)' }}>
                            {u.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {u.is_admin ? '− Admin' : '+ Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ONGLET UTILISATION */}
      {activeTab === 'usage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loadingUsage ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--orion-text-mute)', fontSize: 13 }}>Chargement…</div>
          ) : usage && (
            <>
              {/* Jauge Supabase */}
              <div className="o-card">
                <div className="o-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database size={15} style={{ color: 'var(--orion-accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Supabase — Plan gratuit</span>
                  </div>
                  <span style={{ fontSize: 11, color: usageColor, fontWeight: 700, fontFamily: 'var(--orion-font-mono)' }}>{usagePercent}% utilisé</span>
                </div>
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Requêtes API estimées / mois', value: usage.supabaseRequestsEstimate.toLocaleString('fr-FR'), limit: '50 000', percent: usagePercent, color: usageColor },
                    { label: 'Utilisateurs authentifiés', value: usage.totalUsers.toLocaleString('fr-FR'), limit: '50 000', percent: Math.round((usage.totalUsers / 50000) * 100), color: 'var(--orion-accent)' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--orion-text-dim)' }}>{item.label}</span>
                        <span style={{ fontFamily: 'var(--orion-font-mono)', color: 'var(--orion-text-mute)' }}>
                          <strong style={{ color: item.color }}>{item.value}</strong> / {item.limit}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--orion-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, item.percent)}%`, background: item.color, borderRadius: 4, transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 12px', background: 'var(--orion-surface-2)', borderRadius: 4, fontSize: 11, color: 'var(--orion-text-mute)', borderLeft: `3px solid ${usageColor}` }}>
                    {usagePercent < 50
                      ? '✅ Utilisation normale — aucune action requise'
                      : usagePercent < 80
                      ? '⚠️ Approche de la limite — surveiller l\'évolution'
                      : '🔴 Proche de la limite — envisager Supabase Pro (~25$/mois)'}
                  </div>
                </div>
              </div>

              {/* Stats globales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {[
                  { icon: Users,     label: 'Utilisateurs',         value: usage.totalUsers,        sub: `+${usage.usersThisMonth} ce mois`,  color: 'var(--orion-accent)' },
                  { icon: CheckCircle, label: 'Comptes actifs',     value: usage.activeUsers,       sub: `${Math.round(usage.activeUsers/Math.max(usage.totalUsers,1)*100)}% du total`, color: 'var(--orion-green)' },
                  { icon: BarChart2,  label: 'Matchs codés',        value: usage.totalMatches,      sub: `+${usage.matchesThisMonth} ce mois`, color: 'var(--orion-amber)' },
                  { icon: Activity,   label: 'Actions enregistrées', value: usage.totalEvents,      sub: 'total base de données',              color: 'var(--orion-text-dim)' },
                ].map((k, i) => {
                  const Icon = k.icon;
                  return (
                    <div key={i} style={{ background: 'var(--orion-surface)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 6, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Icon size={14} style={{ color: k.color }} />
                        <span style={{ fontSize: 10, fontFamily: 'var(--orion-font-mono)', fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</span>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1, fontFamily: 'var(--orion-font-mono)' }}>{k.value.toLocaleString('fr-FR')}</div>
                      <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', marginTop: 4 }}>{k.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Top utilisateurs */}
              <div className="o-card">
                <div className="o-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={15} style={{ color: 'var(--orion-accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Top utilisateurs</span>
                  </div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {[...users].sort((a, b) => (b.matches_count || 0) - (a.matches_count || 0)).slice(0, 5).map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < 4 ? '1px solid var(--orion-line)' : 'none' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orion-text-faint)', fontFamily: 'var(--orion-font-mono)', width: 20, textAlign: 'center' }}>#{i + 1}</span>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--orion-accent-dim)', border: '1px solid var(--orion-accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--orion-accent)', flexShrink: 0 }}>
                        {(u.first_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orion-text)' }}>{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)' }}>{u.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orion-accent)', fontFamily: 'var(--orion-font-mono)' }}>{u.matches_count}</div>
                        <div style={{ fontSize: 10, color: 'var(--orion-text-mute)' }}>matchs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dernière màj */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--orion-text-faint)', justifyContent: 'flex-end' }}>
                <Clock size={11} />
                Dernière actualisation : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
