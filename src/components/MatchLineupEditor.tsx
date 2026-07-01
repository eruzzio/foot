import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { Check } from 'lucide-react';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
}

interface MatchLineupEditorProps {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string;
  teamBName: string;
}

export default function MatchLineupEditor({ matchId, teamAId, teamBId, teamAName, teamBName }: MatchLineupEditorProps) {
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToastContext();
  const [saved, setSaved] = useState(false);

  const teamId = selectedTeam === 'A' ? teamAId : teamBId;

  useEffect(() => {
    if (teamId) loadPlayers(teamId);
  }, [teamId, matchId]);

  const loadPlayers = async (tid: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [playersRes, lineupRes] = await Promise.all([
      supabase.from('players').select('*').eq('team_id', tid).eq('user_id', user.id).order('number'),
      supabase.from('match_players').select('player_id').eq('match_id', matchId).eq('team_id', tid).eq('user_id', user.id),
    ]);

    setPlayers(playersRes.data ?? []);
    setSelectedPlayerIds(new Set((lineupRes.data ?? []).map(r => r.player_id)));
    setLoading(false);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!teamId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Supprimer les joueurs décochés, insérer les nouveaux
    await supabase.from('match_players').delete().eq('match_id', matchId).eq('team_id', teamId).eq('user_id', user.id);

    if (selectedPlayerIds.size > 0) {
      const rows = Array.from(selectedPlayerIds).map(pid => ({
        match_id: matchId,
        player_id: pid,
        team_id: teamId,
        user_id: user.id,
      }));
      await supabase.from('match_players').insert(rows);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    addToast('Composition enregistrée ✓', 'success');
  };

  const teams = [
    { key: 'A' as const, name: teamAName, id: teamAId },
    { key: 'B' as const, name: teamBName, id: teamBId },
  ].filter(t => t.id);

  // Couleur du cercle selon la position du joueur
  const positionColor = (pos?: string | null) => {
    if (!pos) return 'var(--orion-text-mute)';
    const p = pos.toUpperCase();
    if (p.includes('GK') || p.includes('G')) return '#E6A817';
    if (p.includes('D') || p.includes('CB') || p.includes('LB') || p.includes('RB')) return 'var(--orion-accent)';
    if (p.includes('M') || p.includes('MF')) return 'var(--orion-green)';
    return 'var(--orion-red)';
  };

  return (
    <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:10, padding:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--orion-text)' }}>Compositions</h3>
        <div style={{ display:'flex', gap:2, background:'var(--orion-surface-2)', borderRadius:6, padding:2 }}>
          {teams.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedTeam(t.key)}
              style={{
                padding:'5px 12px', fontSize:11, fontWeight:600, border:'none', borderRadius:5, cursor:'pointer',
                background: selectedTeam === t.key ? 'var(--orion-accent)' : 'transparent',
                color: selectedTeam === t.key ? '#fff' : 'var(--orion-text-mute)',
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {!teamId ? (
        <div style={{ fontSize:13, color:'var(--orion-text-mute)', padding:12 }}>Aucune équipe liée à ce match.</div>
      ) : loading ? (
        <div style={{ fontSize:13, color:'var(--orion-text-mute)', padding:12 }}>Chargement…</div>
      ) : players.length === 0 ? (
        <div style={{ fontSize:13, color:'var(--orion-text-mute)', padding:12 }}>Aucun joueur dans cette équipe — ajoutez des joueurs dans Mes Équipes.</div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:2, marginBottom:16 }}>
            {players.map(player => {
              const selected = selectedPlayerIds.has(player.id);
              const circleColor = positionColor(player.position);
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'6px 8px', borderRadius:6,
                    border: selected ? '1.5px solid var(--orion-accent)' : '1.5px solid transparent',
                    background: selected ? 'rgba(61,128,224,0.06)' : 'transparent',
                    cursor:'pointer', textAlign:'left', transition:'all 0.12s',
                  }}
                >
                  <span style={{
                    fontFamily:'var(--orion-font-mono)', fontSize:11, fontWeight:700, color:'#fff',
                    background: selected ? circleColor : 'var(--orion-surface-3)',
                    width:24, height:24, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    transition:'background 0.12s',
                  }}>
                    {player.number ?? '?'}
                  </span>
                  <span style={{ flex:1, fontSize:13, color: selected ? 'var(--orion-text)' : 'var(--orion-text-dim)', fontWeight: selected ? 600 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {player.first_name} {player.last_name}
                  </span>
                  {player.position && (
                    <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, color: selected ? circleColor : 'var(--orion-text-mute)', flexShrink:0 }}>
                      {player.position}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:12, borderTop:'1px solid var(--orion-line)' }}>
            <button onClick={handleSave} disabled={saving} className="o-btn o-btn--primary o-btn--sm">
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            {saved && <span style={{ fontSize:12, color:'var(--orion-green)' }}>✓ Composition sauvegardée</span>}
            <span style={{ fontSize:12, color:'var(--orion-text-mute)', marginLeft:'auto' }}>{selectedPlayerIds.size} joueur{selectedPlayerIds.size > 1 ? 's' : ''} sélectionné{selectedPlayerIds.size > 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}
