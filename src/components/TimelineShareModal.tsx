import { useState } from 'react';
import { X, Copy, Download, Share2 } from 'lucide-react';
import { MatchEventWithDetails, Match } from '../types/database';
import { generateTimelineLinks, generateEventDescription, formatTime, generateTimelineCSV, generateTimelineMarkdown } from '../utils/timelineLink';

interface TimelineShareModalProps {
  event: MatchEventWithDetails;
  match: Match;
  onClose: () => void;
}

export default function TimelineShareModal({ event, match, onClose }: TimelineShareModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'generic' | 'hudl' | 'dartfish' | 'once' | 'veo'>(() => {
    return match.video_share_id ? 'veo' : 'generic';
  });
  const [copied, setCopied] = useState(false);

  const links = generateTimelineLinks(event, match);
  const selectedLink = links.find(l => l.format === selectedFormat);

  const handleCopy = async () => {
    if (selectedLink) {
      await navigator.clipboard.writeText(selectedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateTimelineCSV([event], match);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timeline-${formatTime(event.timestamp)}.csv`);
    link.click();
  };

  const handleDownloadMarkdown = () => {
    const markdown = generateTimelineMarkdown([event], match);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timeline-${formatTime(event.timestamp)}.md`);
    link.click();
  };

  const formatDescriptions = {
    generic: 'Lien universel avec paramètres',
    hudl: 'Format compatible Hudl',
    dartfish: 'Format compatible Dartfish',
    once: 'Format compatible Once Sports',
    veo: 'Lien direct vers VEO avec timestamp',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-secondary border border-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Share2 size={24} className="text-orange-primary" />
            <h2 className="text-2xl font-bold text-white">Partager la timeline</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-tertiary rounded transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Événement</h3>
            <p className="text-white font-medium">{generateEventDescription(event)}</p>
            <p className="text-orange-primary font-mono text-lg mt-2">{formatTime(event.timestamp)}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Format de lien</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['generic', 'hudl', 'dartfish', 'once', ...(match.video_share_id ? (['veo'] as const) : [])] as const).map(format => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedFormat === format
                      ? 'border-orange-primary bg-orange-primary/10'
                      : 'border-gray-700 bg-dark-tertiary hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-white capitalize">{format}</div>
                  <div className="text-xs text-gray-400 mt-1">{formatDescriptions[format]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Lien</h3>
            <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 text-xs font-mono break-all">{selectedLink?.url}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full bg-orange-primary hover:bg-orange-primary/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={18} />
              {copied ? 'Copié!' : 'Copier le lien'}
            </button>
          </div>

          <div className="border-t border-gray-800 pt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Exporter</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadCSV}
                className="bg-dark-tertiary hover:bg-dark-tertiary/80 border border-gray-700 hover:border-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                CSV
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="bg-dark-tertiary hover:bg-dark-tertiary/80 border border-gray-700 hover:border-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Markdown
              </button>
            </div>
          </div>

          <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Informations de lien</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>Match: {match.team_a_name} vs {match.team_b_name}</li>
              <li>Équipe: {event.team}</li>
              <li>Heure: {formatTime(event.timestamp)}</li>
              {event.player && <li>Joueur: {event.player.name || `#${event.player.number}`}</li>}
              {event.event_type && <li>Type: {event.event_type.name}</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
