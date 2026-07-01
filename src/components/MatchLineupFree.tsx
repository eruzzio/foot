import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, Check } from 'lucide-react';

interface LineupPlayer {
  number: string;
  name: string;
  position: string;
}

interface Props {
  matchId: string;
  teamAName: string;
  teamBName: string;
}

const POSITIONS = ['GK','DD','DC','DG','MDC','MC','MOC','MG','MD','AG','AD','BU'];

const emptyPlayer = (): LineupPlayer => ({ number:'', name:'', position:'MC' });

export default function MatchLineupFree({ matchId, teamAName, teamBName }: Props) {
  const [tab, setTab] = useState<'A'|'B'>('A');
  const [lineupA, setLineupA] = useState<LineupPlayer[]>([]);
  const [lineupB, setLineupB] = useState<LineupPlayer[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [matchId]);

  const load = async () => {
    const { data } = await supabase
      .from('matches')
      .select('lineup_a_json, lineup_b_json')
      .eq('id', matchId)
      .single();
    if (data) {
      setLineupA(data.lineup_a_json ? JSON.parse(data.lineup_a_json) : []);
      setLineupB(data.lineup_b_json ? JSON.parse(data.lineup_b_json) : []);
    }
    setLoading(false);
  };

  const lineup = tab === 'A' ? lineupA : lineupB;
  const setLineup = tab === 'A' ? setLineupA : setLineupB;

  const update = (i: number, field: keyof LineupPlayer, val: string) => {
    setLineup(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const remove = (i: number) => setLineup(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    await supabase.from('matches').update({
      lineup_a_json: JSON.stringify(lineupA),
      lineup_b_json: JSON.stringify(lineupB),
    }).eq('id', matchId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const posColor = (pos: string) => {
    if (['GK'].includes(pos)) return '#E6A817';
    if (['DD','DC','DG'].includes(pos)) return 'var(--orion-accent)';
    if (['MDC','MC','MOC','MG','MD'].includes(pos)) return 'var(--orion-green)';
    return 'var(--orion-red)';
  };

  if (loading) return <div style={{ padding:20, color:'var(--orion-text-mute)', fontSize:13 }}>Chargement...</div>;

  return (
    <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:10, padding:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--orion-text)' }}>Compositions</h3>
        <div style={{ display:'flex', gap:2, background:'var(--orion-surface-2)', borderRadius:6, padding:2 }}>
          {(['A','B'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'5px 14px', fontSize:12, fontWeight:600, border:'none', borderRadius:5, cursor:'pointer',
              background: tab === t ? 'var(--orion-accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--orion-text-mute)',
            }}>
              {t === 'A' ? teamAName : teamBName}
            </button>
          ))}
        </div>
      </div>

      {/* Liste joueurs */}
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
        {lineup.length === 0 && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--orion-text-mute)', fontSize:13 }}>
            Aucun joueur — clique sur + pour ajouter
          </div>
        )}
        {lineup.map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--orion-surface-2)', borderRadius:8, border:'1.5px solid var(--orion-line)' }}>
            {/* Numéro */}
            <div style={{ width:32, height:32, borderRadius:'50%', background: posColor(p.position), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <input
                value={p.number}
                onChange={e => update(i, 'number', e.target.value)}
                placeholder="#"
                style={{ width:32, height:32, background:'none', border:'none', textAlign:'center', color:'#fff', fontSize:12, fontWeight:800, fontFamily:'var(--orion-font-mono)', outline:'none', cursor:'text' }}
              />
            </div>
            {/* Nom */}
            <input
              value={p.name}
              onChange={e => update(i, 'name', e.target.value)}
              placeholder="Nom du joueur"
              style={{ flex:1, padding:'6px 10px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:6, color:'var(--orion-text)', fontSize:13, outline:'none' }}
            />
            {/* Poste */}
            <select
              value={p.position}
              onChange={e => update(i, 'position', e.target.value)}
              style={{ padding:'6px 8px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:6, color:'var(--orion-text)', fontSize:12, fontFamily:'var(--orion-font-mono)', fontWeight:700, outline:'none', cursor:'pointer' }}
            >
              {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
            {/* Supprimer */}
            <button onClick={() => remove(i)} style={{ padding:6, borderRadius:6, border:'none', background:'none', cursor:'pointer', color:'var(--orion-text-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E03B2E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--orion-text-faint)')}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid var(--orion-line)' }}>
        <button onClick={() => setLineup(prev => [...prev, emptyPlayer()])}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text)', cursor:'pointer' }}>
          <Plus size={14} /> Ajouter un joueur
        </button>
        <button onClick={save} disabled={saving}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background: saved ? 'var(--orion-green)' : 'var(--orion-accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
          {saved ? <><Check size={14} /> Sauvegardé</> : <><Save size={14} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</>}
        </button>
      </div>
    </div>
  );
}
