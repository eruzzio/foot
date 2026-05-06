import { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { exportToPdf } from '../utils/exportPdf';

interface PdfConfigModalProps {
  events: MatchEventWithDetails[];
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  matchDate?: string;
  scoreA?: number;
  scoreB?: number;
  duration?: number;
  location?: string;
  competition?: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'score', label: 'Résumé du score', desc: 'Score, date, compétition, lieu' },
  { id: 'kpi', label: 'KPIs actions', desc: 'Nombre d\'actions par équipe' },
  { id: 'xg', label: 'Expected Goals (xG)', desc: 'Barre comparative xG + tirs' },
  { id: 'heatmap_field', label: 'Heatmap terrain', desc: 'Positions des actions sur le terrain' },
  { id: 'heatmap_zones', label: 'Heatmap zones', desc: 'Répartition Défensif / Médian / Offensif' },
  { id: 'heatmap_goal', label: 'Heatmap but', desc: 'Position des tirs dans la cage' },
  { id: 'stats_types', label: 'Stats par type d\'action', desc: 'Tableau comparatif par type' },
  { id: 'timeline', label: 'Timeline', desc: 'Chronologie condensée par période' },
];

export default function PdfConfigModal({
  events, teamAName, teamBName, teamAColor, teamBColor,
  matchDate, scoreA, scoreB, duration, location, competition,
  teamALogoUrl, teamBLogoUrl, onClose
}: PdfConfigModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | 'both'>('both');
  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );
  const [generating, setGenerating] = useState(false);

  const toggleSection = (id: string) => {
    setSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (val: boolean) => {
    setSections(Object.fromEntries(SECTIONS.map(s => [s.id, val])));
  };

  const handleExport = () => {
    setGenerating(true);

    // Filtrer les événements selon l'équipe sélectionnée
    const filteredEvents = selectedTeam === 'both'
      ? events
      : events.filter(e => e.team === selectedTeam);

    const teamName = selectedTeam === 'A' ? teamAName : selectedTeam === 'B' ? teamBName : `${teamAName} vs ${teamBName}`;

    exportToPdf({
      events: filteredEvents,
      matchInfo: {
        teamA: selectedTeam === 'B' ? teamBName : teamAName,
        teamB: selectedTeam === 'B' ? '' : teamBName,
        teamAColor: selectedTeam === 'B' ? (teamBColor || '#f97316') : (teamAColor || '#22c55e'),
        teamBColor: teamBColor || '#f97316',
        date: matchDate || new Date().toLocaleDateString('fr-FR'),
        scoreA, scoreB, duration, location, competition,
        teamALogoUrl, teamBLogoUrl,
      },
      sections,
      teamFilter: selectedTeam,
    });

    setTimeout(() => { setGenerating(false); onClose(); }, 500);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.75)', backdropFilter:'blur(6px)', display:'grid', placeItems:'center', zIndex:100 }}>
      <div style={{ width:'min(520px, 92vw)', background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', display:'flex', flexDirection:'column', maxHeight:'90vh' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--orion-line)' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--orion-text)' }}>Configurer le rapport PDF</div>
            <div className="o-eyebrow" style={{ marginTop:4 }}>{selectedCount} section{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} className="o-btn o-btn--ghost o-btn--sm" style={{ padding:'4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'22px' }}>

          {/* Choix équipe */}
          <div style={{ marginBottom:24 }}>
            <div className="o-eyebrow" style={{ marginBottom:10 }}>Équipe à analyser</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
              {[
                { id: 'A', label: teamAName },
                { id: 'B', label: teamBName },
                { id: 'both', label: 'Les deux' },
              ].map(t => (
                <button key={t.id} onClick={() => setSelectedTeam(t.id as any)}
                  className="o-btn o-btn--sm"
                  style={{
                    justifyContent:'center', fontSize:11,
                    ...(selectedTeam === t.id ? { borderColor:'var(--orion-accent)', color:'var(--orion-accent)', background:'var(--orion-accent-dim)' } : {})
                  }}>
                  {selectedTeam === t.id && <Check size={11} />}
                  {t.label}
                </button>
              ))}
            </div>
            {selectedTeam !== 'both' && (
              <div style={{ marginTop:8, padding:'8px 12px', background:'var(--orion-accent-dim)', borderLeft:'2px solid var(--orion-accent)' }}>
                <span style={{ fontSize:11, color:'var(--orion-accent)' }}>
                  Seules les actions de <strong>{selectedTeam === 'A' ? teamAName : teamBName}</strong> seront incluses dans le rapport
                </span>
              </div>
            )}
          </div>

          {/* Sections */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div className="o-eyebrow">Sections à inclure</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => toggleAll(true)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>Tout</button>
                <button onClick={() => toggleAll(false)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>Aucun</button>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => toggleSection(s.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: sections[s.id] ? 'var(--orion-surface-2)' : 'transparent', border:'1px solid', borderColor: sections[s.id] ? 'var(--orion-line-strong)' : 'var(--orion-line)', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                  <div style={{ width:18, height:18, border:`1px solid ${sections[s.id] ? 'var(--orion-accent)' : 'var(--orion-line-strong)'}`, background: sections[s.id] ? 'var(--orion-accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                    {sections[s.id] && <Check size={11} style={{ color:'var(--orion-accent-ink)' }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color: sections[s.id] ? 'var(--orion-text)' : 'var(--orion-text-mute)' }}>{s.label}</div>
                    <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 22px', borderTop:'1px solid var(--orion-line)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} className="o-btn o-btn--ghost">Annuler</button>
          <button onClick={handleExport} disabled={generating || selectedCount === 0} className="o-btn o-btn--primary"
            style={{ opacity: selectedCount === 0 ? 0.4 : 1 }}>
            <FileText size={14} />
            {generating ? 'Génération...' : 'Générer le PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
