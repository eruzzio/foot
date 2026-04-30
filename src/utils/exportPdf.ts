import { MatchEventWithDetails } from '../types/database';
import { calculateTeamXG, getShotEvents } from './xg';

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
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function exportToPdf(data: PdfExportData): void {
  const teamAEvents = data.events.filter(e => e.team === 'A');
  const teamBEvents = data.events.filter(e => e.team === 'B');

  // xG
  const xgA = calculateTeamXG(data.events, 'A');
  const xgB = calculateTeamXG(data.events, 'B');
  const shotsA = getShotEvents(data.events.filter(e => e.team === 'A')).length;
  const shotsB = getShotEvents(data.events.filter(e => e.team === 'B')).length;
  const xgBarA = xgA + xgB > 0 ? Math.round((xgA / (xgA + xgB)) * 100) : 50;
  const scoreDisplay = data.matchInfo.scoreA !== undefined && data.matchInfo.scoreB !== undefined
    ? `${data.matchInfo.scoreA} - ${data.matchInfo.scoreB}` : 'vs';

  // Stats par type
  const typeMap: Record<string, { teamA: number; teamB: number; color: string }> = {};
  data.events.forEach(e => {
    const name = e.event_type?.name || e.label || 'Autre';
    if (!typeMap[name]) typeMap[name] = { teamA: 0, teamB: 0, color: e.event_type?.color || '#6B7280' };
    if (e.team === 'A') typeMap[name].teamA++;
    else typeMap[name].teamB++;
  });
  const sortedTypes = Object.entries(typeMap)
    .map(([name, d]) => ({ name, ...d, total: d.teamA + d.teamB }))
    .sort((a, b) => b.total - a.total);

  // Periodes 15min condensees
  const periods = ["0-15'", "15-30'", "30-45'", "45-60'", "60-75'", "75-90+'"];
  const periodData = periods.map((label, i) => {
    const minStart = i * 15;
    const pEvents = data.events.filter(e => {
      const mins = Math.floor(e.timestamp / 60);
      return mins >= minStart && (i < 5 ? mins < minStart + 15 : true);
    });
    const byType: Record<string, number> = {};
    pEvents.forEach(e => {
      const n = e.event_type?.name || e.label || 'Autre';
      byType[n] = (byType[n] || 0) + 1;
    });
    return { label, total: pEvents.length, teamA: pEvents.filter(e => e.team === 'A').length, teamB: pEvents.filter(e => e.team === 'B').length, byType };
  });

  // Heatmap terrain
  const fieldEvents = data.events.filter(e => e.field_x !== null && e.field_y !== null);
  const fieldPts = fieldEvents.map(e => {
    const c = e.event_type?.color || '#f97316';
    return `<circle cx="${(e.field_x! / 100) * 660 + 10}" cy="${(e.field_y! / 100) * 420 + 10}" r="6" fill="${c}" stroke="white" stroke-width="1.5" opacity="0.85"/>`;
  }).join('');

  // Zones
  const zO = fieldEvents.filter(e => (e.field_y ?? 0) < 33).length;
  const zM = fieldEvents.filter(e => (e.field_y ?? 0) >= 33 && (e.field_y ?? 0) <= 66).length;
  const zD = fieldEvents.filter(e => (e.field_y ?? 0) > 66).length;
  const zT = zO + zM + zD || 1;

  // Détail par zone : quels types d'événements dans chaque zone
  const zoneDetailFn = (evts: MatchEventWithDetails[]) => {
    const byType: Record<string, number> = {};
    evts.forEach(e => {
      const n = e.event_type?.name || e.label || 'Autre';
      byType[n] = (byType[n] || 0) + 1;
    });
    return Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n} ${c}`).join(' | ');
  };
  const zoneOffDetail = zoneDetailFn(fieldEvents.filter(e => (e.field_y ?? 0) < 33));
  const zoneMedDetail = zoneDetailFn(fieldEvents.filter(e => (e.field_y ?? 0) >= 33 && (e.field_y ?? 0) <= 66));
  const zoneDefDetail = zoneDetailFn(fieldEvents.filter(e => (e.field_y ?? 0) > 66));

  // But
  const goalEvents = data.events.filter(e => e.goal_x !== null && e.goal_y !== null);
  const goalPts = goalEvents.map(e => {
    const c = e.outcome === 'success' ? '#22c55e' : e.outcome === 'failure' ? '#ef4444' : '#facc15';
    return `<circle cx="${(e.goal_x! / 100) * 280 + 10}" cy="${(e.goal_y! / 100) * 90 + 5}" r="7" fill="${c}" stroke="white" stroke-width="2" opacity="0.9"/>`;
  }).join('');

  // Logos
  const mkLogo = (url: string | undefined, name: string, color: string) => url
    ? `<img src="${url}" style="width:50px;height:50px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.1);padding:3px;"/>`
    : `<div style="width:50px;height:50px;border-radius:8px;background:${color}22;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:${color};">${name.charAt(0)}</div>`;

  // Type rows
  const typeRows = sortedTypes.map(t => {
    const aW = t.total > 0 ? (t.teamA / t.total) * 100 : 50;
    return `<tr><td style="padding:5px 8px;font-size:11px;font-weight:600;border-bottom:1px solid #f1f5f9;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${t.color};margin-right:5px;vertical-align:middle;"></span>${t.name}</td><td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:#16a34a;border-bottom:1px solid #f1f5f9;">${t.teamA}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;"><div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#f1f5f9;"><div style="width:${aW}%;background:#22c55e;"></div><div style="width:${100 - aW}%;background:#f97316;"></div></div></td><td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:#f97316;border-bottom:1px solid #f1f5f9;">${t.teamB}</td></tr>`;
  }).join('');

  // Period rows condensees
  const periodRows = periodData.filter(p => p.total > 0).map(p => {
    const tags = Object.entries(p.byType).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, c]) => {
      const col = typeMap[n]?.color || '#6B7280';
      return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;background:${col}18;color:${col};margin-right:3px;">${n} ${c}</span>`;
    }).join('');
    return `<tr><td style="padding:5px 8px;font-weight:700;font-size:12px;border-bottom:1px solid #f1f5f9;width:60px;">${p.label}</td><td style="padding:5px 6px;text-align:center;font-weight:700;color:#16a34a;border-bottom:1px solid #f1f5f9;width:30px;">${p.teamA}</td><td style="padding:5px 6px;text-align:center;font-weight:700;color:#f97316;border-bottom:1px solid #f1f5f9;width:30px;">${p.teamB}</td><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;">${tags}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport - ${data.matchInfo.teamA} vs ${data.matchInfo.teamB}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1e293b;}@media print{@page{size:A4;margin:6mm 8mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}.page{max-width:900px;margin:0 auto;padding:12px;}h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:6px;}table{width:100%;border-collapse:collapse;}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;}</style>
</head><body><div class="page">

<div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:10px;padding:16px 20px;margin-bottom:12px;color:white;">
${data.matchInfo.competition ? `<div style="text-align:center;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:8px;">${data.matchInfo.competition}</div>` : ''}
<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;">
<div style="display:flex;align-items:center;gap:8px;">${mkLogo(data.matchInfo.teamALogoUrl, data.matchInfo.teamA, '#22c55e')}<div style="font-size:14px;font-weight:800;color:#22c55e;">${data.matchInfo.teamA}</div></div>
<div style="text-align:center;"><div style="font-size:36px;font-weight:900;letter-spacing:4px;">${scoreDisplay}</div><div style="font-size:9px;color:#94a3b8;margin-top:2px;">${data.matchInfo.date}${data.matchInfo.duration ? ' | ' + formatTime(data.matchInfo.duration) : ''}</div></div>
<div style="display:flex;align-items:center;gap:8px;flex-direction:row-reverse;text-align:right;">${mkLogo(data.matchInfo.teamBLogoUrl, data.matchInfo.teamB, '#f97316')}<div style="font-size:14px;font-weight:800;color:#f97316;">${data.matchInfo.teamB}</div></div>
</div></div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;">
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#16a34a;">${teamAEvents.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">${data.matchInfo.teamA}</div></div>
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#f97316;">${teamBEvents.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">${data.matchInfo.teamB}</div></div>
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#0ea5e9;">${data.events.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">Total</div></div>
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#8b5cf6;">${fieldEvents.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">Localisées</div></div>
</div>

${xgA + xgB > 0 ? `
<div class="card" style="margin-bottom:12px;padding:10px 16px;">
  <div style="text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">⚽ Expected Goals (xG)</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:8px;">
    <div style="text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#16a34a;">${xgA.toFixed(2)}</div>
      <div style="font-size:9px;color:#64748b;">${data.matchInfo.teamA}</div>
      <div style="font-size:8px;color:#94a3b8;">${shotsA} tir${shotsA > 1 ? 's' : ''}</div>
    </div>
    <div>
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#f1f5f9;">
        <div style="width:${xgBarA}%;background:#16a34a;"></div>
        <div style="flex:1;background:#f97316;"></div>
      </div>
      <div style="text-align:center;font-size:8px;color:#94a3b8;margin-top:3px;">Position · Angle · Type</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#f97316;">${xgB.toFixed(2)}</div>
      <div style="font-size:9px;color:#64748b;">${data.matchInfo.teamB}</div>
      <div style="font-size:8px;color:#94a3b8;">${shotsB} tir${shotsB > 1 ? 's' : ''}</div>
    </div>
  </div>
