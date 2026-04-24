import { MatchEventWithDetails } from '../types/database';

interface ExportProData {
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
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.00`;
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

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export au format Hudl SportsCode XML
 * Compatible avec Hudl SportsCode, Nacsport, Wyscout
 */
export function exportToSportsCodeXML(data: ExportProData): void {
  const eventsByType = new Map<string, MatchEventWithDetails[]>();

  data.events.forEach(event => {
    const typeName = event.event_type?.name || event.label || 'Event';
    if (!eventsByType.has(typeName)) {
      eventsByType.set(typeName, []);
    }
    eventsByType.get(typeName)!.push(event);
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<file>\n`;
  xml += `  <APPLICATION>ORION Sports Analytics</APPLICATION>\n`;
  xml += `  <ALL_INSTANCES>\n`;

  let instanceId = 1;

  eventsByType.forEach((events, typeName) => {
    events.forEach(event => {
      const startTime = event.timestamp;
      const endTime = startTime + 5; // Durée par défaut de 5 secondes
      const team = event.team === 'A' ? data.matchInfo.teamA : data.matchInfo.teamB;
      const player = event.player ? `#${event.player.number} ${event.player.name || ''}`.trim() : '';
      const subAction = getSubAction(event);
      const outcome = event.outcome || '';

      xml += `    <instance>\n`;
      xml += `      <ID>${instanceId}</ID>\n`;
      xml += `      <start>${formatTimeHMS(startTime)}</start>\n`;
      xml += `      <end>${formatTimeHMS(endTime)}</end>\n`;
      xml += `      <code>${escapeXml(typeName)}</code>\n`;
      xml += `      <label>\n`;
      xml += `        <group>Team</group>\n`;
      xml += `        <text>${escapeXml(team)}</text>\n`;
      xml += `      </label>\n`;
      if (player) {
        xml += `      <label>\n`;
        xml += `        <group>Player</group>\n`;
        xml += `        <text>${escapeXml(player)}</text>\n`;
        xml += `      </label>\n`;
      }
      if (outcome) {
        xml += `      <label>\n`;
        xml += `        <group>Result</group>\n`;
        xml += `        <text>${escapeXml(outcome)}</text>\n`;
        xml += `      </label>\n`;
      }
      if (subAction) {
        xml += `      <label>\n`;
        xml += `        <group>Detail</group>\n`;
        xml += `        <text>${escapeXml(subAction)}</text>\n`;
        xml += `      </label>\n`;
      }
      if (event.field_x !== null && event.field_y !== null) {
        xml += `      <label>\n`;
        xml += `        <group>Position</group>\n`;
        xml += `        <text>${event.field_x},${event.field_y}</text>\n`;
        xml += `      </label>\n`;
      }
      xml += `    </instance>\n`;
      instanceId++;
    });
  });

  xml += `  </ALL_INSTANCES>\n`;
  xml += `</file>\n`;

  const filename = `orion_${data.matchInfo.teamA}_vs_${data.matchInfo.teamB}_sportscode.xml`;
  downloadFile(xml, filename, 'application/xml');
}

/**
 * Export au format Dartfish CSV
 * Compatible avec Dartfish (import CSV avec timestamp)
 */
export function exportToDartfishCSV(data: ExportProData): void {
  const headers = [
    'Position',
    'Duration',
    'Name',
    'Team',
    'Player',
    'Sub-action',
    'Result',
    'Field X',
    'Field Y',
    'Notes'
  ];

  const rows = data.events.map(event => {
    const startTime = formatTimeHMS(event.timestamp);
    const duration = '00:00:05.00'; // 5 secondes par défaut
    const name = event.event_type?.name || event.label || 'Event';
    const team = event.team === 'A' ? data.matchInfo.teamA : data.matchInfo.teamB;
    const player = event.player ? `#${event.player.number} ${event.player.name || ''}`.trim() : '';
    const subAction = getSubAction(event);
    const outcome = event.outcome || '';
    const fieldX = event.field_x !== null ? event.field_x.toString() : '';
    const fieldY = event.field_y !== null ? event.field_y.toString() : '';
    const notes = event.notes || '';

    return [startTime, duration, name, team, player, subAction, outcome, fieldX, fieldY, notes];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  const filename = `orion_${data.matchInfo.teamA}_vs_${data.matchInfo.teamB}_dartfish.csv`;
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export au format LongoMatch CSV
 * Compatible avec LongoMatch (import événements)
 */
export function exportToLongoMatchCSV(data: ExportProData): void {
  const headers = [
    'EventType',
    'Start',
    'Stop',
    'Team',
    'Player',
    'Tags',
    'FieldPosition',
    'HalfField',
    'Notes'
  ];

  const rows = data.events.map(event => {
    const startMs = event.timestamp * 1000000000; // nanosecondes
    const stopMs = (event.timestamp + 5) * 1000000000;
    const name = event.event_type?.name || event.label || 'Event';
    const team = event.team === 'A' ? data.matchInfo.teamA : data.matchInfo.teamB;
    const player = event.player ? `${event.player.number}` : '';
    const tags = [getSubAction(event), event.outcome].filter(Boolean).join(',');
    const fieldPos = (event.field_x !== null && event.field_y !== null)
      ? `${event.field_x};${event.field_y}`
      : '';
    const halfField = event.field_x !== null
      ? (event.field_x < 50 ? 'Left' : 'Right')
      : '';
    const notes = event.notes || '';

    return [name, startMs, stopMs, team, player, tags, fieldPos, halfField, notes];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const filename = `orion_${data.matchInfo.teamA}_vs_${data.matchInfo.teamB}_longomatch.csv`;
  downloadFile(csvContent, filename, 'text/csv');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
