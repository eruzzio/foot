import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Upload, Users, Timer } from 'lucide-react';

interface MatchTimerProps {
  onTimeUpdate: (seconds: number) => void;
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  currentTime: number;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  selectedTeam: 'A' | 'B';
  onScoreChange: (team: 'A' | 'B', increment: number) => void;
  onSelectTeam: (team: 'A' | 'B') => void;
  onOpenFormation: (team: 'A' | 'B') => void;
  teamAColor?: string;
  teamALogoUrl?: string;
  halftimes: number[];
  onHalftime: () => void;
}

export default function MatchTimer({
  onTimeUpdate,
  isRunning,
  onToggle,
  onReset,
  currentTime,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  selectedTeam,
  onScoreChange,
  onSelectTeam,
  onOpenFormation,
  teamAColor = '#22c55e',
  teamALogoUrl = '',
  halftimes,
  onHalftime,
}: MatchTimerProps) {
  const [logoA, setLogoA] = useState<string | null>(teamALogoUrl || null);
  const [logoB, setLogoB] = useState<string | null>(null);
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (teamALogoUrl && !logoA) {
      setLogoA(teamALogoUrl);
    }
  }, [teamALogoUrl, logoA]);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = setInterval(() => {
        onTimeUpdate(currentTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentTime, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '34, 197, 94';
  };

  const handleLogoUpload = (team: 'A' | 'B', file: File) => {
    const url = URL.createObjectURL(file);
    if (team === 'A') setLogoA(url);
    else setLogoB(url);
  };

  const LogoSlot = ({ team, logo, inputRef }: { team: 'A' | 'B'; logo: string | null; inputRef: React.RefObject<HTMLInputElement> }) => (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:opacity-80 ${
          logo ? '' : 'bg-dark-tertiary border-dashed'
        }`}
        style={team === 'A' ? { borderColor: teamAColor } : { borderColor: '#f97316' }}
        onClick={() => inputRef.current?.click()}
        title="Cliquer pour changer le logo"
      >
        {logo ? (
          <img src={logo} alt={`Logo ${team === 'A' ? teamAName : teamBName}`} className="w-full h-full object-cover" />
        ) : (
          <Upload size={20} className="text-gray-500" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLogoUpload(team, file);
          e.target.value = '';
        }}
      />
    </div>
  );

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-xl shadow-2xl p-6 text-white">
      <div className="flex items-stretch gap-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          <LogoSlot team="A" logo={logoA} inputRef={inputARef} />
          <div
            className="text-xs font-medium truncate max-w-[80px] text-center"
            style={{ color: selectedTeam === 'A' ? teamAColor : '#9ca3af' }}
          >
            {teamAName}
          </div>
          <div
            className="text-5xl font-bold font-mono leading-none"
            style={{ color: selectedTeam === 'A' ? teamAColor : '#6b7280' }}
          >
            {teamAScore}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <button
              onClick={() => onScoreChange('A', 1)}
              className="px-3 py-1 text-white rounded-lg text-xs font-bold transition-colors"
              style={{ backgroundColor: teamAColor }}
            >
              But
            </button>
            <button
              onClick={() => onScoreChange('A', -1)}
              className="px-3 py-1 bg-dark-tertiary hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-colors"
            >
              Annulé
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 py-1">
          <div className={`text-5xl font-bold font-mono tracking-wider ${isRunning ? 'text-white' : 'text-gray-400'}`}>
            {formatTime(currentTime)}
          </div>

          <div className="text-gray-600 text-2xl font-bold">-</div>

          <div className="flex gap-2">
            <button
              onClick={onToggle}
              className={`p-2.5 rounded-lg transition-colors ${
                isRunning
                  ? 'bg-orange-primary hover-orange text-white'
                  : 'text-white'
              }`}
              style={!isRunning ? { backgroundColor: teamAColor } : undefined}
              title={isRunning ? 'Pause' : 'Lancer'}
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={onReset}
              className="p-2.5 rounded-lg bg-dark-tertiary hover:bg-gray-700 text-gray-300 transition-colors"
              title="Remettre à zéro"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {halftimes.length < 2 ? (
            <button
              onClick={onHalftime}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                halftimes.length === 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={halftimes.length === 0 ? 'Marquer la fin de la 1ère mi-temps' : 'Marquer le début de la 2ème mi-temps'}
            >
              <Timer size={13} />
              {halftimes.length === 0 ? 'Mi-temps' : '2ème MT'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-800/40">
              <Timer size={13} />
              <span>MT {formatTime(halftimes[0])} / {formatTime(halftimes[1])}</span>
            </div>
          )}

          <div className="text-xs text-gray-500">
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                En direct
              </span>
            ) : (
              <span>En pause</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <LogoSlot team="B" logo={logoB} inputRef={inputBRef} />
          <div className={`text-xs font-medium truncate max-w-[80px] text-center ${selectedTeam === 'B' ? 'text-orange-400' : 'text-gray-400'}`}>
            {teamBName}
          </div>
          <div className={`text-5xl font-bold font-mono leading-none ${selectedTeam === 'B' ? 'text-orange-400' : 'text-gray-500'}`}>
            {teamBScore}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <button
              onClick={() => onScoreChange('B', 1)}
              className="px-3 py-1 bg-orange-primary hover-orange text-white rounded-lg text-xs font-bold transition-colors"
            >
              But
            </button>
            <button
              onClick={() => onScoreChange('B', -1)}
              className="px-3 py-1 bg-dark-tertiary hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-colors"
            >
              Annulé
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="flex-1 space-y-2">
          <button
            onClick={() => onSelectTeam('A')}
            className={`w-full py-2.5 rounded-lg font-semibold transition-colors text-sm ${
              selectedTeam === 'A' ? 'text-white' : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700'
            }`}
            style={selectedTeam === 'A' ? { backgroundColor: teamAColor } : undefined}
          >
            {teamAName}
          </button>
          <button
            onClick={() => onOpenFormation('A')}
            className="w-full py-1.5 rounded-lg hover:opacity-80 transition-opacity text-xs font-medium flex items-center justify-center gap-1"
            style={{ backgroundColor: `rgba(${hexToRgb(teamAColor)}, 0.15)`, color: teamAColor }}
          >
            <Users size={13} />
            Composition
          </button>
        </div>
        <div className="flex-1 space-y-2">
          <button
            onClick={() => onSelectTeam('B')}
            className={`w-full py-2.5 rounded-lg font-semibold transition-colors text-sm ${
              selectedTeam === 'B'
                ? 'bg-orange-primary text-white'
                : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700'
            }`}
          >
            {teamBName}
          </button>
          <button
            onClick={() => onOpenFormation('B')}
            className="w-full py-1.5 bg-orange-900/30 text-orange-400 rounded-lg hover:bg-orange-900/50 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          >
            <Users size={13} />
            Composition
          </button>
        </div>
      </div>
    </div>
  );
}
