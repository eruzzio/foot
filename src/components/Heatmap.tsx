import { useState, useEffect, useMemo } from 'react';
import { Filter, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MatchEventWithDetails, PanelButton } from '../types/database';
import { getFootballFieldSVG } from '../utils/footballField';

interface HeatmapProps {
  events: MatchEventWithDetails[];
  matchId: string;
  teamAName: string;
  teamBName: string;
}

interface ZoneData {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  count: number;
  events: MatchEventWithDetails[];
}

const FIELD_W = 1000;
const FIELD_H = 600;

export default function Heatmap({ events, matchId, teamAName, teamBName }: HeatmapProps) {
  const [zoneButtons, setZoneButtons] = useState<PanelButton[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<'all' | 'A' | 'B'>('all');
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  useEffect(() => {
    loadZoneButtons();
  }, [matchId]);

  const loadZoneButtons = async () => {
    // Trouver les zone buttons en cherchant les location_id des events
    const locationIds = events
      .map(e => e.location_id)
      .filter((id): id is string => id !== null && id !== undefined);

    if (locationIds.length === 0) {
      setLoading(false);
      return;
    }

    const uniqueIds = Array.from(new Set(locationIds));

    const { data } = await supabase
      .from('panel_buttons')
      .select('*')
      .in('id', uniqueIds);

    if (data) {
      setZoneButtons(data);
    }
    setLoading(false);
  };

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
      .filter(e => e.location_id !== null)
      .filter(e => filterTeam === 'all' || e.team === filterTeam)
      .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType);
  }, [events, filterTeam, filterType]);

  const zoneData = useMemo((): ZoneData[] => {
    if (zoneButtons.length === 0) return [];

    return zoneButtons.map(btn => {
      const zoneEvents = filteredEvents.filter(e => e.location_id === btn.id);

      const x = btn.layout_x !== null && btn.layout_x > 100
        ? (btn.layout_x / FIELD_W) * 100
        : btn.layout_x ?? 0;
      const y = btn.layout_y !== null && btn.layout_y > 100
        ? (btn.layout_y / FIELD_H) * 100
        : btn.layout_y ?? 0;
      const w = btn.width !== null && btn.width > 100
        ? (btn.width / FIELD_W) * 100
        : btn.width ?? 12;
      const h = btn.height !== null && btn.height > 100
        ? (btn.height / FIELD_H) * 100
        : btn.height ?? 10;

      return {
        id: btn.id,
        label: btn.label,
        x,
        y,
        width: w,
        height: h,
        color: btn.color,
        count: zoneEvents.length,
        events: zoneEvents,
      };
    });
  }, [zoneButtons, filteredEvents]);

  const maxCount = Math.max(1, ...zoneData.map(z => z.count));
  const totalWithZone = filteredEvents.length;
  const totalWithoutZone = events
    .filter(e => filterTeam === 'all' || e.team === filterTeam)
    .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType)
    .filter(e => e.location_id === null).length;

  const getHeatColor = (count: number): string => {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.35)';
    if (intensity < 0.5) return 'rgba(34, 197, 94, 0.45)';
    if (intensity < 0.75) return 'rgba(250, 204, 21, 0.55)';
    return 'rgba(239, 68, 68, 0.65)';
  };

  const getHeatBorder = (count: number): string => {
    if (count === 0) return 'rgba(255,255,255,0.1)';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.6)';
    if (intensity < 0.5) return 'rgba(34, 197, 94, 0.7)';
    if (intensity < 0.75) return 'rgba(250, 204, 21, 0.8)';
    return 'rgba(239, 68, 68, 0.9)';
  };

  if (loading) {
    return (
      <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 text-center text-gray-400">
        Chargement de la heatmap...
      </div>
    );
  }

  if (zoneButtons.length === 0) {
    return (
      <div className="bg-dark-secondary border border-gray-800 rounded-xl p-8 text-center">
        <MapPin size={32} className="mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400 font-medium mb-1">Heatmap indisponible</p>
        <p className="text-gray-600 text-sm">
          Aucun événement avec zone enregistré pour ce match.
          Configurez des boutons de zone dans votre panneau pour activer la heatmap.
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
            <h3 className="font-semibold text-white text-sm">Heatmap des zones</h3>
            <p className="text-xs text-gray-500">{totalWithZone} action{totalWithZone > 1 ? 's' : ''} localisée{totalWithZone > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 items-center">
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

      {/* Terrain avec heatmap */}
      <div className="p-4">
        <div
          className="relative rounded-lg border border-gray-700 overflow-hidden"
          style={{
            paddingBottom: '60%',
            backgroundImage: `url('${getFootballFieldSVG()}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0">
            {zoneData.map(zone => (
              <div
                key={zone.id}
                className="absolute flex flex-col items-center justify-center rounded-lg transition-all duration-200 cursor-default"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  backgroundColor: getHeatColor(zone.count),
                  border: `2px solid ${getHeatBorder(zone.count)}`,
                  transform: hoveredZone === zone.id ? 'scale(1.03)' : 'scale(1)',
                  zIndex: hoveredZone === zone.id ? 20 : 10,
                }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <span className="text-white font-bold text-lg leading-none drop-shadow-lg">
                  {zone.count}
                </span>
                <span className="text-white/70 text-[10px] font-medium mt-0.5 drop-shadow">
                  {zone.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.5)' }} />
              <span className="text-[10px] text-gray-400">Faible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34,197,94,0.6)' }} />
              <span className="text-[10px] text-gray-400">Moyen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(250,204,21,0.7)' }} />
              <span className="text-[10px] text-gray-400">Fort</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.8)' }} />
              <span className="text-[10px] text-gray-400">Intense</span>
            </div>
          </div>
          {totalWithoutZone > 0 && (
            <span className="text-[10px] text-gray-600">
              {totalWithoutZone} action{totalWithoutZone > 1 ? 's' : ''} sans zone
            </span>
          )}
        </div>
      </div>

      {/* Détail de la zone survolée */}
      {hoveredZone && (() => {
        const zone = zoneData.find(z => z.id === hoveredZone);
        if (!zone || zone.count === 0) return null;

        // Grouper les événements par type
        const byType: Record<string, number> = {};
        zone.events.forEach(e => {
          const name = e.event_type?.name || e.label || 'Autre';
          byType[name] = (byType[name] || 0) + 1;
        });

        return (
          <div className="px-6 pb-4 border-t border-gray-800 pt-3">
            <p className="text-xs font-medium text-gray-300 mb-2">
              {zone.label} — {zone.count} action{zone.count > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-tertiary border border-gray-700 text-xs"
                >
                  <span className="text-gray-300">{name}</span>
                  <span className="text-orange-primary font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
