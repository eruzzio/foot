import { Player } from '../types/database';

interface FormationPositionData {
  player_id: string | null;
  position_x: number;
  position_y: number;
  role: string;
}

interface TeamPdfData {
  teamName: string;
  category: string;
  logoUrl?: string;
  formation: string;
  players: Player[];
  positions?: FormationPositionData[];
  season?: string;
}

export function exportTeamPdf(data: TeamPdfData): void {
  const gk = data.players.filter(p => p.position === 'GK');
  const df = data.players.filter(p => p.position === 'DF');
  const mf = data.players.filter(p => p.position === 'MF');
  const fw = data.players.filter(p => ['FW', 'AT'].includes(p.position || ''));
  const other = data.players.filter(p => !['GK', 'DF', 'MF', 'FW', 'AT'].includes(p.position || ''));

  const positionGroups = [
    { name: 'Gardiens', players: gk, color: '#EAB308', bg: '#422006' },
    { name: 'Défenseurs', players: df, color: '#3B82F6', bg: '#172554' },
    { name: 'Milieux', players: mf, color: '#22C55E', bg: '#052E16' },
    { name: 'Attaquants', players: fw, color: '#EF4444', bg: '#450A0A' },
    { name: 'Autres', players: other, color: '#9CA3AF', bg: '#1F2937' },
  ].filter(g => g.players.length > 0);

  // Composition : joueurs positionnés sur le terrain
  const compositionPlayers = getCompositionPlayers(data);

  // Joueurs remplaçants (pas dans la composition)
  const compositionIds = new Set(compositionPlayers.map(p => p.playerId).filter(Boolean));
  const substitutes = data.players.filter(p => !compositionIds.has(p.id));

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${data.teamName} - Composition</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  @page { size: A4 landscape; margin: 0; }
  
  body { 
    font-family: 'Inter', sans-serif;
    background: #0A0F1E;
    color: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 297mm;
    height: 210mm;
    position: relative;
    overflow: hidden;
    display: flex;
  }

  .left-panel {
    width: 58%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 18px 22px;
  }

  .right-panel {
    width: 42%;
    height: 100%;
    background: #111827;
    border-left: 1px solid #1E2D4A;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }

  .logo {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: #1A3A6E;
    border: 2px solid #2E6BC4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .logo img {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
  }

  .team-info h1 {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .team-info .meta {
    display: flex;
    gap: 10px;
    margin-top: 3px;
    font-size: 10px;
    color: #6B7A99;
    align-items: center;
  }

  .badge {
    background: #1A3A6E;
    border: 1px solid #2E6BC4;
    color: #7AB3F0;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
  }

  .terrain-wrap {
    flex: 1;
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid #1A4A2E;
  }

  .terrain-svg { width: 100%; height: 100%; }

  .formation-label {
    position: absolute;
    top: 8px;
    right: 12px;
    background: rgba(0,0,0,0.75);
    padding: 4px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 800;
    color: white;
    letter-spacing: 2px;
  }

  .compo-label {
    position: absolute;
    top: 8px;
    left: 12px;
    background: rgba(0,0,0,0.75);
    padding: 4px 14px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #4A7FC1;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #4A7FC1;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #1E2D4A;
  }

  .position-group { margin-bottom: 10px; }

  .position-group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .position-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .position-group-name {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    margin-bottom: 2px;
  }

  .player-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 12px;
    font-weight: 500;
  }

  .player-pos {
    font-size: 9px;
    color: #6B7A99;
    margin-left: auto;
  }

  .subs-section {
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px dashed #1E2D4A;
  }

  .subs-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #6B7A99;
    margin-bottom: 6px;
  }

  .sub-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    font-size: 11px;
    color: #9CA3AF;
  }

  .sub-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #1F2937;
    border: 1px solid #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: #9CA3AF;
  }

  .footer {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #1E2D4A;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-orion {
    font-size: 8px;
    color: #2E3D5E;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .footer-count {
    font-size: 9px;
    color: #4A7FC1;
  }
