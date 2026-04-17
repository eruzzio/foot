import { useEffect, useState } from 'react';
import { Loader, AlertCircle, Play } from 'lucide-react';
import { extractVEOVideoUrl, VEOVideoResponse } from '../utils/veoVideoExtractor';

interface VEOVideoPlayerProps {
  shareId: string;
  timestamp?: number;
  title?: string;
}

export default function VEOVideoPlayer({
  shareId,
  timestamp,
  title = 'VEO Video',
}: VEOVideoPlayerProps) {
  const [videoData, setVideoData] = useState<VEOVideoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      const result = await extractVEOVideoUrl(shareId, timestamp);

      if (result.error) {
        setError(result.error);
        setVideoData(null);
      } else {
        setVideoData(result);
      }

      setLoading(false);
    };

    loadVideo();
  }, [shareId, timestamp]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center gap-3">
        <Loader size={20} className="animate-spin text-orange-primary" />
        <span className="text-gray-300">Extraction de la vidéo...</span>
      </div>
    );
  }

  if (error || !videoData?.url) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 mb-1">Erreur d'extraction vidéo</h4>
            <p className="text-sm text-red-800 mb-2">
              {error ||
                'Impossible de charger la vidéo. Vérifiez que le lien VEO est valide et accessible.'}
            </p>
            <p className="text-xs text-red-700 mb-2">
              ID de partage: <code className="bg-red-100 px-2 py-1 rounded">{shareId}</code>
            </p>
            <details className="text-xs text-red-700">
              <summary className="cursor-pointer hover:underline">
                Dépannage
              </summary>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Vérifiez que le lien VEO est public</li>
                <li>Assurez-vous que la vidéo n'a pas été supprimée</li>
                <li>Essayez un lien VEO différent</li>
                <li>Le serveur VEO peut être indisponible temporairement</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    );
  }

  const videoUrl = videoData.url;
  const startTime = timestamp ? Math.max(0, timestamp) : 0;

  return (
    <div className="space-y-3">
      {!showPlayer ? (
        <button
          onClick={() => setShowPlayer(true)}
          className="w-full bg-gradient-to-r from-orange-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 group"
        >
          <Play size={20} className="group-hover:scale-110 transition-transform" />
          Lancer la vidéo
          {startTime > 0 && (
            <span className="text-sm opacity-90">
              (à {Math.floor(startTime / 60)}:
              {(startTime % 60).toString().padStart(2, '0')})
            </span>
          )}
        </button>
      ) : (
        <div className="bg-black rounded-lg overflow-hidden">
          {videoData.type === 'hls' ? (
            <div className="relative w-full aspect-video">
              <video
                key={videoUrl}
                controls
                autoPlay
                className="w-full h-full"
                onLoadedMetadata={(e) => {
                  if (startTime > 0) {
                    (e.target as HTMLVideoElement).currentTime = startTime;
                  }
                }}
              >
                <source src={videoUrl} type="application/x-mpegURL" />
                Votre navigateur ne supporte pas HLS.
              </video>
            </div>
          ) : (
            <video
              key={videoUrl}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
              onLoadedMetadata={(e) => {
                if (startTime > 0) {
                  (e.target as HTMLVideoElement).currentTime = startTime;
                }
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              Votre navigateur ne supporte pas les vidéos MP4.
            </video>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>Format: {videoData.type.toUpperCase()}</p>
        {startTime > 0 && (
          <p>
            Début: {Math.floor(startTime / 60)}:
            {(startTime % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  );
}
