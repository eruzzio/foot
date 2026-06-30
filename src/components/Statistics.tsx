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
    <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:10, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--orion-text)', display:'flex', alignItems:'center', gap:8 }}>
          <Activity size={16} style={{ color:'var(--orion-accent)' }} />
          Statistiques comparatives
        </h3>
        {showTabs && (
          <div style={{ display:'flex', gap:2, background:'var(--orion-surface-2)', borderRadius:6, padding:2 }}>
            {tabs.map(tab => {
              const disabled = tab.key === 'second' && halftimes.length < 1;
              return (
                <button
                  key={tab.key}
                  onClick={() => !disabled && setPeriod(tab.key)}
                  disabled={disabled}
                  style={{
                    padding:'5px 11px', fontSize:11, fontWeight:600, border:'none', borderRadius:5, cursor: disabled ? 'not-allowed' : 'pointer',
                    background: period === tab.key ? 'var(--orion-accent)' : 'transparent',
                    color: period === tab.key ? '#fff' : disabled ? 'var(--orion-text-faint)' : 'var(--orion-text-mute)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {stats.length === 0 ? (
        <p style={{ color:'var(--orion-text-faint)', fontSize:13 }}>Aucune donnée disponible</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'14px 28px' }}>
          {stats.map((stat) => (
            <div key={stat.name}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontFamily:'var(--orion-font-mono)', fontWeight:700, fontSize:13, color: stat.teamA >= stat.teamB ? 'var(--orion-accent)' : 'var(--orion-text-mute)' }}>{stat.teamA}</span>
                <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'var(--orion-text-dim)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:stat.color, flexShrink:0 }} />
                  {stat.name}
                </span>
                <span style={{ fontFamily:'var(--orion-font-mono)', fontWeight:700, fontSize:13, color: stat.teamB >= stat.teamA ? 'var(--orion-amber)' : 'var(--orion-text-mute)' }}>{stat.teamB}</span>
              </div>
              <div style={{ display:'flex', height:7, borderRadius:4, overflow:'hidden', background:'var(--orion-surface-3)' }}>
                <div style={{ width:`${stat.teamAPercentage}%`, background:'var(--orion-accent)' }} />
                <div style={{ flex:1, background:'var(--orion-amber)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
