import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  };

  const teams = [
    { key: 'A' as const, name: teamAName, id: teamAId },
    { key: 'B' as const, name: teamBName, id: teamBId },
  ].filter(t => t.id);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Sélecteur équipe */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {teams.map(t => (
          <button
            key={t.key}
            onClick={() => setSelectedTeam(t.key)}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: '1.5px solid',
              borderColor: selectedTeam === t.key ? 'var(--orion-accent)' : 'var(--orion-line)',
              background: selectedTeam === t.key ? 'var(--orion-accent)' : 'var(--orion-surface)',
              color: selectedTeam === t.key ? '#fff' : 'var(--orion-text-mute)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {!teamId ? (
        <div style={{ fontSize: 13, color: 'var(--orion-text-mute)', padding: 12 }}>
          Aucune équipe liée à ce match.
        </div>
      ) : loading ? (
        <div style={{ fontSize: 13, color: 'var(--orion-text-mute)', padding: 12 }}>Chargement…</div>
      ) : players.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--orion-text-mute)', padding: 12 }}>
          Aucun joueur dans cette équipe — ajoutez des joueurs dans Mes Équipes.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 16 }}>
            {players.map(player => {
              const selected = selectedPlayerIds.has(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid',
                    borderColor: selected ? 'var(--orion-accent)' : 'var(--orion-line)',
                    background: selected ? 'rgba(249,115,22,0.08)' : 'var(--orion-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                  {player.photo_url ? (
                    <img src={player.photo_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: selected ? 'var(--orion-accent)' : 'var(--orion-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: selected ? '#fff' : 'var(--orion-text)', flexShrink: 0 }}>
                      {player.number}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--orion-accent)' : 'var(--orion-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {player.first_name} {player.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--orion-text-mute)' }}>{player.position || `#${player.number}`}</div>
                  </div>
                  {selected && <Check size={14} style={{ color: 'var(--orion-accent)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="o-btn o-btn--primary"
              style={{ minWidth: 120 }}
            >
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            {saved && <span style={{ fontSize: 12, color: 'var(--orion-green)' }}>✓ Composition sauvegardée</span>}
            <span style={{ fontSize: 12, color: 'var(--orion-text-mute)' }}>{selectedPlayerIds.size} joueur{selectedPlayerIds.size > 1 ? 's' : ''} sélectionné{selectedPlayerIds.size > 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}
