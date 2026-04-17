export function getFootballFieldSVG(): string {
  const width = 1000;
  const height = 600;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#1e5c3d"/><line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="white" stroke-width="2"/><circle cx="${width / 2}" cy="${height / 2}" r="50" fill="none" stroke="white" stroke-width="2"/><circle cx="${width / 2}" cy="${height / 2}" r="3" fill="white"/><rect x="0" y="${(height - 220) / 2}" width="180" height="220" fill="none" stroke="white" stroke-width="2"/><rect x="0" y="${(height - 130) / 2}" width="90" height="130" fill="none" stroke="white" stroke-width="2"/><circle cx="110" cy="${height / 2}" r="2" fill="white"/><rect x="${width - 180}" y="${(height - 220) / 2}" width="180" height="220" fill="none" stroke="white" stroke-width="2"/><rect x="${width - 90}" y="${(height - 130) / 2}" width="90" height="130" fill="none" stroke="white" stroke-width="2"/><circle cx="${width - 110}" cy="${height / 2}" r="2" fill="white"/><line x1="0" y1="0" x2="${width}" y2="0" stroke="white" stroke-width="2"/><line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="white" stroke-width="2"/><line x1="0" y1="0" x2="0" y2="${height}" stroke="white" stroke-width="2"/><line x1="${width}" y1="0" x2="${width}" y2="${height}" stroke="white" stroke-width="2"/></svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
