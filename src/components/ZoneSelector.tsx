import { X } from 'lucide-react';

interface ZoneSelectorProps {
  onZoneSelected: (zone: string, x: number, y: number) => void;
  onSkip: () => void;
  eventName: string;
}

const ZONES = [
  { id: 'offensive', label: 'Zone Offensive', color: 'rgba(239, 68, 68, 0.35)', borderColor: '#ef4444', y: 16.5 },
  { id: 'mediane', label: 'Zone Médiane', color: 'rgba(250, 204, 21, 0.3)', borderColor: '#facc15', y: 50 },
  { id: 'defensive', label: 'Zone Défensive', color: 'rgba(59, 130, 246, 0.35)', borderColor: '#3b82f6', y: 83.5 },
];

export default function ZoneSelector({ onZoneSelected, onSkip, eventName }: ZoneSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary border-2 border-orange-primary rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h2 className="font-bold text-white text-sm">Dans quelle zone ?</h2>
            <p className="text-xs text-gray-400">{eventName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-dark-tertiary hover:bg-gray-700 rounded-lg transition-colors"
            >
              Passer
            </button>
            <button onClick={onSkip} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-600/40" style={{ aspectRatio: '68/100' }}>
            {/* Fond terrain */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 440 680" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <rect width="440" height="680" fill="#1A6B35" rx="8"/>
              <rect x="10" y="10" width="420" height="660" fill="none" stroke="#2A8A4A" strokeWidth="2"/>
              <line x1="10" y1="340" x2="430" y2="340" stroke="#2A8A4A" strokeWidth="1.5"/>
              <circle cx="220" cy="340" r="50" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
              <rect x="130" y="10" width="180" height="80" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
              <rect x="170" y="10" width="100" height="30" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
              <rect x="130" y="590" width="180" height="80" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
              <rect x="170" y="640" width="100" height="30" fill="none" stroke="#2A8A4A" strokeWidth="1.5"/>
            </svg>

            {/* 3 zones cliquables */}
            <div className="absolute inset-0 flex flex-col">
              {ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(30);
                    onZoneSelected(zone.id, 50, zone.y);
                  }}
                  className="flex-1 flex items-center justify-center transition-all hover:brightness-125 active:scale-[0.98] relative"
                  style={{
                    backgroundColor: zone.color,
                    borderBottom: zone.id !== 'defensive' ? `2px solid ${zone.borderColor}` : 'none',
                  }}
                >
                  <span
                    className="text-white font-bold text-lg drop-shadow-lg px-4 py-2 rounded-lg select-none"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {zone.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-600 mt-2">
            Appuyez sur la zone correspondante
          </p>
        </div>
      </div>
    </div>
  );
}
