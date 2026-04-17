import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    let shareId = url.searchParams.get("shareId");
    const matchId = url.searchParams.get("matchId");
    const timestamp = url.searchParams.get("timestamp");

    if (!shareId && !matchId) {
      return new Response(
        JSON.stringify({ error: "Missing shareId or matchId parameter" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let veoUrl: string;
    if (shareId) {
      veoUrl = `https://veo.co/shared-videos/${shareId}`;
    } else {
      veoUrl = `https://app.veo.co/matches/${matchId}/`;
    }

    const response = await fetch(veoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://veo.co/',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "VEO video not found", status: response.status }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const html = await response.text();

    let videoUrl: string | null = null;
    let videoType: string = "unknown";

    const patterns = [
      { regex: /https:\/\/[^\s"'\\]*\.mp4(?:[^\s"'\\]*)?/gi, type: 'mp4' },
      { regex: /"videoUrl"\s*:\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /"url"\s*:\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /"src"\s*:\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /"file"\s*:\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /"sources?"\s*:\s*\[?\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /playbackUrl['"]\s*:\s*['"]([^'"]*\.mp4[^'"]*)['"]?/gi, type: 'mp4' },
      { regex: /"playback_url"\s*:\s*"(https:\/\/[^"\\]*\.mp4[^"\\]*)"/gi, type: 'mp4' },
      { regex: /<video[^>]*src=['"]([^'"]*\.mp4[^'"]*)['"]?/gi, type: 'mp4' },
      { regex: /<source[^>]*src=['"]([^'"]*\.mp4[^'"]*)['"]?/gi, type: 'mp4' },
      { regex: /https:\/\/[^\s"'\\]*\.m3u8(?:[^\s"'\\]*)?/gi, type: 'hls' },
      { regex: /"url"\s*:\s*"(https:\/\/[^"\\]*\.m3u8[^"\\]*)"/gi, type: 'hls' },
      { regex: /"src"\s*:\s*"(https:\/\/[^"\\]*\.m3u8[^"\\]*)"/gi, type: 'hls' },
      { regex: /https:\/\/(?:veo-media|veo\.co|cdn)[^\s"'<>\\]*\.(mp4|m3u8)/gi, type: 'unknown' },
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern.regex);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          let url = match;
          if (match.includes('"') || match.includes("'")) {
            const parts = match.split(/["']/);
            url = parts.find(p => p.startsWith('http')) || parts[parts.length - 1];
          }
          if (url.startsWith('http') && (url.includes('.mp4') || url.includes('.m3u8'))) {
            url = url.replace(/[\\]/g, '');
            videoUrl = url;
            videoType = pattern.type;
            break;
          }
        }
        if (videoUrl) break;
      }
    }

    if (!videoUrl) {
      const allUrls = html.match(/https:\/\/[^\s"'<>\\]+/g) || [];
      for (const url of allUrls) {
        if ((url.includes('.mp4') || url.includes('.m3u8')) && !url.includes('privacy')) {
          videoUrl = url.replace(/[\\,;]+$/, '');
          videoType = url.includes('.m3u8') ? 'hls' : 'mp4';
          break;
        }
      }
    }

    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          error: "Could not extract video URL from VEO page",
          debug: "No video URL found in any pattern",
          shareId: shareId,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        url: videoUrl,
        type: videoType,
        shareId: shareId,
        timestamp: timestamp ? parseInt(timestamp) : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
