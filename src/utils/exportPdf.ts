import { MatchEventWithDetails } from '../types/database';

interface PdfExportData {
  events: MatchEventWithDetails[];
  matchInfo: {
    teamA: string;
    teamB: string;
    date: string;
    scoreA?: number;
    scoreB?: number;
    duration?: number;
    location?: string;
    competition?: string;
    teamALogoUrl?: string;
    teamBLogoUrl?: string;
  };
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getSubAction(event: MatchEventWithDetails): string {
  const parts: string[] = [];
  if (event.label && event.event_type?.name && event.label !== event.event_type.name) {
    parts.push(event.label);
  }
  if (event.keywords && event.keywords.length > 0) {
    parts.push(...event.keywords);
  }
  return parts.join(', ');
}

export function exportToPdf(data: PdfExportData): void {
  const teamAEvents = data.events.filter(e => e.team === 'A');
  const teamBEvents = data.events.filter(e => e.team === 'B');

  const teamASuccess = teamAEvents.filter(e => e.outcome === 'success').length;
  const teamBSuccess = teamBEvents.filter(e => e.outcome === 'success').length;
  const teamAFailure = teamAEvents.filter(e => e.outcome === 'failure').length;
  const teamBFailure = teamBEvents.filter(e => e.outcome === 'failure').length;
  const teamANeutral = teamAEvents.filter(e => e.outcome === 'neutral').length;
  const teamBNeutral = teamBEvents.filter(e => e.outcome === 'neutral').length;
  const teamASuccessRate = teamAEvents.length > 0 ? ((teamASuccess / teamAEvents.length) * 100).toFixed(0) : '0';
  const teamBSuccessRate = teamBEvents.length > 0 ? ((teamBSuccess / teamBEvents.length) * 100).toFixed(0) : '0';

  const eventTypesMap: Record<string, { teamA: number; teamB: number; color: string }> = {};
  data.events.forEach(e => {
    const name = e.event_type?.name || e.label || 'Inconnu';
    if (!eventTypesMap[name]) {
      eventTypesMap[name] = { teamA: 0, teamB: 0, color: e.event_type?.color || '#6B7280' };
    }
    if (e.team === 'A') eventTypesMap[name].teamA++;
    else eventTypesMap[name].teamB++;
  });

  const sortedTypes = Object.entries(eventTypesMap)
    .map(([name, d]) => ({ name, ...d, total: d.teamA + d.teamB }))
    .sort((a, b) => b.total - a.total);

  const periodStats: Record<string, { teamA: number; teamB: number }> = {
    '0-15 min': { teamA: 0, teamB: 0 },
    '15-30 min': { teamA: 0, teamB: 0 },
    '30-45 min': { teamA: 0, teamB: 0 },
    '45+ min': { teamA: 0, teamB: 0 },
  };
  data.events.forEach(e => {
    const mins = Math.floor(e.timestamp / 60);
    const key = mins < 15 ? '0-15 min' : mins < 30 ? '15-30 min' : mins < 45 ? '30-45 min' : '45+ min';
    if (e.team === 'A') periodStats[key].teamA++;
    else periodStats[key].teamB++;
  });

  const scoreDisplay = data.matchInfo.scoreA !== undefined && data.matchInfo.scoreB !== undefined
    ? `${data.matchInfo.scoreA} - ${data.matchInfo.scoreB}`
    : null;

  const eventTypeRows = sortedTypes.map(type => {
    const total = type.teamA + type.teamB;
    const aWidth = total > 0 ? (type.teamA / total) * 100 : 50;
    const bWidth = 100 - aWidth;
    return `
      <tr>
        <td style="padding:8px 12px; font-weight:500; font-size:13px; color:#1e293b; border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${type.color}; margin-right:8px; vertical-align:middle;"></span>
          ${type.name}
        </td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; font-size:15px; color:#16a34a; border-bottom:1px solid #f1f5f9;">${type.teamA}</td>
        <td style="padding:8px 16px; border-bottom:1px solid #f1f5f9;">
          <div style="display:flex; height:14px; border-radius:7px; overflow:hidden; background:#f1f5f9; min-width:120px;">
            <div style="width:${aWidth}%; background:#22c55e; transition:width 0.3s;"></div>
            <div style="width:${bWidth}%; background:#f97316; transition:width 0.3s;"></div>
          </div>
        </td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; font-size:15px; color:#f97316; border-bottom:1px solid #f1f5f9;">${type.teamB}</td>
      </tr>
    `;
  }).join('');

  const periodRows = Object.entries(periodStats).map(([period, counts]) => {
    const total = counts.teamA + counts.teamB;
    const aWidth = total > 0 ? (counts.teamA / total) * 100 : 50;
    const bWidth = 100 - aWidth;
    return `
      <tr>
        <td style="padding:8px 12px; font-weight:500; font-size:13px; color:#1e293b; border-bottom:1px solid #f1f5f9;">${period}</td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; color:#16a34a; border-bottom:1px solid #f1f5f9;">${counts.teamA}</td>
        <td style="padding:8px 16px; border-bottom:1px solid #f1f5f9;">
          <div style="display:flex; height:14px; border-radius:7px; overflow:hidden; background:#f1f5f9; min-width:100px;">
            <div style="width:${aWidth}%; background:#22c55e;"></div>
            <div style="width:${bWidth}%; background:#f97316;"></div>
          </div>
        </td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; color:#f97316; border-bottom:1px solid #f1f5f9;">${counts.teamB}</td>
      </tr>
    `;
  }).join('');

  const recentEvents = [...data.events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  const timelineRows = recentEvents.map(e => {
    const isA = e.team === 'A';
    const outcomeColor = e.outcome === 'success' ? '#16a34a' : e.outcome === 'failure' ? '#dc2626' : '#64748b';
    const outcomeLabel = e.outcome === 'success' ? 'Réussi' : e.outcome === 'failure' ? 'Raté' : 'Neutre';
    const subAction = getSubAction(e);
    return `
      <tr>
        <td style="padding:6px 12px; font-size:12px; font-weight:600; color:#475569; border-bottom:1px solid #f1f5f9; font-variant-numeric:tabular-nums;">${formatTime(e.timestamp)}</td>
        <td style="padding:6px 12px; border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:${isA ? '#dcfce7' : '#fff7ed'}; color:${isA ? '#16a34a' : '#f97316'};">
            ${isA ? data.matchInfo.teamA : data.matchInfo.teamB}
          </span>
        </td>
        <td style="padding:6px 12px; font-size:12px; font-weight:500; color:#1e293b; border-bottom:1px solid #f1f5f9;">${e.event_type?.name || e.label || '-'}</td>
        <td style="padding:6px 12px; font-size:11px; color:#64748b; border-bottom:1px solid #f1f5f9;">${subAction || '-'}</td>
        <td style="padding:6px 12px; border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:${outcomeColor}15; color:${outcomeColor};">${outcomeLabel}</span>
        </td>
      </tr>
    `;
  }).join('');

  const teamALogoHtml = data.matchInfo.teamALogoUrl
    ? `<img src="${data.matchInfo.teamALogoUrl}" alt="${data.matchInfo.teamA}" style="width:120px; height:120px; object-fit:contain; border-radius:12px; background:rgba(255,255,255,0.08); padding:8px;" />`
    : `<div style="width:120px; height:120px; border-radius:12px; background:rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; font-size:44px; font-weight:900; color:#22c55e;">${data.matchInfo.teamA.charAt(0).toUpperCase()}</div>`;

  const teamBLogoHtml = data.matchInfo.teamBLogoUrl
    ? `<img src="${data.matchInfo.teamBLogoUrl}" alt="${data.matchInfo.teamB}" style="width:120px; height:120px; object-fit:contain; border-radius:12px; background:rgba(255,255,255,0.08); padding:8px;" />`
    : `<div style="width:120px; height:120px; border-radius:12px; background:rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; font-size:44px; font-weight:900; color:#f97316;">${data.matchInfo.teamB.charAt(0).toUpperCase()}</div>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport de match - ${data.matchInfo.teamA} vs ${data.matchInfo.teamB}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; }
    @media print {
      @page { size: A4; margin: 10mm 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .page { max-width: 900px; margin: 0 auto; padding: 24px; }
    h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    .section { margin-bottom: 28px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 14px; padding: 28px 32px; margin-bottom: 24px; color: white;">
    ${data.matchInfo.competition ? `<div style="text-align:center; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.12em; color:#94a3b8; margin-bottom:16px;">${data.matchInfo.competition}</div>` : ''}
    <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px;">

      <!-- Team A -->
      <div style="display:flex; align-items:center; gap:14px;">
        ${teamALogoHtml}
        <div>
          <div style="font-size:20px; font-weight:800; color:#22c55e; line-height:1.1;">${data.matchInfo.teamA}</div>
          ${data.matchInfo.scoreA !== undefined ? `<div style="font-size:13px; color:#94a3b8; margin-top:2px;">Équipe domicile</div>` : ''}
        </div>
      </div>

      <!-- Center: score + date -->
      <div style="text-align:center; padding:0 16px;">
        ${scoreDisplay ? `
        <div style="font-size:48px; font-weight:900; letter-spacing:4px; line-height:1;">${scoreDisplay}</div>
        <div style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-top:4px;">Score final</div>
        ` : `<div style="font-size:22px; font-weight:700; color:#64748b;">vs</div>`}
        <div style="margin-top:10px; font-size:12px; color:#94a3b8;">${data.matchInfo.date}</div>
        ${data.matchInfo.location ? `<div style="font-size:12px; color:#94a3b8; margin-top:2px;">${data.matchInfo.location}</div>` : ''}
        ${data.matchInfo.duration ? `<div style="font-size:12px; color:#94a3b8; margin-top:2px;">${formatTime(data.matchInfo.duration)}</div>` : ''}
      </div>

      <!-- Team B -->
      <div style="display:flex; align-items:center; gap:14px; flex-direction:row-reverse; text-align:right;">
        ${teamBLogoHtml}
        <div>
          <div style="font-size:20px; font-weight:800; color:#f97316; line-height:1.1;">${data.matchInfo.teamB}</div>
          ${data.matchInfo.scoreB !== undefined ? `<div style="font-size:13px; color:#94a3b8; margin-top:2px;">Équipe visiteur</div>` : ''}
        </div>
      </div>

    </div>
  </div>

  <!-- KPI ROW -->
  <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr; gap:12px; margin-bottom:24px;">
    <div class="card" style="text-align:center;">
      <div style="font-size:28px; font-weight:800; color:#16a34a;">${teamAEvents.length}</div>
      <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">${data.matchInfo.teamA}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div style="font-size:28px; font-weight:800; color:#f97316;">${teamBEvents.length}</div>
      <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">${data.matchInfo.teamB}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div style="font-size:28px; font-weight:800; color:#0ea5e9;">${data.events.length}</div>
      <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">Total actions</div>
    </div>
    <div class="card" style="text-align:center;">
      <div style="font-size:28px; font-weight:800; color:#16a34a;">${teamASuccessRate}%</div>
      <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">Réussite ${data.matchInfo.teamA}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div style="font-size:28px; font-weight:800; color:#f97316;">${teamBSuccessRate}%</div>
      <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:600;">Réussite ${data.matchInfo.teamB}</div>
    </div>
  </div>

  <!-- OUTCOME BARS -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
    <div class="card">
      <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#16a34a; margin-bottom:12px;">${data.matchInfo.teamA}</div>
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <div style="flex:${teamASuccess || 0.01}; background:#22c55e; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamASuccess}</div>
        <div style="flex:${teamAFailure || 0.01}; background:#ef4444; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamAFailure}</div>
        <div style="flex:${teamANeutral || 0.01}; background:#94a3b8; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamANeutral}</div>
      </div>
      <div style="display:flex; gap:12px; font-size:11px; color:#64748b;">
        <span style="color:#16a34a;">✓ Réussis: ${teamASuccess}</span>
        <span style="color:#dc2626;">✗ Ratés: ${teamAFailure}</span>
        <span style="color:#64748b;">○ Neutres: ${teamANeutral}</span>
      </div>
    </div>
    <div class="card">
      <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#f97316; margin-bottom:12px;">${data.matchInfo.teamB}</div>
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <div style="flex:${teamBSuccess || 0.01}; background:#22c55e; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamBSuccess}</div>
        <div style="flex:${teamBFailure || 0.01}; background:#ef4444; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamBFailure}</div>
        <div style="flex:${teamBNeutral || 0.01}; background:#94a3b8; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; min-width:20px;">${teamBNeutral}</div>
      </div>
      <div style="display:flex; gap:12px; font-size:11px; color:#64748b;">
        <span style="color:#16a34a;">✓ Réussis: ${teamBSuccess}</span>
        <span style="color:#dc2626;">✗ Ratés: ${teamBFailure}</span>
        <span style="color:#64748b;">○ Neutres: ${teamBNeutral}</span>
      </div>
    </div>
  </div>

  <!-- LEGEND -->
  <div style="display:flex; gap:24px; margin-bottom:8px; padding:0 4px;">
    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:#64748b; font-weight:600;">
      <div style="width:16px; height:8px; background:#22c55e; border-radius:2px;"></div>
      ${data.matchInfo.teamA}
    </div>
    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:#64748b; font-weight:600;">
      <div style="width:16px; height:8px; background:#f97316; border-radius:2px;"></div>
      ${data.matchInfo.teamB}
    </div>
  </div>

  <!-- ACTIONS BY TYPE -->
  ${sortedTypes.length > 0 ? `
  <div class="section">
    <h2>Actions par type</h2>
    <div class="card" style="padding:0; overflow:hidden;">
      <table>
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b;">Type</th>
            <th style="padding:10px 12px; text-align:center; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#16a34a; width:60px;">${data.matchInfo.teamA}</th>
            <th style="padding:10px 16px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; min-width:140px;">Comparaison</th>
            <th style="padding:10px 12px; text-align:center; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#f97316; width:60px;">${data.matchInfo.teamB}</th>
          </tr>
        </thead>
        <tbody>${eventTypeRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- PERIODS -->
  <div class="section">
    <h2>Activité par période</h2>
    <div class="card" style="padding:0; overflow:hidden;">
      <table>
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b;">Période</th>
            <th style="padding:10px 12px; text-align:center; font-size:11px; font-weight:700; color:#16a34a; width:60px;">${data.matchInfo.teamA}</th>
            <th style="padding:10px 16px; min-width:140px;"></th>
            <th style="padding:10px 12px; text-align:center; font-size:11px; font-weight:700; color:#f97316; width:60px;">${data.matchInfo.teamB}</th>
          </tr>
        </thead>
        <tbody>${periodRows}</tbody>
      </table>
    </div>
  </div>

  <!-- TIMELINE -->
  ${recentEvents.length > 0 ? `
  <div class="section">
    <h2>Chronologie${data.events.length > 20 ? ` (20 dernières actions sur ${data.events.length})` : ''}</h2>
    <div class="card" style="padding:0; overflow:hidden;">
      <table>
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; width:60px;">Temps</th>
            <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; width:100px;">Équipe</th>
            <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b;">Action</th>
            <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b;">Détail</th>
            <th style="padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; width:80px;">Résultat</th>
          </tr>
        </thead>
        <tbody>${timelineRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- FOOTER -->
  <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:11px; color:#94a3b8;">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    <div style="font-size:11px; color:#94a3b8;">Fiche de performance — ${data.matchInfo.teamA} vs ${data.matchInfo.teamB}</div>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onafterprint = () => {
      URL.revokeObjectURL(url);
    };
  }
}
