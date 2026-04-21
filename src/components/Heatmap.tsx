import { useState, useMemo } from 'react';
import { Filter, MapPin, Target } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { getFootballFieldSVG } from '../utils/footballField';

interface HeatmapProps {
  events: MatchEventWithDetails[];
  matchId: string;
  teamAName: string;
  teamBName: string;
}

export default function Heatmap({ events, matchId, teamAName, teamBName }: HeatmapProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<'all' | 'A' | 'B'>('all');
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [view, setView] = useState<'field' | 'goal'>('field');

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(e => {
      const name = e.event_type?.name || e.label;
      if (name) types.add(name);
    });
    return Array.from(types);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => filterTeam === 'all' || e.team === filterTeam)
      .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType);
  }, [events, filterTeam, filterType]);

  const fieldEvents = filteredEvents.filter(e => e.field_x !== null && e.field_y !== null);
  const goalEvents = filteredEvents.filter(e => e.goal_x !== null && e.goal_y !== null);

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

  const getHeatColor = (val: number): string => {
    if (val === 0) return 'transparent';
    const intensity = val / maxHeat;
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.25)';
    if (intensity < 0.5) return 'rgba(34, 197, 94, 0.35)';
    if (intensity < 0.75) return 'rgba(250, 204, 21, 0.45)';
    return 'rgba(239, 68, 68, 0.55)';
  };

  const hasFieldData = fieldEvents.length > 0;
  const hasGoalData = goalEvents.length > 0;

  if (!hasFieldData && !hasGoalData) {
    return (
      <div className="bg-dark-secondary border border-gray-800 rounded-xl p-8 text-center">
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
    <div className="bg-dark-secondary border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-primary/20 rounded-lg">
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
          {hasGoalData && (
            <div className="flex bg-dark-tertiary rounded-lg border border-gray-700 overflow-hidden mr-2">
              <button
                onClick={() => setView('field')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  view === 'field' ? 'bg-orange-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Terrain
              </button>
              <button
                onClick={() => setView('goal')}
                className={`px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                  view === 'goal' ? 'bg-orange-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Target size={11} />
                But
              </button>
            </div>
          )}

          <Filter size={13} className="text-gray-500" />
          {(['all', 'A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterTeam(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterTeam === t
                  ? 'bg-orange-primary text-white'
                  : 'bg-dark-tertiary border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Tous' : t === 'A' ? teamAName : teamBName}
            </button>
          ))}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-dark-tertiary border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-orange-primary"
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
              className="relative rounded-lg border border-gray-700 overflow-hidden"
              style={{
                paddingBottom: '60%',
                backgroundImage: `url('${getFootballFieldSVG()}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0">
                {/* Grille de chaleur */}
                {heatGrid.map((row, ri) =>
                  row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className="absolute"
                      style={{
                        left: `${(ci / 10) * 100}%`,
                        top: `${(ri / 6) * 100}%`,
                        width: `${100 / 10}%`,
                        height: `${100 / 6}%`,
                        backgroundColor: getHeatColor(val),
                        transition: 'background-color 0.3s',
                      }}
                    />
                  ))
                )}

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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dark-secondary border border-gray-700 rounded-lg px-3 py-2 text-[11px] whitespace-nowrap z-30 shadow-xl">
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

        {view === 'goal' && hasGoalData && (
          <>
            {/* Cage de but avec points */}
            <div className="relative mx-auto" style={{ maxWidth: '480px' }}>
              <div className="relative border-4 border-white rounded-t-md overflow-hidden" style={{ aspectRatio: '7.32 / 2.44' }}>
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
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/10" />
                    ))}
                  </div>

                  {/* Points de tir */}
                  {goalEvents.map(e => (
                    <div
                      key={e.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        left: `${e.goal_x}%`,
                        top: `${e.goal_y}%`,
                      }}
                      onMouseEnter={() => setHoveredEvent(e.id)}
                      onMouseLeave={() => setHoveredEvent(null)}
                    >
                      <div
                        className="rounded-full border-2 border-white/80"
                        style={{
                          width: hoveredEvent === e.id ? '16px' : '12px',
                          height: hoveredEvent === e.id ? '16px' : '12px',
                          backgroundColor: e.outcome === 'success' ? '#22c55e' : e.outcome === 'failure' ? '#ef4444' : '#f59e0b',
                          boxShadow: '0 0 8px rgba(255,255,255,0.3)',
                          transition: 'width 0.15s, height 0.15s',
                        }}
                      />
                      {hoveredEvent === e.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dark-secondary border border-gray-700 rounded-lg px-3 py-2 text-[11px] whitespace-nowrap z-30 shadow-xl">
                          <p className="text-white font-medium">{e.event_type?.name || e.label}</p>
                          <p className="text-gray-400">{formatTime(e.timestamp)} · {e.outcome === 'success' ? 'But' : e.outcome === 'failure' ? 'Manqué' : 'Arrêté'}</p>
                        </div>
                      )}
                    </div>
                  ))}
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
