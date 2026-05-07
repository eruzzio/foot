import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, Copy, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';
import { parseVEOUrl, buildVeoTimestampUrl } from '../utils/veoParser';

interface PostMatchTabProps {
  match: Match & { events?: MatchEventWithDetails[] };
  onMatchUpdate: (updatedMatch: Match) => void;
}

export default function PostMatchTab({ match, onMatchUpdate }: PostMatchTabProps) {
  const [videoUrl, setVideoUrl] = useState(match.video_url || '');
  const [videoUrlError, setVideoUrlError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [selectedEventTimestamp, setSelectedEventTimestamp] = useState<number | null>(null);

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setVideoUrl(url);

    if (url) {
      const veoInfo = parseVEOUrl(url);
      if (veoInfo.isValid) {
        setVideoUrlError('');
      } else {
        setVideoUrlError(veoInfo.errorMessage || 'URL invalide');
      }
    } else {
      setVideoUrlError('');
    }
  };

  const handleSaveVideoUrl = async () => {
    if (!videoUrl.trim()) {
      setVideoUrlError('Veuillez entrer une URL vidéo');
      return;
    }

    const veoInfo = parseVEOUrl(videoUrl);
    if (!veoInfo.isValid) {
      setVideoUrlError(veoInfo.errorMessage || 'URL invalide');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    const { error } = await supabase
      .from('matches')
      .update({
        video_url: veoInfo.videoUrl,
        video_provider: veoInfo.provider,
        video_share_id: veoInfo.shareId,
      })
      .eq('id', match.id);

    if (error) {
      setVideoUrlError('Erreur lors de la sauvegarde : ' + error.message);
    } else {
      setSuccessMessage('Vidéo VEO ajoutée avec succès !');
      setVideoUrlError('');
      onMatchUpdate({
        ...match,
        video_url: veoInfo.videoUrl,
        video_provider: veoInfo.provider,
        video_share_id: veoInfo.shareId,
      });
    }

    setIsLoading(false);
  };

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleRemoveVideo = async () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemoveVideo = async () => {
    setShowRemoveConfirm(false);
    setIsLoading(true);

    const { error } = await supabase
      .from('matches')
      .update({
        video_url: null,
        video_provider: null,
        video_share_id: null,
        video_duration: null,
      })
      .eq('id', match.id);

    if (error) {
      setVideoUrlError('Erreur lors de la suppression : ' + error.message);
    } else {
      setVideoUrl('');
      setVideoUrlError('');
      setSuccessMessage('Lien vidéo supprimé');
      onMatchUpdate({
        ...match,
        video_url: null,
        video_provider: null,
        video_share_id: null,
        video_duration: null,
      });
    }

    setIsLoading(false);
  };

  const handleCopyLink = async (url: string, eventId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(eventId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div style={{ background:"var(--orion-surface)", border:"1px solid var(--orion-line)" }}>
      <div className="space-y-6">
        <div>
          <h3 style={{ fontSize:14, fontWeight:600, color:"var(--orion-text)", marginBottom:12 }}>
            Ajouter une vidéo VEO
          </h3>
          <p style={{ fontSize:12, color:"var(--orion-text-mute)", marginBottom:12 }}>
            Collez le lien de votre vidéo VEO pour synchroniser les événements
            du match avec la vidéo. Vous pourrez ensuite partager les
            événements avec les timestamps correspondants.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Lien vidéo VEO
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={handleVideoUrlChange}
              placeholder="https://veo.co/shared-videos/..."
              disabled={isLoading}
              className={`flex-1 px-4 py-2 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                videoUrlError
                  ? 'border-red-300 focus:ring-red-400'
                  : match.video_share_id && videoUrl
                    ? 'border-green-300 focus:ring-green-400'
                    : 'border-gray-700 focus:ring-blue-400'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
            />
            <button
              onClick={handleSaveVideoUrl}
              disabled={isLoading || !videoUrl.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>

          {videoUrlError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{videoUrlError}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {match.video_share_id && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    Vidéo synchronisée
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Cette vidéo VEO est liée à ce match. La vidéo est
                    automatiquement extraite et jouable ci-dessous avec les
                    timestamps des événements.
                  </p>
                </div>
                <button
                  onClick={handleRemoveVideo}
                  disabled={isLoading}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h4 className="text-white font-medium mb-4">Accès à la vidéo</h4>
              <a
                href={match.video_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold transition-colors"
              >
                Ouvrir le match sur VEO
              </a>
              <p className="text-xs text-gray-500 mt-3 text-center">
                La vidéo s&apos;ouvrira dans VEO. Utilisez l&apos;onglet &quot;Analyse Vidéo&quot; pour naviguer directement vers chaque action.
              </p>
            </div>

            {match.events && match.events.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                  <LinkIcon size={18} />
                  Liens VEO avec timestamps
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {match.events.map((event) => {
                    const veoLink = buildVeoTimestampUrl(
                      match.video_url || '',
                      event.video_timestamp != null ? event.video_timestamp : event.timestamp
                    );
                    const mins = Math.floor(event.timestamp / 60);
                    const secs = event.timestamp % 60;
                    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

                    return (
                      <div
                        key={event.id}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"10px 12px", background:"var(--orion-surface-2)", border:"1px solid var(--orion-line)", cursor:"pointer" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-gray-400 mb-1">
                            {timeStr}
                          </div>
                          <div className="text-sm text-white truncate">
                            {event.event_type?.name || event.label || 'Événement'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            Équipe {event.team}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex gap-2">
                          <button
                            onClick={() => setSelectedEventTimestamp(event.timestamp)}
                            className="px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-all font-medium text-sm"
                            title="Lancer la vidéo à ce timestamp"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => handleCopyLink(veoLink, event.id)}
                            className={`px-3 py-2 rounded-lg transition-all font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                              copiedLinkId === event.id
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            <Copy size={16} />
                            {copiedLinkId === event.id ? 'Copié!' : 'Copier'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3">
            Comment ça marche ?
          </h4>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Collez votre lien de partage VEO ci-dessus</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Le système valide et synchronise automatiquement</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>
                Cliquez sur l'icône de partage d'un événement pour obtenir un
                lien VEO avec timestamp
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>
                Le destinataire ouvrira directement la vidéo à cet instant
              </span>
            </li>
          </ol>
        </div>
      </div>

      {showRemoveConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,7,10,0.85)', backdropFilter:'blur(4px)', display:'grid', placeItems:'center', zIndex:200 }}>
          <div style={{ width:'min(340px, 92vw)', background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', padding:'24px' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--orion-text)', marginBottom:8 }}>Supprimer le lien vidéo ?</div>
            <div style={{ fontSize:12, color:'var(--orion-text-mute)', marginBottom:20 }}>Cette action est irréversible.</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowRemoveConfirm(false)} className="o-btn o-btn--ghost" style={{ flex:1, justifyContent:'center' }}>Annuler</button>
              <button onClick={confirmRemoveVideo} className="o-btn" style={{ flex:1, justifyContent:'center', borderColor:'var(--orion-red)', color:'var(--orion-red)' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
