import { Trash2, CheckCircle, XCircle, MinusCircle, Tag, Share2 } from 'lucide-react';
import { useState } from 'react';
import { MatchEventWithDetails, Match } from '../types/database';
import TimelineShareModal from './TimelineShareModal';

interface TimelineProps {
  events: MatchEventWithDetails[];
  match?: Match;
  onDeleteEvent?: (eventId: string) => void;
  teamAName?: string;
  teamBName?: string;
}

export default function Timeline({ events, match, onDeleteEvent, teamAName = 'Éq. A', teamBName = 'Éq. B' }: TimelineProps) {
  const [shareEvent, setShareEvent] = useState<MatchEventWithDetails | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failure':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <MinusCircle size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl p-6 text-white">
      <h3 className="text-lg font-semibold text-white mb-4">Timeline des événements</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Aucun événement enregistré</p>
        ) : (
          events
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((event) => (
              <div
                key={event.id}
                className="p-3 bg-dark-tertiary rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-sm font-semibold text-gray-400 w-12 flex-shrink-0">
                      {formatTime(event.timestamp)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.event_type?.color || '#6B7280' }}
                    />
                    <span className="font-medium text-white truncate">
                      {event.event_type?.name
                        ? event.label && event.label !== event.event_type.name
                          ? `${event.event_type.name} › ${event.label}`
                          : event.event_type.name
                        : event.label || 'Événement'}
                    </span>
                    <span className="text-sm text-gray-400 flex-shrink-0">
                      {event.team === 'A' ? teamAName : teamBName}
                    </span>
                    {event.event_type?.has_outcome && getOutcomeIcon(event.outcome)}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {match && (
                      <button
                        onClick={() => setShareEvent(event)}
                        className="p-1 text-gray-600 hover:text-orange-primary transition-colors flex-shrink-0"
                        title="Partager la timeline"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                    {onDeleteEvent && (
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {event.keywords && event.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pl-15">
                    {event.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-300 border border-blue-800/50"
                      >
                        <Tag size={8} />
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
        )}
      </div>
      {shareEvent && match && (
        <TimelineShareModal
          event={shareEvent}
          match={match}
          onClose={() => setShareEvent(null)}
        />
      )}
    </div>
  );
}
