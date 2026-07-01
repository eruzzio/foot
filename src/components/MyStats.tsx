import { useState, useEffect } from 'react';
import { BarChart3, Calendar, ChevronRight, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { Match } from '../types/database';
import MatchReport from './MatchReport';

interface MyStatsProps {
  onBack: () => void;
  initialMatchId?: string | null;
}

export default function MyStats({ onBack, initialMatchId }: MyStatsProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(initialMatchId || null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { addToast } = useToastContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompletedMatches();
  }, []);

  const filteredMatches = matches.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.team_a_name?.toLowerCase().includes(q) ||
      m.team_b_name?.toLowerCase().includes(q) ||
      new Date(m.match_date).toLocaleDateString('fr-FR').includes(q)
    );
  });

  const loadCompletedMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('match_date', { ascending: false });

    if (matchesError) {
      console.error('Error loading matches:', matchesError);
      setLoading(false);
      return;
    }

    setMatches(matchesData || []);
    setLoading(false);
  };

  const deleteMatch = async (matchId: string) => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      console.error('Error deleting match:', error);
      setIsDeleting(false);
      return;
    }

    setMatches(matches.filter(m => m.id !== matchId));
    addToast('Match supprimé', 'success');
    setDeleteConfirmId(null);
    setIsDeleting(false);
  };

  const handleDeleteClick = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(matchId);
  };

  if (selectedMatchId) {
    return (
      <MatchReport
        matchId={selectedMatchId}
        onBack={() => setSelectedMatchId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--orion-bg)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, height:56, padding:'0 24px', borderBottom:'1px solid var(--orion-line)' }}>
          <div style={{ width:80, height:14, background:'var(--orion-surface-2)', borderRadius:3 }} />
        </div>
        <div style={{ maxWidth:800, margin:'0 auto', padding:'16px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid var(--orion-line)', opacity: 1 - i * 0.15 }}>
              <div style={{ width:44, height:44, background:'var(--orion-surface-2)', flexShrink:0 }} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ width:'55%', height:12, background:'var(--orion-surface-2)', borderRadius:2 }} />
                <div style={{ width:'30%', height:9, background:'var(--orion-surface-2)', borderRadius:2 }} />
              </div>
              <div style={{ width:50, height:12, background:'var(--orion-surface-2)', borderRadius:2 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', padding:16 }}>
      <div className="max-w-5xl mx-auto">

        {/* Hero sombre */}
        <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'24px 24px 20px', color:'#fff', marginBottom:20, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
          <div style={{ position:'absolute', top:0, right:0, width:320, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:8 }}>Analyse</div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#fff' }}>Mes Stats</h1>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'#8aa0bd' }}>Sélectionne un match pour ouvrir son rapport complet.</p>
            </div>
            <button onClick={onBack} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:999, fontSize:13, fontWeight:600, color:'#dbe3ee', cursor:'pointer', flexShrink:0 }}>
              ← Retour
            </button>
          </div>
        </div>

        {/* Search bar */}
        {matches.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--orion-text-mute)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par équipe ou date..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--orion-surface)', border: '1.5px solid var(--orion-line)', borderRadius: 8, color: 'var(--orion-text)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        )}

        {matches.length === 0 ? (
          <div className="bg-dark-secondary border border-orion-line  shadow-2xl p-12 text-center">
            <BarChart3 size={80} className="text-orange-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--orion-text)' }}>
              Aucun match terminé
            </h2>
            <p className="text-gray-400">
              Terminez un match pour voir vos statistiques ici.
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filteredMatches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--orion-text-mute)', fontSize: 13 }}>
                Aucun match ne correspond à "{searchQuery}"
              </div>
            )}
            {filteredMatches.map((match) => {
              const scoreA = match.team_a_score ?? 0;
              const scoreB = match.team_b_score ?? 0;
              const isWin = scoreA > scoreB;
              const isDraw = scoreA === scoreB;
              const resultColor = isWin ? '#1FA85A' : isDraw ? '#E8920C' : '#E03B2E';
              const resultLabel = isWin ? 'VICTOIRE' : isDraw ? 'NUL' : 'DÉFAITE';
              return (
              <div key={match.id}>
                <div
                  onClick={() => setSelectedMatchId(match.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:16,
                    background:'var(--orion-surface)',
                    border:'1.5px solid var(--orion-line)',
                    borderLeft:`4px solid ${resultColor}`,
                    borderRadius:10, padding:'14px 16px',
                    cursor:'pointer', transition:'all .15s',
                    position:'relative', overflow:'hidden',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orion-accent)')}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--orion-line)'; e.currentTarget.style.borderLeftColor = resultColor; }}
                >
                  {/* Score */}
                  <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:22, fontWeight:900, color:'var(--orion-text)', lineHeight:1, minWidth:52, textAlign:'center', letterSpacing:'-0.02em' }}>
                    {scoreA}–{scoreB}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {match.team_a_name} <span style={{ color:'var(--orion-text-mute)', fontWeight:400 }}>vs</span> {match.team_b_name}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--orion-text-mute)' }}>
                      <Calendar size={12} />
                      {new Date(match.match_date).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'long', year:'numeric' })}
                      {match.tag_competition && <span style={{ color:'var(--orion-text-faint)' }}>· {match.tag_competition}</span>}
                    </div>
                  </div>

                  {/* Badge résultat */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <span style={{ padding:'3px 9px', borderRadius:999, fontSize:9, fontWeight:800, letterSpacing:'0.06em', background:`${resultColor}18`, border:`1px solid ${resultColor}50`, color:resultColor }}>
                      {resultLabel}
                    </span>
                    <ChevronRight size={16} style={{ color:'var(--orion-text-faint)' }} />
                    <button
                      onClick={(e) => handleDeleteClick(match.id, e)}
                      style={{ padding:6, borderRadius:6, border:'none', background:'none', cursor:'pointer', color:'var(--orion-text-faint)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E03B2E')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--orion-text-faint)')}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {deleteConfirmId === match.id && (
                  <div style={{ marginTop:4, background:'rgba(224,59,46,0.08)', border:'1.5px solid rgba(224,59,46,0.3)', borderRadius:8, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <p style={{ fontSize:13, color:'#E03B2E' }}>Êtes-vous sûr ? Cette action est irréversible.</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setDeleteConfirmId(null)} style={{ padding:'5px 12px', fontSize:12, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface)', color:'var(--orion-text-dim)', cursor:'pointer' }}>Annuler</button>
                      <button onClick={() => deleteMatch(match.id)} disabled={isDeleting} style={{ padding:'5px 12px', fontSize:12, borderRadius:6, border:'none', background:'#E03B2E', color:'#fff', cursor:'pointer', opacity: isDeleting ? 0.5 : 1 }}>{isDeleting ? 'Suppression...' : 'Supprimer'}</button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
