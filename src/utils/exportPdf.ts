import { MatchEventWithDetails } from '../types/database';
import { calculateTeamXG, getShotEvents } from './xg';

interface PdfExportData {
  events: MatchEventWithDetails[];
  matchInfo: {
    teamA: string;
    teamB: string;
    teamAColor?: string;
    teamBColor?: string;
    date: string;
    scoreA?: number;
    scoreB?: number;
    duration?: number;
    location?: string;
    competition?: string;
    teamALogoUrl?: string;
    teamBLogoUrl?: string;
  };
  sections?: Record<string, boolean>;
  teamFilter?: 'A' | 'B' | 'both';
  heatmapFilters?: {
    field: string[] | null;
    zones: string[] | null;
    goal: string[] | null;
  };
  heatmapTeams?: {
    heatmap_field?: 'A' | 'B' | 'both';
    heatmap_zones?: 'A' | 'B' | 'both';
    heatmap_goal?:  'A' | 'B' | 'both';
  };
}

// ORION exportPdf v2.1 - fix s variable conflict
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function exportToPdf(data: PdfExportData): void {
  const colorA = data.matchInfo.teamAColor || '#22c55e';
  const colorB = data.matchInfo.teamBColor || '#f97316';
  const sections = data.sections || {};
  const show = (id: string) => !data.sections || sections[id] !== false;
  const teamFilter = data.teamFilter || 'both';
  const hf = data.heatmapFilters;
  const ht = data.heatmapTeams || {};

  // Filtrer les événements par équipe pour chaque heatmap
  const filterByTeam = (evts: MatchEventWithDetails[], team?: 'A' | 'B' | 'both') => {
    if (!team || team === 'both') return evts;
    return evts.filter(e => e.team === team);
  };

  // Helpers filtrage heatmap par type
  const filterByType = (evts: MatchEventWithDetails[], types: string[] | null) => {
    if (!types || types.length === 0) return evts;
    return evts.filter(e => {
      const name = e.event_type?.name || e.label || 'Autre';
      return types.includes(name);
    });
  };

  const teamAEvents = data.events.filter(e => e.team === 'A');
  const teamBEvents = data.events.filter(e => e.team === 'B');

  // Événements filtrés pour chaque heatmap
  const fieldEventsRaw = filterByTeam(data.events.filter(e => e.field_x !== null && e.field_y !== null), ht.heatmap_field);
  const fieldEventsFiltered = filterByType(fieldEventsRaw, hf?.field || null);
  const zonesEventsRaw = filterByTeam(data.events.filter(e => e.field_x !== null && e.field_y !== null), ht.heatmap_zones);
  const zonesEventsFiltered = filterByType(zonesEventsRaw, hf?.zones || null);
  const goalEventsRaw = filterByTeam(data.events.filter(e => e.goal_x !== null && e.goal_y !== null), ht.heatmap_goal);
  const goalEventsFiltered = filterByType(goalEventsRaw, hf?.goal || null);

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
  const fieldEvents = fieldEventsFiltered;
  const fieldPts = fieldEventsFiltered.map(e => {
    const c = e.event_type?.color || '#f97316';
    return `<circle cx="${(e.field_x! / 100) * 660 + 10}" cy="${(e.field_y! / 100) * 420 + 10}" r="6" fill="${c}" stroke="white" stroke-width="1.5" opacity="0.85"/>`;
  }).join('');

  // Zones
  const zoneEvents = zonesEventsFiltered;
  const zoneOnlyCounts = zonesEventsFiltered.filter(e => e.label === 'Zone Défensive' || e.label === 'Zone Médiane' || e.label === 'Zone Offensive');
  const zO = zoneOnlyCounts.filter(e => (e.field_x ?? 0) > 66).length;
  const zM = zoneOnlyCounts.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66).length;
  const zD = zoneOnlyCounts.filter(e => (e.field_x ?? 0) < 33).length;
  const zT = zO + zM + zD || 1;

  // Détail par zone : quels types d'événements dans chaque zone
  // Mots-clés pertinents par zone (identiques à Heatmap.tsx)
  const ZONE_KEYWORDS = {
    defensive: ['récup', 'recup', 'tacle', 'tackle', 'faute', 'foul', 'duel', 'perte', 'interception', 'dégagement', 'arrêt', 'gardien', 'défens'],
    mediane:   ['passe', 'pass', 'relance', 'duel', 'faute', 'foul', 'récup', 'recup', 'perte', 'centre', 'transition', 'conduite'],
    offensive: ['tir', 'shot', 'frappe', 'but', 'penalty', 'coup franc', 'centre', 'dribble', 'faute', 'occasion', 'tête'],
  };

  const zoneDetailFn = (evts: MatchEventWithDetails[], keywords?: string[]) => {
    const byType: Record<string, number> = {};
    evts.forEach(e => {
      const n = e.event_type?.name || e.label || 'Autre';
      if (keywords) {
        const nameLower = n.toLowerCase();
        if (!keywords.some(k => nameLower.includes(k))) return;
      }
      byType[n] = (byType[n] || 0) + 1;
    });
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3);
    // Fallback sans filtre si aucun résultat
    if (sorted.length === 0 && keywords) {
      const fallback: Record<string, number> = {};
      evts.forEach(e => { const n = e.event_type?.name || e.label || 'Autre'; fallback[n] = (fallback[n] || 0) + 1; });
      return Object.entries(fallback).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n} ${c}`).join(' | ');
    }
    return sorted.map(([n, c]) => `${n} ${c}`).join(' | ');
  };

  const zoneOnlyPdf = zonesEventsFiltered.filter(e => e.label === 'Zone Défensive' || e.label === 'Zone Médiane' || e.label === 'Zone Offensive');
  const defEvts = zoneOnlyPdf.filter(e => (e.field_x ?? 0) < 33);
  const medEvts = zoneOnlyPdf.filter(e => (e.field_x ?? 0) >= 33 && (e.field_x ?? 0) <= 66);
  const offEvts = zoneOnlyPdf.filter(e => (e.field_x ?? 0) > 66);

  const zoneOffDetail = zoneDetailFn(offEvts, ZONE_KEYWORDS.offensive);
  const zoneMedDetail = zoneDetailFn(medEvts, ZONE_KEYWORDS.mediane);
  const zoneDefDetail = zoneDetailFn(defEvts, ZONE_KEYWORDS.defensive);

  // But
  const goalEvents = goalEventsFiltered;
  const goalPts = goalEventsFiltered.map(e => {
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
    return `<tr><td style="padding:5px 8px;font-size:11px;font-weight:600;border-bottom:1px solid #f1f5f9;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${t.color};margin-right:5px;vertical-align:middle;"></span>${t.name}</td><td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:${colorA};border-bottom:1px solid #f1f5f9;">${t.teamA}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;"><div style="display:flex;height:8px;overflow:hidden;background:#e2e8f0;"><div style="width:${aW}%;background:${colorA};"></div><div style="width:${100 - aW}%;background:${colorB};"></div></div></td><td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:${colorB};border-bottom:1px solid #f1f5f9;">${t.teamB}</td></tr>`;
  }).join('');

  // Tableau croisé : périodes (lignes) × types (colonnes) × équipes
  const topTypes = sortedTypes.slice(0, 6); // max 6 types pour tenir en A4

  const crossTableHeader = `
    <tr style="background:#f1f5f9;">
      <th style="padding:5px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;min-width:55px;">Période</th>
      ${topTypes.map(t => `
        <th colspan="2" style="padding:5px 6px;text-align:center;font-size:9px;font-weight:700;color:${t.color};border-left:1px solid #e2e8f0;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${t.color};margin-right:3px;vertical-align:middle;"></span>${t.name}
        </th>`).join('')}
      <th colspan="2" style="padding:5px 6px;text-align:center;font-size:9px;font-weight:700;color:#64748b;border-left:2px solid #cbd5e1;">TOTAL</th>
    </tr>
    <tr style="background:#f8fafc;">
      <th style="padding:3px 8px;font-size:8px;color:#94a3b8;"></th>
      ${topTypes.map(() => `
        <th style="padding:3px 4px;text-align:center;font-size:8px;font-weight:700;color:${colorA};border-left:1px solid #e2e8f0;width:22px;">${data.matchInfo.teamA.substring(0,3).toUpperCase()}</th>
        <th style="padding:3px 4px;text-align:center;font-size:8px;font-weight:700;color:${colorB};width:22px;">${data.matchInfo.teamB.substring(0,3).toUpperCase()}</th>`).join('')}
      <th style="padding:3px 4px;text-align:center;font-size:8px;font-weight:700;color:${colorA};border-left:2px solid #cbd5e1;width:22px;">${data.matchInfo.teamA.substring(0,3).toUpperCase()}</th>
      <th style="padding:3px 4px;text-align:center;font-size:8px;font-weight:700;color:${colorB};width:22px;">${data.matchInfo.teamB.substring(0,3).toUpperCase()}</th>
    </tr>`;

  const crossTableRows = periodData.filter(p => p.total > 0).map((p, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = topTypes.map(t => {
      const aCount = data.events.filter(e => {
        const mins = Math.floor(e.timestamp / 60);
        const i = periods.indexOf(p.label);
        const minStart = i * 15;
        return (e.event_type?.name || e.label || 'Autre') === t.name &&
          e.team === 'A' && mins >= minStart && (i < 5 ? mins < minStart + 15 : true);
      }).length;
      const bCount = data.events.filter(e => {
        const mins = Math.floor(e.timestamp / 60);
        const i = periods.indexOf(p.label);
        const minStart = i * 15;
        return (e.event_type?.name || e.label || 'Autre') === t.name &&
          e.team === 'B' && mins >= minStart && (i < 5 ? mins < minStart + 15 : true);
      }).length;
      return `
        <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:${aCount > 0 ? '700' : '400'};color:${aCount > 0 ? colorA : '#94a3b8'};border-left:1px solid #e2e8f0;background:${bg};">${aCount > 0 ? aCount : '—'}</td>
        <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:${bCount > 0 ? '700' : '400'};color:${bCount > 0 ? colorB : '#94a3b8'};background:${bg};">${bCount > 0 ? bCount : '—'}</td>`;
    }).join('');
    return `<tr>
      <td style="padding:5px 8px;font-weight:700;font-size:11px;background:${bg};color:#374151;">${p.label}</td>
      ${cells}
      <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:700;color:${colorA};border-left:2px solid #cbd5e1;background:${bg};">${p.teamA || '—'}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:700;color:${colorB};background:${bg};">${p.teamB || '—'}</td>
    </tr>`;
  }).join('');

  // Ligne totaux
  const crossTotalRow = `<tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;">
    <td style="padding:5px 8px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">Total</td>
    ${topTypes.map(t => {
      const aT = teamAEvents.filter(e => (e.event_type?.name || e.label || 'Autre') === t.name).length;
      const bT = teamBEvents.filter(e => (e.event_type?.name || e.label || 'Autre') === t.name).length;
      return `
        <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:800;color:${colorA};border-left:1px solid #e2e8f0;">${aT || '—'}</td>
        <td style="padding:5px 4px;text-align:center;font-size:11px;font-weight:800;color:${colorB};">${bT || '—'}</td>`;
    }).join('')}
    <td style="padding:5px 4px;text-align:center;font-size:12px;font-weight:800;color:${colorA};border-left:2px solid #cbd5e1;">${teamAEvents.length}</td>
    <td style="padding:5px 4px;text-align:center;font-size:12px;font-weight:800;color:${colorB};">${teamBEvents.length}</td>
  </tr>`;

  // Period rows condensees (conservé pour compatibilité)
  const periodRows = periodData.filter(p => p.total > 0).map(p => {
    const tags = Object.entries(p.byType).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, c]) => {
      const col = typeMap[n]?.color || '#6B7280';
      return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;background:${col}18;color:${col};margin-right:3px;">${n} ${c}</span>`;
    }).join('');
    return `<tr><td style="padding:5px 8px;font-weight:700;font-size:12px;border-bottom:1px solid #f1f5f9;width:60px;">${p.label}</td><td style="padding:5px 6px;text-align:center;font-weight:700;color:${colorA};border-bottom:1px solid #f1f5f9;width:30px;">${p.teamA}</td><td style="padding:5px 6px;text-align:center;font-weight:700;color:${colorB};border-bottom:1px solid #f1f5f9;width:30px;">${p.teamB}</td><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;">${tags}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport - ${data.matchInfo.teamA} vs ${data.matchInfo.teamB}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1e293b;}@media print{@page{size:A4;margin:6mm 8mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}.page{max-width:900px;margin:0 auto;padding:12px;}h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:6px;}table{width:100%;border-collapse:collapse;}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;}</style>
</head><body><div class="page">

${show('score') ? `<div style="background:#1a2332;border-radius:10px;padding:16px 20px;margin-bottom:12px;color:white;">
${data.matchInfo.competition ? `<div style="text-align:center;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:8px;">${data.matchInfo.competition}</div>` : ''}
<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;">
<div style="display:flex;align-items:center;gap:8px;">${mkLogo(data.matchInfo.teamALogoUrl, data.matchInfo.teamA, '#22c55e')}<div style="font-size:14px;font-weight:800;color:${colorA};">${data.matchInfo.teamA}</div></div>
<div style="text-align:center;"><div style="font-size:36px;font-weight:900;letter-spacing:4px;">${scoreDisplay}</div><div style="font-size:9px;color:#94a3b8;margin-top:2px;">${data.matchInfo.date}${data.matchInfo.duration ? ' | ' + formatTime(data.matchInfo.duration) : ''}</div></div>
<div style="display:flex;align-items:center;gap:8px;flex-direction:row-reverse;text-align:right;">${mkLogo(data.matchInfo.teamBLogoUrl, data.matchInfo.teamB, '#f97316')}<div style="font-size:14px;font-weight:800;color:${colorB};">${data.matchInfo.teamB}</div></div>
</div></div>` : ''}

${show('kpi') ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:${colorA};">${teamAEvents.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">${data.matchInfo.teamA}</div></div>
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:${colorB};">${teamBEvents.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">${data.matchInfo.teamB}</div></div>
<div class="card" style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#334155;">${data.events.length}</div><div style="font-size:9px;color:#64748b;font-weight:600;">Total</div></div>

</div>` : ''}

