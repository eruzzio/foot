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
  { id: 'score',       label: 'Résumé du score',          desc: 'Score, date, compétition' },
  { id: 'kpi',         label: 'KPIs actions',              desc: 'Nombre d\'actions par équipe' },
  { id: 'xg',          label: 'Expected Goals (xG)',       desc: 'Barre comparative xG + tirs' },
  { id: 'stats_types', label: 'Stats par type d\'action',  desc: 'Tableau comparatif' },
  { id: 'timeline',    label: 'Timeline',                  desc: 'Chronologie par période' },
];

const HEATMAP_SECTIONS = [
  { id: 'heatmap_field', label: 'Heatmap terrain', desc: 'Positions sur le terrain' },
  { id: 'heatmap_zones', label: 'Heatmap zones',   desc: 'Répartition Déf / Méd / Off' },
  { id: 'heatmap_goal',  label: 'Heatmap but',     desc: 'Position des tirs en cage' },
];

type TeamFilter = 'A' | 'B' | 'both';

export default function PdfConfigModal({
  events, teamAName, teamBName, teamAColor, teamBColor,
  matchDate, scoreA, scoreB, duration, location, competition,
  teamALogoUrl, teamBLogoUrl, onClose
}: PdfConfigModalProps) {
  // Équipe globale pour les sections générales
  const [globalTeam, setGlobalTeam] = useState<TeamFilter>('both');

  // Équipe indépendante par heatmap
  const [heatmapTeams, setHeatmapTeams] = useState<Record<string, TeamFilter>>({
    heatmap_field: 'both',
    heatmap_zones: 'both',
    heatmap_goal:  'both',
  });

  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries([...BASE_SECTIONS, ...HEATMAP_SECTIONS].map(s => [s.id, true]))
  );
  const [heatmapExpanded, setHeatmapExpanded] = useState<Record<string, boolean>>({});
  const [heatmapFilters, setHeatmapFilters] = useState<Record<string, Set<string>>>({
    heatmap_field: new Set(),
    heatmap_zones: new Set(),
    heatmap_goal:  new Set(),
  });
  const [generating, setGenerating] = useState(false);

  const eventTypes = useMemo(() => {
    const map = new Map<string, string>();
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
      if (set.has(typeName)) set.delete(typeName); else set.add(typeName);
      return { ...prev, [heatmapId]: set };
    });
  };

  const handleExport = () => {
    setGenerating(true);
    const globalEvents = globalTeam === 'both' ? events : events.filter(e => e.team === globalTeam);

    try {
      exportToPdf({
        events: globalEvents,
        matchInfo: {
          teamA: globalTeam === 'B' ? teamBName : teamAName,
          teamB: globalTeam === 'B' ? '' : teamBName,
          teamAColor: globalTeam === 'B' ? (teamBColor || '#f97316') : (teamAColor || '#22c55e'),
          teamBColor: teamBColor || '#f97316',
          date: matchDate || new Date().toLocaleDateString('fr-FR'),
          scoreA, scoreB, duration, location, competition,
          teamALogoUrl, teamBLogoUrl,
        },
        sections,
        teamFilter: globalTeam,
        heatmapFilters: {
          field: heatmapFilters.heatmap_field.size > 0 ? Array.from(heatmapFilters.heatmap_field) : null,
          zones: heatmapFilters.heatmap_zones.size > 0 ? Array.from(heatmapFilters.heatmap_zones) : null,
          goal:  heatmapFilters.heatmap_goal.size > 0  ? Array.from(heatmapFilters.heatmap_goal)  : null,
        },
        heatmapTeams,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Erreur génération PDF: ' + String(err));
    }
    setTimeout(() => { setGenerating(false); onClose(); }, 500);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  // Boutons équipe réutilisables
  const TeamPicker = ({ value, onChange }: { value: TeamFilter; onChange: (v: TeamFilter) => void }) => (
    <div style={{ display:'flex', gap:4 }}>
      {([{ id:'A', label: teamAName }, { id:'B', label: teamBName }, { id:'both', label:'Les 2' }] as const).map(t => (
        <button key={t.id} onClick={e => { e.stopPropagation(); onChange(t.id as TeamFilter); }}
          style={{ padding:'3px 8px', fontSize:10, fontWeight:600, border:`1.5px solid ${value === t.id ? 'var(--orion-accent)' : 'var(--orion-line)'}`, background: value === t.id ? 'var(--orion-accent-dim)' : 'transparent', color: value === t.id ? 'var(--orion-accent)' : 'var(--orion-text-mute)', borderRadius:3, cursor:'pointer', whiteSpace:'nowrap' }}>
          {value === t.id && '✓ '}{t.label}
        </button>
      ))}
    </div>
  );

  const HeatmapRow = ({ s }: { s: typeof HEATMAP_SECTIONS[0] }) => {
    const filter = heatmapFilters[s.id];
    const isExpanded = heatmapExpanded[s.id];
    const activeCount = filter.size;
    const team = heatmapTeams[s.id];

    return (
      <div style={{ border:`1px solid ${sections[s.id] ? 'var(--orion-line-strong)' : 'var(--orion-line)'}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: sections[s.id] ? 'var(--orion-surface-2)' : 'transparent' }}>
          {/* Checkbox */}
          <button onClick={() => toggleSection(s.id)}
            style={{ width:18, height:18, border:`1px solid ${sections[s.id] ? 'var(--orion-accent)' : 'var(--orion-line-strong)'}`, background: sections[s.id] ? 'var(--orion-accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
            {sections[s.id] && <Check size={11} style={{ color:'var(--orion-accent-ink)' }} />}
          </button>

          {/* Label */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:500, color: sections[s.id] ? 'var(--orion-text)' : 'var(--orion-text-mute)' }}>{s.label}</div>
            <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:1 }}>
              {activeCount > 0 ? <span style={{ color:'var(--orion-accent)' }}>{activeCount} type{activeCount > 1 ? 's' : ''} filtré{activeCount > 1 ? 's' : ''}</span> : s.desc}
            </div>
          </div>

          {/* Sélecteur équipe indépendant */}
          {sections[s.id] && (
            <TeamPicker value={team} onChange={v => setHeatmapTeams(prev => ({ ...prev, [s.id]: v }))} />
          )}

          {/* Expand types */}
          {sections[s.id] && (
            <button onClick={e => { e.stopPropagation(); setHeatmapExpanded(p => ({ ...p, [s.id]: !p[s.id] })); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', padding:'0 2px', flexShrink:0 }}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Filtre types */}
        {sections[s.id] && isExpanded && (
          <div style={{ padding:'10px 14px 14px', borderTop:'1px solid var(--orion-line)', background:'var(--orion-bg)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span className="o-eyebrow">Filtrer par type d'action</span>
              <button onClick={() => setHeatmapFilters(p => ({ ...p, [s.id]: new Set() }))} className="o-btn o-btn--ghost o-btn--sm" style={{ fontSize:10 }}>Tous</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {eventTypes.map(({ name, color }) => {
                const active = filter.has(name);
                return (
                  <button key={name} onClick={() => toggleHeatmapType(s.id, name)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', border:`1px solid ${active ? color : 'var(--orion-line)'}`, background: active ? color + '18' : 'transparent', cursor:'pointer', fontSize:11, color: active ? color : 'var(--orion-text-mute)', borderRadius:3 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
                    {name}
                    {active && <Check size={10} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.75)', backdropFilter:'blur(6px)', display:'grid', placeItems:'center', zIndex:100 }}>
      <div style={{ width:'min(560px, 94vw)', background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', display:'flex', flexDirection:'column', maxHeight:'90vh' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--orion-line)' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--orion-text)' }}>Configurer le rapport PDF</div>
            <div className="o-eyebrow" style={{ marginTop:4 }}>{selectedCount} section{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} className="o-btn o-btn--ghost o-btn--sm"><X size={16} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>

          {/* Équipe globale */}
          <div style={{ marginBottom:22 }}>
            <div className="o-eyebrow" style={{ marginBottom:8 }}>Équipe — sections générales</div>
            <TeamPicker value={globalTeam} onChange={setGlobalTeam} />
            {globalTeam !== 'both' && (
              <div style={{ marginTop:8, padding:'7px 12px', background:'var(--orion-accent-dim)', borderLeft:'2px solid var(--orion-accent)', fontSize:11, color:'var(--orion-accent)' }}>
                Stats et KPIs uniquement pour <strong>{globalTeam === 'A' ? teamAName : teamBName}</strong>
              </div>
            )}
          </div>

          {/* Sections générales */}
          <div style={{ marginBottom:20 }}>
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
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background: sections[s.id] ? 'var(--orion-surface-2)' : 'transparent', border:`1px solid ${sections[s.id] ? 'var(--orion-line-strong)' : 'var(--orion-line)'}`, cursor:'pointer', textAlign:'left' }}>
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

          {/* Heatmaps avec équipe indépendante */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div className="o-eyebrow">Heatmaps</div>
              <span style={{ fontSize:10, color:'var(--orion-text-mute)' }}>— équipe et types configurables par heatmap</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {HEATMAP_SECTIONS.map(s => <HeatmapRow key={s.id} s={s} />)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 22px', borderTop:'1px solid var(--orion-line)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} className="o-btn o-btn--ghost">Annuler</button>
          <button onClick={handleExport} disabled={generating || selectedCount === 0} className="o-btn o-btn--primary" style={{ opacity: selectedCount === 0 ? 0.4 : 1 }}>
            <FileText size={14} />
            {generating ? 'Génération...' : 'Générer le PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
