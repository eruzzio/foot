import { useState } from 'react';
import { ExternalLink, Copy, CheckCircle, Video, Clock, ChevronRight, Filter } from 'lucide-react';
import { Match, MatchEventWithDetails } from '../types/database';
import { buildVeoTimestampUrl } from '../utils/veoParser';

interface VideoAnalysisTabProps {
  match: Match & { events: MatchEventWithDetails[] };
  teamAName: string;
  teamBName: string;
}

export default function VideoAnalysisTab({ match, teamAName, teamBName }: VideoAnalysisTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState<'all' | 'A' | 'B'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const hasVideo = !!match.video_url;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const buildVeoLink = (event: MatchEventWithDetails): string => {
    if (!match.video_url) return '';
    // Utiliser le video_timestamp synchronisé si disponible, sinon le timestamp ORION
    const ts = event.video_timestamp != null ? event.video_timestamp : event.timestamp;
    return buildVeoTimestampUrl(match.video_url, ts);
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleOpenVeo = (url: string) => {
    window.open(url, '_blank');
  };

  const eventTypes = Array.from(new Set(
    match.events
      .map(e => e.event_type?.name || e.label)
      .filter(Boolean)
  )) as string[];

  const filteredEvents = match.events
    .filter(e => filterTeam === 'all' || e.team === filterTeam)
    .filter(e => filterType === 'all' || (e.event_type?.name || e.label) === filterType)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-yellow-900/30 border border-yellow-800/50 rounded-full flex items-center justify-center mb-6">
          <Video size={28} className="text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Aucune vidéo synchronisée</h3>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          Pour accéder à l&apos;analyse vidéo, synchronisez ce match avec votre vidéo VEO depuis l&apos;onglet &quot;Post Match&quot;.
        </p>
        <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 max-w-sm text-left space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Comment faire</p>
          {['Aller dans l\'onglet "Post Match"', 'Coller votre lien VEO', 'Saisir le timecode du coup d\'envoi', 'Cliquer sur "Synchroniser"'].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-sm text-gray-300">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Bandeau VEO synchronisé */}
      <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
            <Video size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-300">VEO synchronisé</p>
            <p className="text-xs text-yellow-600 truncate max-w-xs">{match.video_url}</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenVeo(match.video_url!)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Ouvrir VEO
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={14} />
          <span className="text-xs uppercase tracking-wide">Filtres</span>
        </div>
        <div className="flex gap-2">
          {(['all', 'A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterTeam(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTeam === t
                  ? 'bg-yellow-600 text-white'
                  : 'bg-dark-secondary border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Toutes les équipes' : t === 'A' ? teamAName : teamBName}
            </button>
          ))}
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-dark-secondary border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-yellow-600"
        >
          <option value="all">Tous les événements</option>
          {eventTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-auto">
          {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline vidéo */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Aucun événement pour ces filtres
          </div>
        ) : (
          filteredEvents.map(event => {
            const veoLink = buildVeoLink(event);
            const hasLink = !!veoLink;
            const videoTs = event.video_timestamp;

            return (
              <div
                key={event.id}
                className="bg-dark-secondary border border-gray-800 rounded-xl p-4 hover:border-yellow-800/50 transition-colors group"
              >
                <div className="flex items-center gap-4">

                  {/* Timecode ORION */}
                  <div className="flex flex-col items-center min-w-[52px]">
                    <span className="font-mono text-sm font-bold text-white">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-[10px] text-gray-600">ORION</span>
                  </div>

                  {/* Séparateur */}
                  <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />

                  {/* Timecode VEO */}
                  {videoTs != null ? (
                    <div className="flex flex-col items-center min-w-[52px]">
                      <span className="font-mono text-sm font-bold text-yellow-400">
                        {formatTime(videoTs)}
                      </span>
                      <span className="text-[10px] text-yellow-700">VEO</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center min-w-[52px]">
                      <span className="font-mono text-sm text-gray-600">--:--</span>
                      <span className="text-[10px] text-gray-700">VEO</span>
                    </div>
                  )}

                  {/* Dot couleur */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.event_type?.color || '#6B7280' }}
                  />

                  {/* Infos événement */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">
                        {event.event_type?.name
                          ? event.label && event.label !== event.event_type.name
                            ? `${event.event_type.name} › ${event.label}`
                            : event.event_type.name
                          : event.label || 'Événement'}
                      </span>
                      {event.outcome === 'success' && (
                        <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-800/40 px-1.5 py-0.5 rounded">OK</span>
                      )}
                      {event.outcome === 'failure' && (
                        <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-800/40 px-1.5 py-0.5 rounded">Raté</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {event.team === 'A' ? teamAName : teamBName}
                      </span>
                      {event.player && (
                        <span className="text-xs text-gray-600">
                          · #{event.player.number} {event.player.name}
                        </span>
                      )}
                      {event.keywords && event.keywords.length > 0 && (
                        <span className="text-xs text-blue-400">
                          · {event.keywords.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasLink && (
                      <>
                        <button
                          onClick={() => handleCopy(veoLink, event.id)}
                          className="p-2 rounded-lg bg-dark-tertiary hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title="Copier le lien VEO"
                        >
                          {copiedId === event.id
                            ? <CheckCircle size={16} className="text-green-400" />
                            : <Copy size={16} />
                          }
                        </button>
                        <button
                          onClick={() => handleOpenVeo(veoLink)}
                          className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-medium transition-colors"
                          title="Voir sur VEO"
                        >
                          <Clock size={13} />
                          Voir
                          <ExternalLink size={12} />
                        </button>
                      </>
                    )}
                    {!hasLink && (
                      <span className="text-xs text-gray-600 italic">Non synchronisé</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Note de bas de page */}
      <div className="bg-dark-secondary border border-gray-800 rounded-xl p-4 text-xs text-gray-500 flex items-start gap-3">
        <ExternalLink size={14} className="flex-shrink-0 mt-0.5 text-gray-600" />
        <p>
          Chaque bouton &quot;Voir&quot; ouvre VEO directement au bon moment du match dans un nouvel onglet.
          Le bouton copier vous permet de partager le lien exact avec vos joueurs ou votre staff via WhatsApp.
        </p>
      </div>
    </div>
  );
}
