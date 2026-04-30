interface ZoneSelectorProps {
  onZoneSelected: (zone: string, x: number, y: number) => void;
  onSkip: () => void;
  eventName: string;
}

const ZONES = [
  { id: 'offensive', label: 'Zone Offensive', color: '#DC2626', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', y: 16.5 },
  { id: 'mediane', label: 'Zone Médiane', color: '#CA8A04', bg: 'rgba(250, 204, 21, 0.15)', border: '#facc15', y: 50 },
  { id: 'defensive', label: 'Zone Défensive', color: '#2563EB', bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', y: 83.5 },
];

export default function ZoneSelector({ onZoneSelected, onSkip, eventName }: ZoneSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header compact */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div>
          <h2 className="font-bold text-white text-sm">Dans quelle zone ?</h2>
          <p className="text-xs text-gray-400">{eventName}</p>
        </div>
        <button
          onClick={onSkip}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Passer
        </button>
      </div>

      {/* 3 zones plein ecran */}
      <div className="flex-1 flex flex-col gap-2 p-3 min-h-0">
        {ZONES.map((zone) => (
          <button
            key={zone.id}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(40);
              onZoneSelected(zone.id, 50, zone.y);
            }}
            className="flex-1 flex items-center justify-center rounded-xl transition-all active:scale-[0.97] select-none min-h-0"
            style={{
              backgroundColor: zone.bg,
              border: `3px solid ${zone.border}`,
            }}
          >
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                {zone.label}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
