import { useMemo, useState } from 'react';
import { MatchEventWithDetails } from '../types/database';
import { Activity } from 'lucide-react';

interface StatisticsProps {
  events: MatchEventWithDetails[];
  teamAName?: string;
  teamBName?: string;
  halftimes?: number[];
}

interface TeamEventStats {
  name: string;
  teamA: number;
  teamB: number;
  total: number;
  color: string;
  teamAPercentage: number;
}

type Period = 'total' | 'first' | 'second';

function computeStats(events: MatchEventWithDetails[]): TeamEventStats[] {
  const eventsByType: Record<string, { teamA: number; teamB: number; color: string }> = {};

  events.forEach((event) => {
    const typeName = event.event_type?.name || event.label || 'Inconnu';
    if (!eventsByType[typeName]) {
      eventsByType[typeName] = {
        teamA: 0,
        teamB: 0,
        color: event.event_type?.color || '#6B7280',
      };
    }
    if (event.team === 'A') eventsByType[typeName].teamA++;
    else if (event.team === 'B') eventsByType[typeName].teamB++;
  });

  return Object.entries(eventsByType)
    .map(([name, data]) => {
      const total = data.teamA + data.teamB;
      const teamAPercentage = total > 0 ? (data.teamA / total) * 100 : 50;
      return { name, teamA: data.teamA, teamB: data.teamB, total, color: data.color, teamAPercentage };
    })
    .sort((a, b) => b.total - a.total);
}

export default function Statistics({ events, teamAName = 'Équipe A', teamBName = 'Équipe B', halftimes = [] }: StatisticsProps) {
  const [period, setPeriod] = useState<Period>('total');

  const end1st = halftimes[0];
  const start2nd = halftimes[1];

  const filteredEvents = useMemo(() => {
    if (!end1st || period === 'total') return events;
    if (period === 'first') return events.filter(e => e.timestamp <= end1st);
    if (period === 'second') {
      const from = start2nd ?? end1st;
      return events.filter(e => e.timestamp > from);
    }
    return events;
  }, [events, end1st, start2nd, period]);

  const stats = useMemo(() => computeStats(filteredEvents), [filteredEvents]);

  const tabs: { key: Period; label: string }[] = [
    { key: 'total', label: 'Total' },
    { key: 'first', label: '1ère MT' },
    { key: 'second', label: '2ème MT' },
  ];

  const showTabs = halftimes.length > 0;

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6 text-white">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity size={20} />
        Statistiques comparatives
      </h3>

      {showTabs && (
        <div className="flex gap-1 mb-4 bg-dark-tertiary rounded-lg p-1">
          {tabs.map(tab => {
            const disabled = tab.key === 'second' && halftimes.length < 1;
            return (
              <button
                key={tab.key}
                onClick={() => !disabled && setPeriod(tab.key)}
                disabled={disabled}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  period === tab.key
                    ? 'bg-blue-600 text-white'
                    : disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Par type d'action</h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span className="text-gray-400">{teamAName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-orange-primary" />
              <span className="text-gray-400">{teamBName}</span>
            </div>
          </div>
        </div>

        {stats.length === 0 ? (
          <p className="text-gray-600 text-sm">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-3">
            {stats.map((stat) => {
              const teamADominant = stat.teamA > stat.teamB;
              const teamBDominant = stat.teamB > stat.teamA;
              const isEqual = stat.teamA === stat.teamB;

              return (
                <div key={stat.name} className="bg-dark-tertiary/50 rounded-lg p-3 border border-gray-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                      <span className="text-sm font-medium text-white">{stat.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">total : {stat.total}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-base font-bold w-7 text-right tabular-nums ${teamADominant ? 'text-green-400' : 'text-gray-500'}`}>
                      {stat.teamA}
                    </span>

                    <div className="flex-1 relative h-5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-300"
                        style={{
                          width: `${stat.teamAPercentage}%`,
                          backgroundColor: isEqual ? '#4B5563' : (teamADominant ? '#22C55E' : '#86EFAC55'),
                        }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 transition-all duration-300"
                        style={{
                          width: `${100 - stat.teamAPercentage}%`,
                          backgroundColor: isEqual ? '#4B5563' : (teamBDominant ? '#ff6b35' : '#ff855544'),
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gray-200/80 shadow-lg"
                        style={{ left: `calc(${stat.teamAPercentage}% - 1px)` }}
                      />
                    </div>

                    <span className={`text-base font-bold w-7 text-left tabular-nums ${teamBDominant ? 'text-orange-400' : 'text-gray-500'}`}>
                      {stat.teamB}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
