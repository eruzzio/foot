import { Player, TeamFormation } from '../types/database';

interface TeamPdfData {
  teamName: string;
  category: string;
  logoUrl?: string;
  formation: string;
  players: Player[];
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

  // Positions sur le terrain SVG (4-2-3-1 par défaut)
  const formationPositions = getFormationPositions(data.formation, data.players);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${data.teamName} - Composition</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  @page { 
    size: A4 landscape; 
    margin: 0; 
  }
  
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
    width: 60%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 20px 24px;
  }

  .right-panel {
    width: 40%;
    height: 100%;
    background: #111827;
    border-left: 1px solid #1E2D4A;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .logo {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #1A3A6E;
    border: 2px solid #2E6BC4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .logo img {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
  }

  .team-info h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .team-info .meta {
    display: flex;
    gap: 12px;
    margin-top: 4px;
    font-size: 11px;
    color: #6B7A99;
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
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #1A4A2E;
  }

  .terrain-svg {
    width: 100%;
    height: 100%;
  }

  .formation-label {
    position: absolute;
    top: 8px;
    right: 12px;
    background: rgba(0,0,0,0.7);
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    color: white;
    letter-spacing: 1px;
  }

  .right-title {
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #4A7FC1;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1E2D4A;
  }

  .position-group {
    margin-bottom: 14px;
  }

  .position-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .position-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .position-group-name {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 8px;
    margin-bottom: 3px;
    transition: background 0.2s;
  }

  .player-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 13px;
    font-weight: 500;
  }

  .player-pos {
    font-size: 10px;
    color: #6B7A99;
    margin-left: auto;
  }

  .footer {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid #1E2D4A;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-orion {
    font-size: 9px;
    color: #2E3D5E;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .footer-count {
    font-size: 10px;
    color: #4A7FC1;
  }
</style>
</head>
<body>
<div class="page">
  
  <div class="left-panel">
    <div class="header">
      <div class="logo">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="logo" />` : '⚽'}
      </div>
      <div class="team-info">
        <h1>${data.teamName}</h1>
        <div class="meta">
          <span class="badge">${data.category}</span>
          <span>Formation : ${data.formation}</span>
          <span>${data.season || 'Saison 2025-2026'}</span>
          <span>${data.players.length} joueurs</span>
        </div>
      </div>
    </div>

    <div class="terrain-wrap">
      <svg class="terrain-svg" viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg">
        <!-- Terrain -->
        <rect width="680" height="440" fill="#1A6B35" rx="8"/>
        <rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/>
        <line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="340" cy="220" r="3" fill="#2A8A4A"/>
        <!-- Surface de réparation gauche -->
        <rect x="10" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <rect x="10" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="65" cy="220" r="3" fill="#2A8A4A"/>
        <!-- Surface de réparation droite -->
        <rect x="590" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <rect x="640" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <circle cx="615" cy="220" r="3" fill="#2A8A4A"/>
        <!-- Arcs -->
        <path d="M 80 190 A 30 30 0 0 1 80 250" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>
        <path d="M 600 190 A 30 30 0 0 0 600 250" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>

        <!-- Joueurs -->
        ${formationPositions.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="18" fill="${p.color}" stroke="white" stroke-width="2.5" opacity="0.95"/>
          <text x="${p.x}" y="${p.y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="white" font-family="Inter, sans-serif" font-weight="700">${p.number}</text>
          <text x="${p.x}" y="${p.y + 28}" text-anchor="middle" font-size="9" fill="white" font-family="Inter, sans-serif" font-weight="500" opacity="0.85">${p.name}</text>
        `).join('')}
      </svg>
      <div class="formation-label">${data.formation}</div>
    </div>
  </div>

  <div class="right-panel">
    <div class="right-title">Effectif</div>

    ${positionGroups.map(group => `
      <div class="position-group">
        <div class="position-group-header">
          <div class="position-dot" style="background: ${group.color};"></div>
          <div class="position-group-name" style="color: ${group.color};">${group.name}</div>
        </div>
        ${group.players.map(p => `
          <div class="player-row" style="background: ${group.bg};">
            <div class="player-number" style="background: ${group.color}; color: white;">${p.number || '?'}</div>
            <div class="player-name">${p.name || 'Joueur'}</div>
            <div class="player-pos">${p.position || ''}</div>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="footer">
      <div class="footer-orion">ORION — Sports Video Analytics</div>
      <div class="footer-count">${data.players.length} joueurs</div>
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

interface PositionOnField {
  x: number;
  y: number;
  number: number | string;
  name: string;
  color: string;
}

function getFormationPositions(formation: string, players: Player[]): PositionOnField[] {
  const posColors: Record<string, string> = {
    GK: '#CA8A04',
    DF: '#2563EB',
    MF: '#16A34A',
    FW: '#DC2626',
    AT: '#DC2626',
  };

  // Positions prédéfinies par formation
  const layouts: Record<string, { pos: string; x: number; y: number }[]> = {
    '4-4-2': [
      { pos: 'GK', x: 50, y: 400 },
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

  const layout = layouts[formation] || layouts['4-2-3-1'];

  // Associer les joueurs aux positions
  const gk = players.filter(p => p.position === 'GK');
  const df = players.filter(p => p.position === 'DF');
  const mf = players.filter(p => p.position === 'MF');
  const fw = players.filter(p => ['FW', 'AT'].includes(p.position || ''));

  const orderedPlayers = [...gk, ...df, ...mf, ...fw];

  return layout.map((slot, i) => {
    const player = orderedPlayers[i];
    return {
      x: slot.x,
      y: slot.y,
      number: player?.number || '?',
      name: player?.name?.split(' ').pop() || '',
      color: posColors[slot.pos] || '#6B7280',
    };
  });
}
