import { useState, useEffect } from 'react';
import { BarChart3, Calendar, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCompletedMatches();
  }, []);

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
        <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }}>
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
    <div className="min-h-screen bg-dark p-4 text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center gap-4">
          <button
            onClick={onBack}
            className="o-btn o-btn--ghost o-btn--sm"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-medium text-orion-text">Mes Stats</h1>
            <p className="text-gray-400">Sélectionnez un match pour voir les statistiques</p>
          </div>
        </header>

        {matches.length === 0 ? (
          <div className="bg-dark-secondary border border-orion-line  shadow-2xl p-12 text-center">
            <BarChart3 size={80} className="text-orange-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">
              Aucun match terminé
            </h2>
            <p className="text-gray-400">
              Terminez un match pour voir vos statistiques ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.id}>
                <div
                  className="w-full bg-dark-secondary border border-orion-line  shadow-2xl p-6 hover:border-orion-accent/50 transition-all group flex items-center justify-between"
                >
                  <button
                    onClick={() => setSelectedMatchId(match.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-base font-medium text-orion-text mb-2 group-hover:text-orange-primary transition-colors">
                      {match.team_a_name} vs {match.team_b_name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Calendar size={16} />
                      {new Date(match.match_date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 ml-4">
                    <ChevronRight size={24} className="text-gray-600 group-hover:text-orange-primary transition-colors" />
                    <button
                      onClick={(e) => handleDeleteClick(match.id, e)}
                      className="p-2 hover:bg-red-900/30  transition-colors text-gray-400 hover:text-red-400"
                      title="Supprimer ce rapport"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                {deleteConfirmId === match.id && (
                  <div className="mt-2 bg-red-900/20 border border-red-700/50  p-4 flex items-center justify-between">
                    <p className="text-red-300 text-sm">Êtes-vous sûr ? Cette action est irréversible.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => deleteMatch(match.id)}
                        disabled={isDeleting}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