</div>` : ''}

<div style="display:grid;grid-template-columns:${goalEvents.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr'};gap:10px;margin-bottom:12px;">
<div><h2>Heatmap terrain</h2><div class="card" style="padding:3px;"><svg viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:4px;"><rect width="680" height="440" fill="#1A6B35" rx="4"/><rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/><line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/><circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="10" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="10" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="590" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="640" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>${fieldPts}</svg></div></div>
<div><h2>Répartition par zone</h2><div class="card" style="padding:3px;"><svg viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:4px;"><rect width="680" height="440" fill="#1A6B35" rx="4"/><rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/><line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/><circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><!-- Zone défensive gauche --><rect x="10" y="10" width="220" height="420" fill="rgba(59,130,246,0.2)"/><line x1="230" y1="10" x2="230" y2="430" stroke="rgba(59,130,246,0.5)" stroke-width="2" stroke-dasharray="8,4"/><text x="120" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zD}</text><text x="120" y="235" text-anchor="middle" font-size="10" fill="rgba(180,210,255,0.8)" font-weight="600" font-family="sans-serif">DEF (${Math.round((zD/zT)*100)}%)</text><text x="120" y="255" text-anchor="middle" font-size="9" fill="rgba(180,210,255,0.6)" font-family="sans-serif">${zoneDefDetail}</text><!-- Zone médiane centre --><rect x="230" y="10" width="220" height="420" fill="rgba(250,204,21,0.12)"/><line x1="450" y1="10" x2="450" y2="430" stroke="rgba(250,204,21,0.5)" stroke-width="2" stroke-dasharray="8,4"/><text x="340" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zM}</text><text x="340" y="235" text-anchor="middle" font-size="10" fill="rgba(255,240,180,0.8)" font-weight="600" font-family="sans-serif">MED (${Math.round((zM/zT)*100)}%)</text><text x="340" y="255" text-anchor="middle" font-size="9" fill="rgba(255,240,180,0.6)" font-family="sans-serif">${zoneMedDetail}</text><!-- Zone offensive droite --><rect x="450" y="10" width="220" height="420" fill="rgba(239,68,68,0.2)"/><text x="560" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zO}</text><text x="560" y="235" text-anchor="middle" font-size="10" fill="rgba(255,200,200,0.8)" font-weight="600" font-family="sans-serif">OFF (${Math.round((zO/zT)*100)}%)</text><text x="560" y="255" text-anchor="middle" font-size="9" fill="rgba(255,200,200,0.6)" font-family="sans-serif">${zoneOffDetail}</text></svg></div></div>
${goalEvents.length > 0 ? `<div><h2>Zones de frappe</h2><div class="card" style="padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;"><svg viewBox="0 0 300 110" xmlns="http://www.w3.org/2000/svg" style="width:100%;"><rect width="300" height="100" fill="#0f1a2a" rx="4"/><rect x="5" y="5" width="290" height="90" fill="none" stroke="white" stroke-width="3" rx="2"/><line x1="100" y1="5" x2="100" y2="95" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="200" y1="5" x2="200" y2="95" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="5" y1="35" x2="295" y2="35" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="5" y1="65" x2="295" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>${goalPts}<rect x="0" y="100" width="300" height="10" fill="#166534"/></svg><div style="display:flex;gap:8px;margin-top:6px;font-size:9px;"><span style="color:#22c55e;">&#9679; But</span><span style="color:#facc15;">&#9679; Arrêté</span><span style="color:#ef4444;">&#9679; Manqué</span></div><div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:600;">${goalEvents.length} tir(s)</div></div></div>` : ''}
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
<div><h2>Actions par type</h2><div class="card" style="padding:0;overflow:hidden;"><table><thead><tr style="background:#f1f5f9;"><th style="padding:4px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;">Type</th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:#16a34a;width:30px;">${data.matchInfo.teamA}</th><th style="padding:4px 6px;min-width:60px;"></th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:#f97316;width:30px;">${data.matchInfo.teamB}</th></tr></thead><tbody>${typeRows}</tbody></table></div></div>
<div><h2>Activité par période</h2><div class="card" style="padding:0;overflow:hidden;"><table><thead><tr style="background:#f1f5f9;"><th style="padding:4px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;">Période</th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:#16a34a;width:25px;">${data.matchInfo.teamA}</th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:#f97316;width:25px;">${data.matchInfo.teamB}</th><th style="padding:4px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;">Détail</th></tr></thead><tbody>${periodRows}</tbody></table></div></div>
</div>

<div style="padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;"><span style="font-size:8px;color:#94a3b8;">ORION — Sports Video Analytics & Coding</span><span style="font-size:8px;color:#94a3b8;">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>

</div><script>window.onload = function() { window.print(); };</script></body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
