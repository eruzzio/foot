import { useState } from 'react';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  photo_url?: string;
}

interface FormationPosition {
  id: string;
  player_id: string | null;
  position_x: number;
  position_y: number;
  role: string;
}

interface FieldVisualizationProps {
  players: Player[];
  positions: FormationPosition[];
  onPositionClick: (positionId: string, currentPlayerId: string | null) => void;
  onAssignPlayer: (positionId: string, playerId: string) => void;
}

export default function FieldVisualization({ players, positions, onPositionClick, onAssignPlayer }: FieldVisualizationProps) {
  const [selectingForPosition, setSelectingForPosition] = useState<string | null>(null);
  const getPlayerForPosition = (playerId: string | null) => {
    if (!playerId) return null;
    return players.find(p => p.id === playerId);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GK': return 'bg-yellow-500';
      case 'DF': return 'bg-blue-500';
      case 'MF': return 'bg-green-500';
      case 'FW': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const availablePlayers = players.filter(p => !positions.find(pos => pos.player_id === p.id));

  const handlePositionClick = (positionId: string, currentPlayerId: string | null) => {
    if (currentPlayerId) {
      onPositionClick(positionId, currentPlayerId);
    } else {
      setSelectingForPosition(positionId);
    }
  };

  const handleSelectPlayer = (positionId: string, playerId: string) => {
    onAssignPlayer(positionId, playerId);
    setSelectingForPosition(null);
  };

  return (
    <div className="relative w-3/4 mx-auto bg-gradient-to-b from-green-600 to-green-700 rounded-lg shadow-xl overflow-hidden" style={{ paddingBottom: '52%' }}>
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140" preserveAspectRatio="none">
          <defs>
            <pattern id="grass" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>

          <rect width="100" height="140" fill="url(#grass)" />

          <line x1="0" y1="70" x2="100" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />

          <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <circle cx="50" cy="70" r="0.5" fill="rgba(255,255,255,0.4)" />

          <rect x="35" y="0" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="42" y="0" width="16" height="3" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />

          <rect x="35" y="134" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <rect x="42" y="137" width="16" height="3" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />

          <path d="M 50 6 A 10 10 0 0 0 35 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 50 6 A 10 10 0 0 1 65 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />

          <path d="M 50 134 A 10 10 0 0 1 35 130" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
          <path d="M 50 134 A 10 10 0 0 0 65 130" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
        </svg>

        {positions.map((pos) => {
          const player = getPlayerForPosition(pos.player_id);
          const isSelecting = selectingForPosition === pos.id;

          return (
            <div
              key={pos.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2`}
              style={{
                left: `${pos.position_x}%`,
                top: `${pos.position_y}%`,
              }}
            >
              {isSelecting && !player ? (
                <div className="flex flex-col items-center gap-2" style={{ minWidth: '200px' }}>
                  <select
                    autoFocus
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSelectPlayer(pos.id, e.target.value);
                      }
                    }}
                    onBlur={() => setSelectingForPosition(null)}
                    className="w-full px-2 py-1.5 border-2 border-blue-500 bg-white rounded-lg shadow-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choisir...
                    </option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.number} - {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <button
                  onClick={() => handlePositionClick(pos.id, pos.player_id)}
                  className="transition-all hover:scale-110 cursor-pointer flex flex-col items-center"
                >
                  <div
                    className={`relative ${getRoleColor(pos.role)} rounded-full shadow-lg border-2 border-white overflow-hidden`}
                    style={{ width: '44px', height: '44px' }}
                  >
                    {player ? (
                      player.photo_url ? (
                        <div className="relative w-full h-full">
                          <img
                            src={player.photo_url}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-0.5">
                            <span className="text-white font-bold text-xs drop-shadow-lg leading-none">{player.number}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-white font-bold gap-0.5">
                          <span className="text-sm leading-none">{player.number}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full text-white text-2xl font-light opacity-60">
                        +
                      </div>
                    )}
                  </div>
                  {player ? (
                    <span
                      className="mt-1 text-white font-semibold leading-tight text-center whitespace-nowrap"
                      style={{ fontSize: '9px', textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)' }}
                    >
                      {player.first_name}
                    </span>
                  ) : (
                    <span
                      className="mt-1 text-white/70 leading-tight text-center"
                      style={{ fontSize: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {pos.role}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
