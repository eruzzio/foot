export interface VEOVideoResponse {
  url: string;
  type: 'mp4' | 'hls' | 'jwplayer' | 'generic' | 'unknown';
  shareId?: string;
  timestamp?: number;
  error?: string;
  debug?: string;
}

export async function extractVEOVideoUrl(
  shareId: string,
  timestamp?: number
): Promise<VEOVideoResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return {
        url: '',
        type: 'mp4',
        error: 'Missing Supabase configuration',
      };
    }

    const params = new URLSearchParams({
      shareId,
      ...(timestamp && { timestamp: timestamp.toString() }),
    });

    const response = await fetch(
      `${supabaseUrl}/functions/v1/veo-video-proxy?${params}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `HTTP ${response.status}`;
      const debugMsg = errorData.debug || '';
      return {
        url: '',
        type: 'unknown',
        error: `${errorMsg}${debugMsg ? ' - ' + debugMsg : ''}`,
        debug: debugMsg,
      };
    }

    const data = await response.json();
    if (data.error) {
      return {
        url: '',
        type: 'unknown',
        error: data.error,
        debug: data.debug,
      };
    }
    return data;
  } catch (error) {
    return {
      url: '',
      type: 'unknown',
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération de la vidéo',
    };
  }
}
