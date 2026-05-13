import { useState, useMemo } from 'react';
import { X, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';
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

const BASE_SECTIONS = [
  { id: 'score',      label: 'Résumé du score',         desc: 'Score, date, compétition' },
  { id: 'kpi',        label: 'KPIs actions',             desc: 'Nombre d\'actions par équipe' },
  { id: 'xg',         label: 'Expected Goals (xG)',      desc: 'Barre comparative xG + tirs' },
  { id: 'stats_types',label: 'Stats par type d\'action', desc: 'Tableau comparatif' },
  { id: 'timeline',   label: 'Timeline',                 desc: 'Chronologie par période' },
];

const HEATMAP_SECTIONS = [
  { id: 'heatmap_field', label: 'Heatmap terrain', desc: 'Positions sur le terrain' },
  { id: 'heatmap_zones', label: 'Heatmap zones',   desc: 'Répartition Déf / Méd / Off' },
  { id: 'heatmap_goal',  label: 'Heatmap but',     desc: 'Position des tirs en cage' },
];

export default function PdfConfigModal({
  events, teamAName, teamBName, teamAColor, teamBColor,
  matchDate, scoreA, scoreB, duration, location, competition,
  teamALogoUrl, teamBLogoUrl, onClose
}: PdfConfigModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | 'both'>('both');
  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries([...BASE_SECTIONS, ...HEATMAP_SECTIONS].map(s => [s.id, true]))
  );
  const [heatmapExpanded, setHeatmapExpanded] = useState<Record<string, boolean>>({});
  // Pour chaque heatmap : quels types d'actions inclure (null = tous)
  const [heatmapFilters, setHeatmapFilters] = useState<Record<string, Set<string>>>({
    heatmap_field: new Set(),
    heatmap_zones: new Set(),
    heatmap_goal:  new Set(),
  });
  const [generating, setGenerating] = useState(false);

  // Extraire tous les types d'actions disponibles
  const eventTypes = useMemo(() => {
    const map = new Map<string, string>(); // name -> color
    events.forEach(e => {
      const name = e.event_type?.name || e.label || 'Autre';
      const color = (e.event_type as any)?.color || '#6B7280';
      map.set(name, color);
    });
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [events]);

  const toggleSection = (id: string) =>
    setSections(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleAll = (val: boolean) =>
    setSections(Object.fromEntries([...BASE_SECTIONS, ...HEATMAP_SECTIONS].map(s => [s.id, val])));

  const toggleHeatmapType = (heatmapId: string, typeName: string) => {
    setHeatmapFilters(prev => {
      const set = new Set(prev[heatmapId]);
      if (set.has(typeName)) set.delete(typeName);
      else set.add(typeName);
      return { ...prev, [heatmapId]: set };
    });
  };

  const selectAllTypes = (heatmapId: string) =>
    setHeatmapFilters(prev => ({ ...prev, [heatmapId]: new Set() }));

  const handleExport = () => {
    setGenerating(true);
    const filteredEvents = selectedTeam === 'both'
      ? events : events.filter(e => e.team === selectedTeam);

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
      heatmapFilters: {
        field: heatmapFilters.heatmap_field.size > 0 ? Array.from(heatmapFilters.heatmap_field) : null,
        zones: heatmapFilters.heatmap_zones.size > 0 ? Array.from(heatmapFilters.heatmap_zones) : null,
        goal:  heatmapFilters.heatmap_goal.size > 0  ? Array.from(heatmapFilters.heatmap_goal)  : null,
      },
    });
    setTimeout(() => { setGenerating(false); onClose(); }, 500);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  const HeatmapRow = ({ s }: { s: { id: string; label: string; desc: string } }) => {
    const filter = heatmapFilters[s.id];
    const isExpanded = heatmapExpanded[s.id];
    const activeCount = filter.size;

    return (
      <div style={{ border:'1px solid', borderColor: sections[s.id] ? 'var(--orion-line-strong)' : 'var(--orion-line)' }}>
        {/* Ligne principale */}
        <button onClick={() => toggleSection(s.id)}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: sections[s.id] ? 'var(--orion-surface-2)' : 'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
          <div style={{ width:18, height:18, border:`1px solid ${sections[s.id] ? 'var(--orion-accent)' : 'var(--orion-line-strong)'}`, background: sections[s.id] ? 'var(--orion-accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {sections[s.id] && <Check size={11} style={{ color:'var(--orion-accent-ink)' }} />}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:500, color: sections[s.id] ? 'var(--orion-text)' : 'var(--orion-text-mute)' }}>{s.label}</div>
            <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:1 }}>
              {activeCount > 0 ? <span style={{ color:'var(--orion-accent)' }}>{activeCount} type{activeCount > 1 ? 's' : ''} sélectionné{activeCount > 1 ? 's' : ''}</span> : s.desc}
            </div>
          </div>
          {sections[s.id] && (
            <button onClick={e => { e.stopPropagation(); setHeatmapExpanded(p => ({ ...p, [s.id]: !p[s.id] })); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', padding:'0 4px' }}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </button>

        {/* Filtre types — expandable */}
        {sections[s.id] && isExpanded && (
          <div style={{ padding:'10px 14px 14px', borderTop:'1px solid var(--orion-line)', background:'var(--orion-bg)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span className="o-eyebrow">Filtrer par type d'action</span>
              <button onClick={() => selectAllTypes(s.id)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>
                Tous
              </button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {eventTypes.map(({ name, color }) => {
                const active = filter.has(name);
                return (
                  <button key={name} onClick={() => toggleHeatmapType(s.id, name)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', border:`1px solid ${active ? color : 'var(--orion-line)'}`, background: active ? color + '18' : 'transparent', cursor:'pointer', fontSize:11, color: active ? color : 'var(--orion-text-mute)', transition:'all .12s' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background: color, flexShrink:0 }} />
                    {name}
                    {active && <Check size={10} />}
                  </button>
                );
              })}
            </div>
            {filter.size === 0 && (
              <p style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:8 }}>
                Aucun filtre — toutes les actions seront affichées
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.75)', backdropFilter:'blur(6px)', display:'grid', placeItems:'center', zIndex:100 }}>
      <div style={{ width:'min(540px, 94vw)', background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', display:'flex', flexDirection:'column', maxHeight:'90vh' }}>

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

        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>

          {/* Équipe */}
          <div style={{ marginBottom:22 }}>
            <div className="o-eyebrow" style={{ marginBottom:10 }}>Équipe à analyser</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
              {[{ id:'A', label:teamAName }, { id:'B', label:teamBName }, { id:'both', label:'Les deux' }].map(t => (
                <button key={t.id} onClick={() => setSelectedTeam(t.id as any)}
                  className="o-btn o-btn--sm"
                  style={{ justifyContent:'center', fontSize:11, ...(selectedTeam === t.id ? { borderColor:'var(--orion-accent)', color:'var(--orion-accent)', background:'var(--orion-accent-dim)' } : {}) }}>
                  {selectedTeam === t.id && <Check size={11} />}
                  {t.label}
                </button>
              ))}
            </div>
            {selectedTeam !== 'both' && (
              <div style={{ marginTop:8, padding:'8px 12px', background:'var(--orion-accent-dim)', borderLeft:'2px solid var(--orion-accent)' }}>
                <span style={{ fontSize:11, color:'var(--orion-accent)' }}>
                  Uniquement les actions de <strong>{selectedTeam === 'A' ? teamAName : teamBName}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Sections de base */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div className="o-eyebrow">Sections générales</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => toggleAll(true)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>Tout sélectionner</button>
                <button onClick={() => toggleAll(false)} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>Tout décocher</button>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {BASE_SECTIONS.map(s => (
                <button key={s.id} onClick={() => toggleSection(s.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: sections[s.id] ? 'var(--orion-surface-2)' : 'transparent', border:'1px solid', borderColor: sections[s.id] ? 'var(--orion-line-strong)' : 'var(--orion-line)', cursor:'pointer', textAlign:'left', transition:'all .12s' }}>
                  <div style={{ width:18, height:18, border:`1px solid ${sections[s.id] ? 'var(--orion-accent)' : 'var(--orion-line-strong)'}`, background: sections[s.id] ? 'var(--orion-accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {sections[s.id] && <Check size={11} style={{ color:'var(--orion-accent-ink)' }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color: sections[s.id] ? 'var(--orion-text)' : 'var(--orion-text-mute)' }}>{s.label}</div>
                    <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:1 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Heatmaps avec filtre par type */}
          <div>
            <div className="o-eyebrow" style={{ marginBottom:8 }}>
              Heatmaps — <span style={{ color:'var(--orion-text-mute)', textTransform:'none', letterSpacing:'normal', fontSize:10 }}>cliquer sur ▼ pour filtrer par type d'action</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {HEATMAP_SECTIONS.map(s => <HeatmapRow key={s.id} s={s} />)}
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
