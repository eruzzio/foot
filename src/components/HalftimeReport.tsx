import { X, TrendingUp, Target } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { calculateTeamXG, getShotEvents } from '../utils/xg';

interface HalftimeReportProps {
  events: MatchEventWithDetails[];
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  teamAColor: string;
  teamBColor: string;
  currentTime: number;
  onClose: () => void;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function HalftimeReport({
  events, teamAName, teamBName, teamAScore, teamBScore,
  teamAColor, teamBColor, currentTime, onClose
}: HalftimeReportProps) {

  const teamAEvents = events.filter(e => e.team === 'A');
  const teamBEvents = events.filter(e => e.team === 'B');

  // Stats par type
  const typeMap: Record<string, { A: number; B: number; color: string }> = {};
  events.forEach(e => {
    const name = e.event_type?.name || e.label || 'Autre';
    const color = e.event_type?.color || '#6B7280';
    if (!typeMap[name]) typeMap[name] = { A: 0, B: 0, color };
    if (e.team === 'A') typeMap[name].A++;
    else typeMap[name].B++;
  });
  const sortedTypes = Object.entries(typeMap)
    .map(([name, d]) => ({ name, ...d, total: d.A + d.B }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // xG
  const xgA = calculateTeamXG(events, 'A');
  const xgB = calculateTeamXG(events, 'B');
  const shotsA = getShotEvents(teamAEvents).length;
  const shotsB = getShotEvents(teamBEvents).length;

  // Zones
  const fieldEvents = events.filter(e => e.field_x !== null);
  const zoneA = {
    def: teamAEvents.filter(e => (e.field_x ?? 0) < 33).length,
    mid: teamAEvents.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66).length,
    att: teamAEvents.filter(e => (e.field_x ?? 0) > 66).length,
  };
  const zoneB = {
    def: teamBEvents.filter(e => (e.field_x ?? 0) < 33).length,
    mid: teamBEvents.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66).length,
    att: teamBEvents.filter(e => (e.field_x ?? 0) > 66).length,
  };

  // Moments chauds : 5min avec le plus d'actions
  const periodMap: Record<number, number> = {};
  events.forEach(e => {
    const period = Math.floor(e.timestamp / 300); // tranches de 5 min
    periodMap[period] = (periodMap[period] || 0) + 1;
  });
  const hotPeriod = Object.entries(periodMap).sort((a, b) => b[1] - a[1])[0];
  const hotMinute = hotPeriod ? `${parseInt(hotPeriod[0]) * 5}-${parseInt(hotPeriod[0]) * 5 + 5}'` : null;

  const StatBar = ({ a, b, label, color }: { a: number; b: number; label: string; color: string }) => {
    const total = a + b || 1;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white w-6 text-right">{a}</span>
        <div className="flex-1">
          <div className="text-[10px] text-white/50 text-center mb-0.5">{label}</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
            <div className="h-full rounded-l-full transition-all" style={{ width: `${(a / total) * 100}%`, backgroundColor: teamAColor }} />
            <div className="h-full rounded-r-full transition-all" style={{ width: `${(b / total) * 100}%`, backgroundColor: teamBColor }} />
          </div>
        </div>
        <span className="text-sm font-bold text-white w-6">{b}</span>
      </div>
    );
  };

  return (
    <div className="orion fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] p-3 overflow-y-auto">
      <div className="bg-dark-secondary border border-orion-line rounded-2xl w-full max-w-lg shadow-2xl my-2">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-orion-line">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-orange-primary rounded-full" />
            <div>
              <h2 className="text-base font-bold text-white">Rapport Mi-Temps</h2>
              <p className="text-xs text-white/50">{formatTime(currentTime)} · {events.length} actions codées</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors">
            <X size={18} className="text-white/50" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Score */}
          <div className="bg-dark-tertiary rounded-lg p-4">
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: teamAColor }}>{teamAScore}</div>
                <div className="text-xs font-semibold text-white/80 mt-1 truncate">{teamAName}</div>
                <div className="text-[10px] text-white/50">{teamAEvents.length} actions</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-white/50 font-bold">—</div>
                <div className="text-[10px] text-white/50 mt-1">MI-TEMPS</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: teamBColor }}>{teamBScore}</div>
                <div className="text-xs font-semibold text-white/80 mt-1 truncate">{teamBName}</div>
                <div className="text-[10px] text-white/50">{teamBEvents.length} actions</div>
              </div>
            </div>
          </div>

          {/* xG */}
          {(xgA + xgB) > 0 && (
            <div className="bg-dark-tertiary rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-orange-primary" />
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Expected Goals</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: teamAColor }}>{xgA.toFixed(2)}</div>
                  <div className="text-[10px] text-white/50">{shotsA} tir{shotsA > 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
                    <div className="h-full" style={{ width: `${(xgA / (xgA + xgB)) * 100}%`, backgroundColor: teamAColor }} />
                    <div className="h-full flex-1" style={{ backgroundColor: teamBColor }} />
                  </div>
                  <div className="text-center text-[9px] text-white/50 mt-1">xG</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: teamBColor }}>{xgB.toFixed(2)}</div>
                  <div className="text-[10px] text-white/50">{shotsB} tir{shotsB > 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats comparatives */}
          <div className="bg-dark-tertiary rounded-lg p-4">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Comparatif</div>
            <div className="space-y-2.5">
              <StatBar a={teamAEvents.length} b={teamBEvents.length} label="Total actions" color={teamAColor} />
              {sortedTypes.map(t => (
                <StatBar key={t.name} a={t.A} b={t.B} label={t.name} color={t.color} />
              ))}
            </div>
          </div>

          {/* Zones si données disponibles */}
          {fieldEvents.length > 0 && (
            <div className="bg-dark-tertiary rounded-lg p-4">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Répartition par zone</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Défensif', aVal: zoneA.def, bVal: zoneB.def, color: '#3B82F6' },
                  { label: 'Médian', aVal: zoneA.mid, bVal: zoneB.mid, color: '#F59E0B' },
                  { label: 'Offensif', aVal: zoneA.att, bVal: zoneB.att, color: '#EF4444' },
                ].map(z => (
                  <div key={z.label} className="bg-dark-secondary  p-2">
                    <div className="text-[10px] font-semibold mb-1" style={{ color: z.color }}>{z.label}</div>
                    <div className="flex justify-around">
                      <span className="text-sm font-bold" style={{ color: teamAColor }}>{z.aVal}</span>
                      <span className="text-white/50">|</span>
                      <span className="text-sm font-bold" style={{ color: teamBColor }}>{z.bVal}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-white/50 mt-1 px-1">
                <span>{teamAName}</span>
                <span>{teamBName}</span>
              </div>
            </div>
          )}

          {/* Moment chaud */}
          {hotMinute && (
            <div className="bg-orange-primary/10 border border-orion-accent/30  p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-primary/20  flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="text-orange-primary" />
              </div>
              <div>
                <div className="text-xs font-bold text-orange-300">Période la plus intense</div>
                <div className="text-sm text-white">{hotMinute} — {hotPeriod[1]} actions codées</div>
              </div>
            </div>
          )}

        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-primary hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
          >
            Retour au match
          </button>
        </div>
      </div>
    </div>
  );
}
