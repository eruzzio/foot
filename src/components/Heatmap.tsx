import { useState, useMemo } from 'react';
import { Filter, MapPin, Target } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { getFootballFieldSVG } from '../utils/footballField';

interface HeatmapProps {
  events: MatchEventWithDetails[];
  teamAName: string;
  teamBName: string;
  halftimes?: number[];
}

export default function Heatmap({ events, teamAName, teamBName, halftimes = [] }: HeatmapProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<'all' | 'A' | 'B'>('all');
  const [filterHalf, setFilterHalf] = useState<'all' | '1' | '2'>('all');
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [view, setView] = useState<'field' | 'goal' | 'zones'>('field');

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(e => {
      // N'afficher que les actions qui ont une position terrain ou but
      if (e.field_x === null && e.goal_x === null) return;
      const name = e.event_type?.name || e.label;
      if (name) types.add(name);
    });
    return Array.from(types);
  }, [events]);

  const halfTime = halftimes[0] ?? 2700; // 45min par défaut

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => filterTeam === 'all' || e.team === filterTeam)
      .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType)
      .filter(e => {
        if (filterHalf === 'all') return true;
        if (filterHalf === '1') return e.timestamp <= halfTime;
        return e.timestamp > halfTime;
      });
  }, [events, filterTeam, filterType, filterHalf, halfTime]);

  const fieldEvents = filteredEvents.filter(e => e.field_x !== null && e.field_y !== null);
  const goalEvents = filteredEvents.filter(e => e.goal_x !== null && e.goal_y !== null);

  // Events par zone (3 zones : offensive y<33, médiane 33<y<66, défensive y>66)
  const zoneEvents = useMemo(() => {
    // Uniquement les événements codés via ZoneSelector
    const zoneOnly = fieldEvents.filter(e => e.label === 'Zone Défensive' || e.label === 'Zone Médiane' || e.label === 'Zone Offensive');
    const isTeamB = filterTeam === 'B';
    const offensive = zoneOnly.filter(e => isTeamB ? (e.field_x ?? 0) < 33 : (e.field_x ?? 0) > 66);
    const mediane   = zoneOnly.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66);
    const defensive = zoneOnly.filter(e => isTeamB ? (e.field_x ?? 0) > 66 : (e.field_x ?? 0) < 33);
    return { offensive, mediane, defensive };
  }, [fieldEvents]);

  // Détail par zone : quels types dans chaque zone
  // Mots-clés pertinents par zone
  const ZONE_KEYWORDS = {
    defensive: ['récup', 'recup', 'tacle', 'tackle', 'faute', 'foul', 'duel', 'perte', 'interception', 'dégagement', 'arrêt', 'gardien', 'défens'],
    mediane:   ['passe', 'pass', 'relance', 'duel', 'faute', 'foul', 'récup', 'recup', 'perte', 'centre', 'transition', 'conduite'],
    offensive: ['tir', 'shot', 'frappe', 'but', 'penalty', 'coup franc', 'centre', 'dribble', 'faute', 'occasion', 'tête'],
  };

  const zoneDetail = useMemo(() => {
    const detail = (evts: MatchEventWithDetails[], keywords?: string[]) => {
      const byType: Record<string, { count: number; color: string }> = {};
      evts.forEach(e => {
        const name = e.event_type?.name || e.label || 'Autre';
        const color = e.event_type?.color || '#9CA3AF';
        // Filtrer par pertinence si keywords fournis
        if (keywords) {
          const nameLower = name.toLowerCase();
          const isRelevant = keywords.some(k => nameLower.includes(k));
          if (!isRelevant) return;
        }
        if (!byType[name]) byType[name] = { count: 0, color };
        byType[name].count++;
      });
      const sorted = Object.entries(byType).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
      // Si aucun tag pertinent, afficher quand même les 3 premiers sans filtre
      if (sorted.length === 0 && keywords) {
        return Object.entries(byType).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
      }
      return sorted;
    };

    const isTeamB = filterTeam === 'B';
    const zoneOnly2 = fieldEvents.filter(e => e.label === 'Zone Défensive' || e.label === 'Zone Médiane' || e.label === 'Zone Offensive');
    const defEvts = zoneOnly2.filter(e => isTeamB ? (e.field_x ?? 0) > 66 : (e.field_x ?? 0) < 33);
    const medEvts = zoneOnly2.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66);
    const offEvts = zoneOnly2.filter(e => isTeamB ? (e.field_x ?? 0) < 33 : (e.field_x ?? 0) > 66);

    return {
      defensive: detail(defEvts, ZONE_KEYWORDS.defensive),
      mediane:   detail(medEvts, ZONE_KEYWORDS.mediane),
      offensive: detail(offEvts, ZONE_KEYWORDS.offensive),
    };
  }, [fieldEvents]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Générer les données de densité pour la heatmap par grille
  const heatGrid = useMemo(() => {
    const cols = 10;
    const rows = 6;
    const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    fieldEvents.forEach(e => {
      if (e.field_x === null || e.field_y === null) return;
      const col = Math.min(cols - 1, Math.floor((e.field_x / 100) * cols));
      const row = Math.min(rows - 1, Math.floor((e.field_y / 100) * rows));
      grid[row][col]++;
    });

    return grid;
  }, [fieldEvents]);

  const maxHeat = Math.max(1, ...heatGrid.flat());


  const hasFieldData = fieldEvents.length > 0;
  const hasGoalData = goalEvents.length > 0;
  const hasZoneData = fieldEvents.length > 0;

  const ZoneTypeTags = ({ entries }: { entries: [string, { count: number; color: string }][] }) => (
    <div className="flex flex-col items-center gap-0.5 mt-1">
      {entries.map(([name, data]) => (
        <span
          key={name}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${data.color}30`, color: data.color, border: `1px solid ${data.color}60` }}
        >
          {name} {data.count}
        </span>
      ))}
    </div>
  );

  if (!hasFieldData && !hasGoalData) {
    return (
      <div className="bg-dark-secondary border border-orion-line  p-8 text-center">
        <MapPin size={32} className="mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 font-medium mb-1">Heatmap indisponible</p>
        <p className="text-gray-600 text-sm">
          Aucune action avec localisation pour ce match.
          Utilisez le clic terrain pendant le codage pour activer la heatmap.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-secondary border border-orion-line  shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-orion-line flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-primary/20 ">
            <MapPin size={18} className="text-orange-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Heatmap</h3>
            <p className="text-xs text-gray-500">
              {fieldEvents.length} sur terrain · {goalEvents.length} dans le but
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Vue toggle */}
          <div className="flex bg-dark-tertiary  border border-orion-line overflow-hidden mr-2">
            <button
              onClick={() => setView('field')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                view === 'field' ? 'bg-orange-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => setView('zones')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                view === 'zones' ? 'bg-orange-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Zones
            </button>
            {hasGoalData && (
              <button
                onClick={() => setView('goal')}
                className={`px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                  view === 'goal' ? 'bg-orange-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Target size={11} />
                But
              </button>
            )}
          </div>

          <Filter size={13} className="text-gray-500" />
          {(['all', 'A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterTeam(t)}
              className={`px-3 py-1  text-xs font-medium transition-colors ${
                filterTeam === t
                  ? 'bg-orange-primary text-white'
                  : 'bg-dark-tertiary border border-orion-line text-gray-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Tous' : t === 'A' ? teamAName : teamBName}
            </button>
          ))}
          {/* Filtre mi-temps */}
          <div className="flex bg-dark-tertiary border border-orion-line  overflow-hidden">
            {(['all', '1', '2'] as const).map(h => (
              <button
                key={h}
                onClick={() => setFilterHalf(h)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterHalf === h
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {h === 'all' ? 'Match' : `${h}ère MT`}
              </button>
            ))}
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-dark-tertiary border border-orion-line text-gray-300 text-xs  px-2 py-1 focus:outline-none focus:border-orion-accent"
          >
            <option value="all">Tous les types</option>
            {eventTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        {view === 'field' && hasFieldData && (
          <>
            {/* Terrain avec heatmap grille + points */}
            <div
              className="relative  border border-orion-line overflow-hidden"
              style={{
                paddingBottom: '60%',
                backgroundImage: `url('${getFootballFieldSVG()}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0">
                {/* Points individuels */}
                {fieldEvents.map(e => (
                  <div
                    key={e.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{
                      left: `${e.field_x}%`,
                      top: `${e.field_y}%`,
                    }}
                    onMouseEnter={() => setHoveredEvent(e.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <div
                      className="rounded-full border-2 border-white/60 transition-transform"
                      style={{
                        width: hoveredEvent === e.id ? '14px' : '10px',
                        height: hoveredEvent === e.id ? '14px' : '10px',
                        backgroundColor: e.event_type?.color || '#f97316',
                        boxShadow: `0 0 6px ${e.event_type?.color || '#f97316'}88`,
                      }}
                    />
                    {hoveredEvent === e.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dark-secondary border border-orion-line  px-3 py-2 text-[11px] whitespace-nowrap z-30 shadow-xl">
                        <p className="text-white font-medium">{e.event_type?.name || e.label}</p>
                        <p className="text-gray-400">{formatTime(e.timestamp)} · {e.team === 'A' ? teamAName : teamBName}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Légende */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.4)' }} />
                <span className="text-[10px] text-gray-400">Faible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34,197,94,0.5)' }} />
                <span className="text-[10px] text-gray-400">Moyen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(250,204,21,0.6)' }} />
                <span className="text-[10px] text-gray-400">Fort</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }} />
                <span className="text-[10px] text-gray-400">Intense</span>
              </div>
              <span className="text-[10px] text-gray-600 ml-auto">{fieldEvents.length} actions</span>
            </div>
          </>
        )}

        {view === 'zones' && hasZoneData && (
          <>
            {/* Terrain horizontal avec 3 zones */}
            <div
              className="relative  overflow-hidden border border-orion-line"
              style={{ paddingBottom: '60%' }}
            >
              {/* Fond terrain */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, #1A6B35, #1e7a3d)',
              }} />
              {/* Lignes terrain */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
                <rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" strokeWidth="2"/>
                <line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" strokeWidth="1.5"/>
                <circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
                <rect x="10" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
                <rect x="590" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
              </svg>

              {/* 3 zones horizontales */}
              <div className="absolute inset-0 flex flex-row">
                {/* Zone Défensive (gauche) */}
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.18)', borderRight: '2px dashed rgba(59,130,246,0.5)' }}>
                  <div className="text-center z-10">
                    <div className="text-2xl font-medium text-orion-text drop-shadow-lg">{zoneEvents.defensive.length}</div>
                    <div className="text-xs font-semibold text-blue-300 mt-1">Défensif</div>
                    <div className="text-[10px] text-blue-400/70">{fieldEvents.length > 0 ? Math.round((zoneEvents.defensive.length / fieldEvents.length) * 100) : 0}%</div>
                    <ZoneTypeTags entries={zoneDetail.defensive} />
                  </div>
                </div>
                {/* Zone Médiane (centre) */}
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'rgba(250,204,21,0.12)', borderRight: '2px dashed rgba(250,204,21,0.5)' }}>
                  <div className="text-center z-10">
                    <div className="text-2xl font-medium text-orion-text drop-shadow-lg">{zoneEvents.mediane.length}</div>
                    <div className="text-xs font-semibold text-yellow-300 mt-1">Médian</div>
                    <div className="text-[10px] text-yellow-400/70">{fieldEvents.length > 0 ? Math.round((zoneEvents.mediane.length / fieldEvents.length) * 100) : 0}%</div>
                    <ZoneTypeTags entries={zoneDetail.mediane} />
                  </div>
                </div>
                {/* Zone Offensive (droite) */}
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.18)' }}>
                  <div className="text-center z-10">
                    <div className="text-2xl font-medium text-orion-text drop-shadow-lg">{zoneEvents.offensive.length}</div>
                    <div className="text-xs font-semibold text-red-300 mt-1">Offensif</div>
                    <div className="text-[10px] text-red-400/70">{fieldEvents.length > 0 ? Math.round((zoneEvents.offensive.length / fieldEvents.length) * 100) : 0}%</div>
                    <ZoneTypeTags entries={zoneDetail.offensive} />
                  </div>
                </div>
              </div>
            </div>

            {/* Barres de répartition */}
            <div className="mt-3 space-y-2">
              {[
                { label: 'Défensif', count: zoneEvents.defensive.length, color: '#3B82F6', bg: 'bg-blue-500' },
                { label: 'Médian', count: zoneEvents.mediane.length, color: '#FACC15', bg: 'bg-yellow-400' },
                { label: 'Offensif', count: zoneEvents.offensive.length, color: '#EF4444', bg: 'bg-red-500' },
              ].map(z => (
                <div key={z.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16">{z.label}</span>
                  <div className="flex-1 bg-dark-tertiary rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${z.bg} rounded-full transition-all`}
                      style={{ width: `${fieldEvents.length > 0 ? (z.count / fieldEvents.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-white font-bold w-8 text-right">{z.count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'goal' && hasGoalData && (
          <>
            {/* Cage de but avec points */}
            <div className="relative mx-auto" style={{ maxWidth: '480px' }}>
              <div className="relative border-4 border-white rounded-t-md" style={{ aspectRatio: '7.32 / 2.44' }}>
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, #1a2a3a 25%, transparent 25%) -10px 0, linear-gradient(225deg, #1a2a3a 25%, transparent 25%) -10px 0, linear-gradient(315deg, #1a2a3a 25%, transparent 25%), linear-gradient(45deg, #1a2a3a 25%, transparent 25%)',
                    backgroundSize: '20px 20px',
                    backgroundColor: '#0f1a2a',
                  }}
                >
                  {/* Grille 3x3 */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_item, i) => (
                      <div key={i} className="border border-white/10" />
                    ))}
                  </div>

                  {/* Points de tir */}
                  {goalEvents.map(e => {
                    const isTop = (e.goal_y ?? 50) < 50;
                    return (
                      <div
                        key={e.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                        style={{ left: `${e.goal_x}%`, top: `${e.goal_y}%` }}
                        onMouseEnter={() => setHoveredEvent(e.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                      >
                        <div
                          className="rounded-full border-2 border-white/80"
                          style={{
                            width: hoveredEvent === e.id ? '18px' : '13px',
                            height: hoveredEvent === e.id ? '18px' : '13px',
                            backgroundColor: e.outcome === 'success' ? '#22c55e' : e.outcome === 'failure' ? '#ef4444' : '#f59e0b',
                            boxShadow: '0 0 8px rgba(255,255,255,0.3)',
                            transition: 'width 0.15s, height 0.15s',
                          }}
                        />
                        {hoveredEvent === e.id && (
                          <div
                            className="absolute left-1/2 -translate-x-1/2 bg-dark-secondary border border-gray-600  px-3 py-2 text-[11px] whitespace-nowrap z-50 shadow-xl pointer-events-none"
                            style={{ [isTop ? 'top' : 'bottom']: '100%', marginTop: isTop ? '6px' : 0, marginBottom: isTop ? 0 : '6px' }}
                          >
                            <p className="text-white font-semibold">{e.event_type?.name || e.label}</p>
                            <p className="text-gray-400">{formatTime(e.timestamp)} · {e.outcome === 'success' ? '✅ But' : e.outcome === 'failure' ? '❌ Manqué' : '🟡 Arrêté'}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="h-2 bg-green-800 rounded-b-sm" />
            </div>

            {/* Légende but */}
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-400">But</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-[10px] text-gray-400">Arrêté</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-400">Manqué</span>
              </div>
              <span className="text-[10px] text-gray-600">{goalEvents.length} tirs</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