${show('xg') && xgA + xgB > 0 ? `<div class="card" style="margin-bottom:12px;padding:10px 16px;">
  <div style="text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">⚽ Expected Goals (xG)</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:8px;">
    <div style="text-align:center;"><div style="font-size:28px;font-weight:900;color:${colorA};">${xgA.toFixed(2)}</div><div style="font-size:9px;color:#64748b;">${data.matchInfo.teamA}</div><div style="font-size:8px;color:#94a3b8;">${shotsA} tir${shotsA > 1 ? 's' : ''}</div></div>
    <div><div style="display:flex;height:8px;overflow:hidden;background:#e2e8f0;"><div style="width:${xgBarA}%;background:${colorA};"></div><div style="flex:1;background:${colorB};"></div></div></div>
    <div style="text-align:center;"><div style="font-size:28px;font-weight:900;color:${colorB};">${xgB.toFixed(2)}</div><div style="font-size:9px;color:#64748b;">${data.matchInfo.teamB}</div><div style="font-size:8px;color:#94a3b8;">${shotsB} tir${shotsB > 1 ? 's' : ''}</div></div>
  </div>
</div>` : ''}

<div style="display:grid;grid-template-columns:${[show('heatmap_field'), show('heatmap_zones'), show('heatmap_goal') && goalEvents.length > 0].filter(Boolean).length > 1 ? [show('heatmap_field'), show('heatmap_zones'), show('heatmap_goal') && goalEvents.length > 0].filter(Boolean).map(() => '1fr').join(' ') : '1fr'};gap:10px;margin-bottom:12px;">
${show('heatmap_field') ? `<div><h2>Heatmap terrain</h2><div class="card" style="padding:3px;"><svg viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:4px;"><rect width="680" height="440" fill="#1A6B35" rx="4"/><rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/><line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/><circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="10" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="10" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="590" y="130" width="80" height="180" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="640" y="170" width="30" height="100" fill="none" stroke="#2A8A4A" stroke-width="1.5"/>${fieldPts}</svg></div></div>` : ''}
${show('heatmap_zones') ? `<div><h2>Répartition par zone</h2><div class="card" style="padding:3px;"><svg viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;border-radius:4px;"><rect width="680" height="440" fill="#1A6B35" rx="4"/><rect x="10" y="10" width="660" height="420" fill="none" stroke="#2A8A4A" stroke-width="2"/><line x1="340" y1="10" x2="340" y2="430" stroke="#2A8A4A" stroke-width="1.5"/><circle cx="340" cy="220" r="50" fill="none" stroke="#2A8A4A" stroke-width="1.5"/><rect x="10" y="10" width="220" height="420" fill="rgba(59,130,246,0.2)"/><line x1="230" y1="10" x2="230" y2="430" stroke="rgba(59,130,246,0.5)" stroke-width="2" stroke-dasharray="8,4"/><text x="120" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zD}</text><text x="120" y="235" text-anchor="middle" font-size="10" fill="rgba(180,210,255,0.8)" font-weight="600" font-family="sans-serif">DEF (${Math.round((zD/zT)*100)}%)</text><text x="120" y="255" text-anchor="middle" font-size="9" fill="rgba(180,210,255,0.6)" font-family="sans-serif">${zoneDefDetail}</text><rect x="230" y="10" width="220" height="420" fill="rgba(250,204,21,0.12)"/><line x1="450" y1="10" x2="450" y2="430" stroke="rgba(250,204,21,0.5)" stroke-width="2" stroke-dasharray="8,4"/><text x="340" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zM}</text><text x="340" y="235" text-anchor="middle" font-size="10" fill="rgba(255,240,180,0.8)" font-weight="600" font-family="sans-serif">MED (${Math.round((zM/zT)*100)}%)</text><text x="340" y="255" text-anchor="middle" font-size="9" fill="rgba(255,240,180,0.6)" font-family="sans-serif">${zoneMedDetail}</text><rect x="450" y="10" width="220" height="420" fill="rgba(239,68,68,0.2)"/><text x="560" y="210" text-anchor="middle" font-size="32" fill="white" font-weight="900" font-family="sans-serif">${zO}</text><text x="560" y="235" text-anchor="middle" font-size="10" fill="rgba(255,200,200,0.8)" font-weight="600" font-family="sans-serif">OFF (${Math.round((zO/zT)*100)}%)</text><text x="560" y="255" text-anchor="middle" font-size="9" fill="rgba(255,200,200,0.6)" font-family="sans-serif">${zoneOffDetail}</text></svg></div></div>` : ''}
${show('heatmap_goal') && goalEvents.length > 0 ? `<div><h2>Zones de frappe</h2><div class="card" style="padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;"><svg viewBox="0 0 300 110" xmlns="http://www.w3.org/2000/svg" style="width:100%;"><rect width="300" height="100" fill="#0f1a2a" rx="4"/><rect x="5" y="5" width="290" height="90" fill="none" stroke="white" stroke-width="3" rx="2"/><line x1="100" y1="5" x2="100" y2="95" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="200" y1="5" x2="200" y2="95" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="5" y1="35" x2="295" y2="35" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="5" y1="65" x2="295" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>${goalPts}<rect x="0" y="100" width="300" height="10" fill="#166534"/></svg><div style="display:flex;gap:8px;margin-top:6px;font-size:9px;"><span style="color:#22c55e;">&#9679; But</span><span style="color:#facc15;">&#9679; Arrêté</span><span style="color:#ef4444;">&#9679; Manqué</span></div><div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:600;">${goalEvents.length} tir(s)</div></div></div>` : ''}
</div>

<div style="display:grid;grid-template-columns:${show('stats_types') && show('timeline') ? '1fr 1fr' : '1fr'};gap:10px;margin-bottom:12px;">
${show('stats_types') ? `<div><h2>Actions par type</h2><div class="card" style="padding:0;overflow:hidden;"><table><thead><tr style="background:#f1f5f9;"><th style="padding:4px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;">Type</th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:${colorA};width:30px;">${data.matchInfo.teamA}</th><th style="padding:4px 6px;min-width:60px;"></th><th style="padding:4px 6px;text-align:center;font-size:9px;font-weight:700;color:${colorB};width:30px;">${data.matchInfo.teamB}</th></tr></thead><tbody>${typeRows}</tbody></table></div></div>` : ''}
${show('timeline') ? `<div style="margin-bottom:12px;"><h2>Activité par période et par type</h2><div class="card" style="padding:0;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead>${crossTableHeader}</thead><tbody>${crossTableRows}${crossTotalRow}</tbody></table></div></div>` : ''}
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
// rebuild Thu May 21 07:12:36 UTC 2026