</style>
</head>
<body>
<div class="page">
  
  <div class="left-panel">
    <div class="header">
      <div class="logo">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="logo" />` : '&#9917;'}
      </div>
      <div class="team-info">
        <h1>${data.teamName}</h1>
        <div class="meta">
          <span class="badge">${data.category}</span>
          <span>${data.formation}</span>
          <span>${data.season || 'Saison 2025-2026'}</span>
          <span>${data.players.length} joueurs</span>
        </div>
      </div>
    </div>

    <div class="terrain-wrap">
      <svg class="terrain-svg" viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg">
        <rect width="680" height="440" fill="#1A6B35" rx="8"/>
        <rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/>
        <line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="340" cy="220" r="3" fill="#2A8A4A"/>
        <rect x="10" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <rect x="10" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="65" cy="220" r="3" fill="#2A8A4A"/>
        <rect x="590" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <rect x="640" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="615" cy="220" r="3" fill="#2A8A4A"/>
        <path d="M 80 190 A 30 30 0 0 1 80 250" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <path d="M 600 190 A 30 30 0 0 0 600 250" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>

        ${compositionPlayers.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="20" fill="${p.color}" stroke="white" stroke-width="2.5" opacity="0.95"/>
          <text x="${p.x}" y="${p.y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="white" font-family="Inter, sans-serif" font-weight="800">${p.number}</text>
          <rect x="${p.x - 32}" y="${p.y + 22}" width="64" height="14" rx="3" fill="rgba(0,0,0,0.7)"/>
          <text x="${p.x}" y="${p.y + 32}" text-anchor="middle" font-size="8.5" fill="white" font-family="Inter, sans-serif" font-weight="600">${p.name}</text>
        `).join('')}
      </svg>
      <div class="formation-label">${data.formation}</div>
      <div class="compo-label">Composition</div>
    </div>
  </div>

  <div class="right-panel">
    <div class="section-title">Titulaires</div>

    ${positionGroups.map(group => {
      const starters = group.players.filter(p => compositionIds.has(p.id));
      if (starters.length === 0) return '';
      return `
      <div class="position-group">
        <div class="position-group-header">
          <div class="position-dot" style="background: ${group.color};"></div>
          <div class="position-group-name" style="color: ${group.color};">${group.name}</div>
        </div>
        ${starters.map(p => `
          <div class="player-row" style="background: ${group.bg};">
            <div class="player-number" style="background: ${group.color}; color: white;">${p.number || '?'}</div>
            <div class="player-name">${p.name || 'Joueur'}</div>
            <div class="player-pos">${p.position || ''}</div>
          </div>
        `).join('')}
      </div>`;
    }).join('')}

    ${substitutes.length > 0 ? `
    <div class="subs-section">
      <div class="subs-title">Remplacants (${substitutes.length})</div>
      ${substitutes.map(p => `
        <div class="sub-row">
          <div class="sub-num">${p.number || '?'}</div>
          <span>${p.name || 'Joueur'}</span>
          <span style="margin-left:auto;font-size:9px;color:#6B7A99;">${p.position || ''}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <div class="footer-orion">ORION — Sports Video Analytics & Coding</div>
      <div class="footer-count">${compositionPlayers.length} titulaires / ${substitutes.length} rempl.</div>
    </div>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

interface CompoPlayer {
  x: number;
  y: number;
  number: number | string;
  name: string;
  color: string;
  playerId: string | null;
}

function getCompositionPlayers(data: TeamPdfData): CompoPlayer[] {
  const posColors: Record<string, string> = {
    GK: '#CA8A04', DF: '#2563EB', MF: '#16A34A', FW: '#DC2626', AT: '#DC2626',
  };

  // Si on a des positions réelles depuis la formation
  if (data.positions && data.positions.length > 0) {
    return data.positions
      .filter(pos => pos.player_id)
      .map(pos => {
        const player = data.players.find(p => p.id === pos.player_id);
        const role = pos.role || player?.position || 'MF';
        return {
          x: (pos.position_x / 100) * 660 + 10,
          y: (pos.position_y / 100) * 420 + 10,
          number: player?.number || '?',
          name: player?.name?.split(' ').pop() || '',
          color: posColors[role] || posColors[player?.position || ''] || '#6B7280',
          playerId: pos.player_id,
        };
      });
  }

  // Fallback : positions par défaut selon la formation
  const layouts: Record<string, { pos: string; x: number; y: number }[]> = {
    '4-4-2': [
      { pos: 'GK', x: 340, y: 400 },
      { pos: 'DF', x: 120, y: 320 }, { pos: 'DF', x: 240, y: 330 }, { pos: 'DF', x: 440, y: 330 }, { pos: 'DF', x: 560, y: 320 },
      { pos: 'MF', x: 120, y: 210 }, { pos: 'MF', x: 260, y: 220 }, { pos: 'MF', x: 420, y: 220 }, { pos: 'MF', x: 560, y: 210 },
      { pos: 'FW', x: 240, y: 100 }, { pos: 'FW', x: 440, y: 100 },
    ],
    '4-3-3': [
      { pos: 'GK', x: 340, y: 400 },
      { pos: 'DF', x: 120, y: 320 }, { pos: 'DF', x: 240, y: 330 }, { pos: 'DF', x: 440, y: 330 }, { pos: 'DF', x: 560, y: 320 },
      { pos: 'MF', x: 200, y: 210 }, { pos: 'MF', x: 340, y: 220 }, { pos: 'MF', x: 480, y: 210 },
      { pos: 'FW', x: 160, y: 90 }, { pos: 'FW', x: 340, y: 80 }, { pos: 'FW', x: 520, y: 90 },
    ],
    '4-2-3-1': [
      { pos: 'GK', x: 340, y: 400 },
      { pos: 'DF', x: 120, y: 320 }, { pos: 'DF', x: 240, y: 340 }, { pos: 'DF', x: 440, y: 340 }, { pos: 'DF', x: 560, y: 320 },
      { pos: 'MF', x: 260, y: 250 }, { pos: 'MF', x: 420, y: 250 },
      { pos: 'MF', x: 140, y: 160 }, { pos: 'MF', x: 340, y: 150 }, { pos: 'MF', x: 540, y: 160 },
      { pos: 'FW', x: 340, y: 70 },
    ],
    '3-5-2': [
      { pos: 'GK', x: 340, y: 400 },
      { pos: 'DF', x: 180, y: 330 }, { pos: 'DF', x: 340, y: 340 }, { pos: 'DF', x: 500, y: 330 },
      { pos: 'MF', x: 100, y: 220 }, { pos: 'MF', x: 230, y: 230 }, { pos: 'MF', x: 340, y: 210 }, { pos: 'MF', x: 450, y: 230 }, { pos: 'MF', x: 580, y: 220 },
      { pos: 'FW', x: 260, y: 90 }, { pos: 'FW', x: 420, y: 90 },
    ],
  };

  const layout = layouts[data.formation] || layouts['4-2-3-1'];

  const gk = data.players.filter(p => p.position === 'GK');
  const df = data.players.filter(p => p.position === 'DF');
  const mf = data.players.filter(p => p.position === 'MF');
  const fw = data.players.filter(p => ['FW', 'AT'].includes(p.position || ''));
  const orderedPlayers = [...gk, ...df, ...mf, ...fw];

  return layout.map((slot, i) => {
    const player = orderedPlayers[i];
    return {
      x: slot.x,
      y: slot.y,
      number: player?.number || '?',
      name: player?.name?.split(' ').pop() || '',
      color: posColors[slot.pos] || '#6B7280',
      playerId: player?.id || null,
    };
  });
}
