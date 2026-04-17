import { useState, useRef } from 'react';
import { PanelButtonWithEventType } from '../types/database';
import { getFootballFieldSVG } from '../utils/footballField';
import { X, MapPin } from 'lucide-react';

interface LocationSelectorProps {
  zoneButtons: PanelButtonWithEventType[];
  onZoneSelected: (zoneButtonId: string, zoneLabel: string) => void;
  onCancel: () => void;
}

const CANVAS_REF_WIDTH = 1000;
const CANVAS_REF_HEIGHT = 600;

export default function LocationSelector({ zoneButtons, onZoneSelected, onCancel }: LocationSelectorProps) {
  const [flashingZone, setFlashingZone] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getButtonPositionPct = (btn: PanelButtonWithEventType) => {
    if (btn.layout_x !== null && btn.layout_y !== null) {
      const x = btn.layout_x > 100 ? (btn.layout_x / CANVAS_REF_WIDTH) * 100 : btn.layout_x;
      const y = btn.layout_y > 100 ? (btn.layout_y / CANVAS_REF_HEIGHT) * 100 : btn.layout_y;
      return { x, y };
    }
    const col = btn.position % 5;
    const row = Math.floor(btn.position / 5);
    return {
      x: col * (100 / CANVAS_REF_WIDTH * 140) + 100 / CANVAS_REF_WIDTH * 10,
      y: row * (100 / CANVAS_REF_HEIGHT * 80) + 100 / CANVAS_REF_HEIGHT * 10,
    };
  };

  const getButtonSizePct = (btn: PanelButtonWithEventType) => {
    if (btn.width !== null && btn.width !== undefined && btn.width > 0 && btn.width <= 100) {
      return { width: btn.width, height: btn.height ?? (100 / CANVAS_REF_HEIGHT * 60) };
    }
    if (btn.width !== null && btn.width !== undefined && btn.width > 100) {
      return {
        width: (btn.width / CANVAS_REF_WIDTH) * 100,
        height: ((btn.height ?? 60) / CANVAS_REF_HEIGHT) * 100,
      };
    }
    return {
      width: (120 / CANVAS_REF_WIDTH) * 100,
      height: (60 / CANVAS_REF_HEIGHT) * 100,
    };
  };

  const handleZoneClick = (zoneButton: PanelButtonWithEventType) => {
    setFlashingZone(zoneButton.id);
    setTimeout(() => setFlashingZone(null), 200);
    onZoneSelected(zoneButton.id, zoneButton.label);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary border-2 border-orange-primary rounded-xl shadow-2xl w-full max-w-3xl max-h-screen overflow-auto">
        <div className="sticky top-0 bg-dark-secondary border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-primary/20 rounded-lg">
              <MapPin className="text-orange-primary" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Sélectionner la Zone</h2>
              <p className="text-sm text-gray-400">Cliquez sur une zone pour localiser cet événement</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {zoneButtons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">Aucune zone configurée</p>
              <p className="text-xs text-gray-600">Configurez des zones dans votre panneau (Mode Édition)</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative rounded-lg border-2 border-gray-600/40 overflow-hidden"
              style={{
                paddingBottom: '60%',
                backgroundImage: `url('${getFootballFieldSVG()}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="absolute inset-0">
                {zoneButtons.map((zoneBtn) => {
                  const pos = getButtonPositionPct(zoneBtn);
                  const size = getButtonSizePct(zoneBtn);
                  const isFlashing = flashingZone === zoneBtn.id;

                  return (
                    <button
                      key={zoneBtn.id}
                      onClick={() => handleZoneClick(zoneBtn)}
                      className={`
                        absolute flex flex-col items-center justify-center gap-1 rounded-xl
                        font-semibold text-white transition-all cursor-pointer
                        hover:brightness-120 active:scale-95
                        ${isFlashing ? 'scale-90 brightness-150 z-20' : 'z-10'}
                      `}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: `${size.width}%`,
                        height: `${size.height}%`,
                        backgroundColor: zoneBtn.color,
                        boxShadow: `0 2px 8px ${zoneBtn.color}44`,
                      }}
                    >
                      <span className="text-sm font-bold leading-tight text-center px-1 break-words w-full pointer-events-none">
                        {zoneBtn.label}
                      </span>
                      <span className="text-[9px] opacity-60 pointer-events-none">Zone</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {zoneButtons.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-3">Zones disponibles:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {zoneButtons.map((zoneBtn) => (
                  <button
                    key={zoneBtn.id}
                    onClick={() => handleZoneClick(zoneBtn)}
                    className="p-2 rounded-lg text-xs font-medium text-white transition-all hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: zoneBtn.color,
                      boxShadow: `0 2px 8px ${zoneBtn.color}44`,
                    }}
                  >
                    {zoneBtn.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
