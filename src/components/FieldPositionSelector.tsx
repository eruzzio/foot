import { useRef } from 'react';
import { X, MapPin } from 'lucide-react';
import { getFootballFieldSVG } from '../utils/footballField';

interface FieldPositionSelectorProps {
  onPositionSelected: (x: number, y: number) => void;
  onSkip: () => void;
  eventName: string;
}

export default function FieldPositionSelector({ onPositionSelected, onSkip, eventName }: FieldPositionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
    const clampedY = Math.max(0, Math.min(100, Math.round(y * 10) / 10));

    onPositionSelected(clampedX, clampedY);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary border-2 border-orange-primary rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-primary/20 rounded-lg">
              <MapPin className="text-orange-primary" size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">{"O\u00f9 se passe l\u2019action ?"}</h2>
              <p className="text-xs text-gray-400">{eventName} — Cliquez sur le terrain</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-dark-tertiary hover:bg-gray-700 rounded-lg transition-colors"
            >
              Passer
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div
            ref={containerRef}
            onClick={handleClick}
            className="relative rounded-lg border-2 border-gray-600/40 overflow-hidden cursor-crosshair"
            style={{
              paddingBottom: '60%',
              backgroundImage: `url('${getFootballFieldSVG()}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 hover:bg-white/5 transition-colors" />
          </div>
          <p className="text-center text-[11px] text-gray-600 mt-2">
            Appuyez sur le terrain pour localiser cette action
          </p>
        </div>
      </div>
    </div>
  );
}
