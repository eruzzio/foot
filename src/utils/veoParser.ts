export interface VEOVideoInfo {
  shareId: string;
  provider: 'veo';
  videoUrl: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface VEOTimestampLink {
  url: string;
  timestamp: number;
  timeString: string;
}

export function parseVEOUrl(url: string): VEOVideoInfo {
  if (!url || typeof url !== 'string') {
    return { shareId: '', provider: 'veo', videoUrl: url || '', isValid: false, errorMessage: 'URL invalide' };
  }

  const trimmedUrl = url.trim().replace(/\/$/, ''); // Supprimer le slash final

  try {
    const urlObj = new URL(trimmedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('veo.co')) {
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);

      if (pathParts.length === 0) {
        return { shareId: '', provider: 'veo', videoUrl: trimmedUrl, isValid: false, errorMessage: 'URL VEO invalide' };
      }

      const shareId = pathParts[pathParts.length - 1];

      if (!shareId || shareId.length < 5) {
        return { shareId: '', provider: 'veo', videoUrl: trimmedUrl, isValid: false, errorMessage: 'ID de partage VEO trop court' };
      }

      // Conserver l'URL originale telle quelle (app.veo.co ou veo.co)
      return {
        shareId,
        provider: 'veo',
        videoUrl: trimmedUrl,
        isValid: true,
      };
    }

    return { shareId: '', provider: 'veo', videoUrl: trimmedUrl, isValid: false, errorMessage: 'URL doit être un lien VEO (veo.co)' };
  } catch {
    return { shareId: '', provider: 'veo', videoUrl: trimmedUrl, isValid: false, errorMessage: "Format d'URL invalide" };
  }
}

// Génère un lien VEO avec timestamp en respectant le format original de l'URL
export function generateVEOTimestampLink(shareIdOrUrl: string, timestamp: number): VEOTimestampLink {
  const timeString = formatTimeForVEO(timestamp);

  // Si c'est une URL complète, on l'utilise directement
  let baseUrl = shareIdOrUrl;
  if (!shareIdOrUrl.startsWith('http')) {
    // C'est un shareId ancien format — construire l'URL
    baseUrl = `https://app.veo.co/matches/${shareIdOrUrl}`;
  }

  // Supprimer le slash final et les params existants
  const cleanBase = baseUrl.replace(/\/$/, '').split('?')[0];
  const url = `${cleanBase}?t=${timestamp}`;

  return { url, timestamp, timeString };
}

export function buildVeoTimestampUrl(videoUrl: string, timestamp: number): string {
  if (!videoUrl) return '';
  const cleanBase = videoUrl.replace(/\/$/, '').split('?')[0];
  return `${cleanBase}?t=${timestamp}`;
}

export function formatTimeForVEO(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function isVEOUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url.trim());
    return urlObj.hostname.toLowerCase().includes('veo.co');
  } catch {
    return false;
  }
}

export function extractVEOShareId(url: string): string | null {
  const veoInfo = parseVEOUrl(url);
  return veoInfo.isValid ? veoInfo.shareId : null;
}

