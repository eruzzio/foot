import { useRef } from 'react';
import { X } from 'lucide-react';

interface GoalZoneSelectorProps {
  onPositionSelected: (x: number, y: number) => void;
  onSkip: () => void;
}

export default function GoalZoneSelector({ onPositionSelected, onSkip }: GoalZoneSelectorProps) {
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
      <div className="bg-dark-secondary border-2 border-orange-primary rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h2 className="font-bold text-white text-sm">{"O\u00f9 va le ballon ?"}</h2>
            <p className="text-xs text-gray-400">Cliquez dans le but</p>
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

        <div className="p-5">
          {/* Cage de but */}
          <div className="relative mx-auto" style={{ maxWidth: '420px' }}>
            {/* Poteaux et barre */}
            <div className="relative border-4 border-white rounded-t-md overflow-hidden" style={{ aspectRatio: '7.32 / 2.44' }}>
              {/* Fond filet */}
              <div
                ref={containerRef}
                onClick={handleClick}
                className="absolute inset-0 cursor-crosshair"
                style={{
                  background: 'linear-gradient(135deg, #1a2a3a 25%, transparent 25%) -10px 0, linear-gradient(225deg, #1a2a3a 25%, transparent 25%) -10px 0, linear-gradient(315deg, #1a2a3a 25%, transparent 25%), linear-gradient(45deg, #1a2a3a 25%, transparent 25%)',
                  backgroundSize: '20px 20px',
                  backgroundColor: '#0f1a2a',
                }}
              >
                {/* Grille visuelle 3x3 */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-white/10 hover:bg-white/10 transition-colors"
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Ligne de sol */}
            <div className="h-2 bg-green-800 rounded-b-sm" />
          </div>

          <p className="text-center text-[11px] text-gray-600 mt-3">
            Cliquez dans le but pour indiquer la zone de frappe
          </p>
        </div>
      </div>
    </div>
  );
}
