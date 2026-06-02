import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
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
}

export default function AdminPanel() {
  const [users, setUsers] = useState<OUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { checkAdminAndLoad(); }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: me } = await supabase.from('orion_users').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);
    await loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('orion_users').select('*').order('created_at', { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    const withStats = await Promise.all((data || []).map(async u => {
      const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'completed');
      return { ...u, matches_count: count || 0 };
    }));
    setUsers(withStats);
    setLoading(false);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('orion_users').update({ is_active: !current }).eq('id', userId);
    if (error) { setError(error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u));
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (userId === user?.id) { setError("Vous ne pouvez pas modifier votre propre rôle admin"); return; }
    const { error } = await supabase.from('orion_users').update({ is_admin: !current }).eq('id', userId);
    if (error) { setError(error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !current } : u));
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={18} style={{ color: 'var(--orion-accent)' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-text)' }}>Panneau Admin</span>
          <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', background: 'var(--orion-surface-2)', padding: '2px 8px', borderRadius: 10 }}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={loadUsers} className="o-btn o-btn--ghost o-btn--sm"><RefreshCw size={13} /> Actualiser</button>
      </div>

      {error && (
        <div onClick={() => setError('')} style={{ padding: '8px 14px', background: 'var(--orion-red-dim)', border: '1px solid var(--orion-red)', borderRadius: 4, fontSize: 12, color: 'var(--orion-red)', marginBottom: 14, cursor: 'pointer' }}>
          {error} ✕
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--orion-text-mute)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 4, color: 'var(--orion-text)', fontSize: 13, outline: 'none' }} />
      </div>

      <div className="o-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--orion-text-mute)', fontSize: 13 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--orion-text-mute)', fontSize: 13 }}>Aucun utilisateur trouvé</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--orion-surface-2)', borderBottom: '1.5px solid var(--orion-line-strong)' }}>
                {['Utilisateur', 'Inscription', 'Matchs', 'Statut', 'Rôle', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--orion-line)' : 'none', opacity: u.is_active ? 1 : 0.5 }}>
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
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--orion-text-mute)', fontFamily: 'var(--orion-font-mono)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: u.matches_count ? 'var(--orion-accent)' : 'var(--orion-text-faint)', fontFamily: 'var(--orion-font-mono)' }}>{u.matches_count}</span>
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      <button onClick={() => toggleActive(u.id, u.is_active)} className="o-btn o-btn--sm"
                        style={{ fontSize: 11, whiteSpace: 'nowrap', borderColor: u.is_active ? 'rgba(231,76,60,0.4)' : 'rgba(46,204,113,0.4)', color: u.is_active ? 'var(--orion-red)' : 'var(--orion-green)' }}>
                        {u.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {u.is_admin ? '- Admin' : '+ Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && users.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0, marginTop: 12, background: 'var(--orion-surface)', border: '1.5px solid var(--orion-line-strong)', borderRadius: 6, overflow: 'hidden' }}>
          {[
            { label: 'Total utilisateurs', value: users.length },
            { label: 'Comptes actifs', value: users.filter(u => u.is_active).length },
            { label: 'Matchs codés', value: users.reduce((s, u) => s + (u.matches_count || 0), 0) },
          ].map((k, i) => (
            <div key={i} style={{ padding: '14px 16px', borderRight: i < 2 ? '1px solid var(--orion-line)' : 'none' }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--orion-font-mono)', fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orion-text)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
