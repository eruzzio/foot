import * as XLSX from 'xlsx';
import { MatchEventWithDetails } from '../types/database';

interface ExportData {
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

export function exportToCSV(data: ExportData): void {
  const headers = [
    'Temps',
    'Équipe',
    'Joueur',
    'Événement',
    'Sous-action',
    'Résultat',
    'Notes'
  ];

  const rows = data.events.map(event => [
    formatTime(event.timestamp),
    event.team === 'A' ? data.matchInfo.teamA : data.matchInfo.teamB,
    event.player?.number?.toString() || '',
    event.event_type?.name || event.label || '',
    getSubAction(event),
    event.outcome || '',
    event.notes || ''
  ]);

  const csvContent = [
    `Match: ${data.matchInfo.teamA} vs ${data.matchInfo.teamB}`,
    `Date: ${data.matchInfo.date}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, `match_${data.matchInfo.teamA}_vs_${data.matchInfo.teamB}_${Date.now()}.csv`, 'text/csv');
}

export function exportToExcel(data: ExportData): void {
  const workbook = XLSX.utils.book_new();
  const teamAEvents = data.events.filter(e => e.team === 'A');
  const teamBEvents = data.events.filter(e => e.team === 'B');

  const teamASuccess = teamAEvents.filter(e => e.outcome === 'success').length;
  const teamBSuccess = teamBEvents.filter(e => e.outcome === 'success').length;
  const teamAFailure = teamAEvents.filter(e => e.outcome === 'failure').length;
  const teamBFailure = teamBEvents.filter(e => e.outcome === 'failure').length;
  const teamASuccessRate = teamAEvents.length > 0 ? ((teamASuccess / teamAEvents.length) * 100).toFixed(1) + '%' : '-';
  const teamBSuccessRate = teamBEvents.length > 0 ? ((teamBSuccess / teamBEvents.length) * 100).toFixed(1) + '%' : '-';

  const summaryData: (string | number)[][] = [
    ['RAPPORT DE MATCH'],
    [],
    ['Match', `${data.matchInfo.teamA} vs ${data.matchInfo.teamB}`],
    ['Date', data.matchInfo.date],
  ];

  if (data.matchInfo.scoreA !== undefined && data.matchInfo.scoreB !== undefined) {
    summaryData.push(['Score', `${data.matchInfo.scoreA} - ${data.matchInfo.scoreB}`]);
  }
  if (data.matchInfo.location) {
    summaryData.push(['Lieu', data.matchInfo.location]);
  }
  if (data.matchInfo.competition) {
    summaryData.push(['Compétition', data.matchInfo.competition]);
  }
  if (data.matchInfo.duration !== undefined) {
    summaryData.push(['Durée', formatTime(data.matchInfo.duration)]);
  }

  summaryData.push(
    [],
    ['STATISTIQUES GLOBALES'],
    ['', data.matchInfo.teamA, data.matchInfo.teamB, 'Total'],
    ['Total d\'événements', teamAEvents.length, teamBEvents.length, data.events.length],
    ['Actions réussies', teamASuccess, teamBSuccess, teamASuccess + teamBSuccess],
    ['Actions échouées', teamAFailure, teamBFailure, teamAFailure + teamBFailure],
    ['Taux de réussite', teamASuccessRate, teamBSuccessRate, ''],
    [],
    ['RÉSUMÉ PAR TYPE D\'ÉVÉNEMENT'],
    ['Type d\'événement', data.matchInfo.teamA, data.matchInfo.teamB],
  );

  const eventTypes = [...new Set(data.events.map(e => e.event_type?.name).filter(Boolean))];
  eventTypes.forEach(type => {
    const teamACount = teamAEvents.filter(e => e.event_type?.name === type).length;
    const teamBCount = teamBEvents.filter(e => e.event_type?.name === type).length;
    summaryData.push([type, teamACount, teamBCount]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

  const teamAData = [
    [`${data.matchInfo.teamA.toUpperCase()} - DÉTAIL DES ACTIONS`],
    [],
    ['Temps', 'Joueur', 'Événement', 'Sous-action', 'Résultat', 'Notes'],
    ...teamAEvents.map(event => [
      formatTime(event.timestamp),
      event.player?.number?.toString() || '-',
      event.event_type?.name || event.label || '-',
      getSubAction(event),
      event.outcome || '-',
      event.notes || '-'
    ])
  ];
  const teamASheet = XLSX.utils.aoa_to_sheet(teamAData);
  teamASheet['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, teamASheet, data.matchInfo.teamA);

  const teamBData = [
    [`${data.matchInfo.teamB.toUpperCase()} - DÉTAIL DES ACTIONS`],
    [],
    ['Temps', 'Joueur', 'Événement', 'Sous-action', 'Résultat', 'Notes'],
    ...teamBEvents.map(event => [
      formatTime(event.timestamp),
      event.player?.number?.toString() || '-',
      event.event_type?.name || event.label || '-',
      getSubAction(event),
      event.outcome || '-',
      event.notes || '-'
    ])
  ];
  const teamBSheet = XLSX.utils.aoa_to_sheet(teamBData);
  teamBSheet['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, teamBSheet, data.matchInfo.teamB);

  const statsData = [
    ['STATISTIQUES COMPARÉES PAR TYPE D\'ÉVÉNEMENT'],
    [],
    ['Type d\'événement', data.matchInfo.teamA, '%', data.matchInfo.teamB, '%', 'Total'],
  ];

  eventTypes.forEach(type => {
    const teamACount = teamAEvents.filter(e => e.event_type?.name === type).length;
    const teamBCount = teamBEvents.filter(e => e.event_type?.name === type).length;
    const total = teamACount + teamBCount;
    const teamAPercent = total > 0 ? ((teamACount / total) * 100).toFixed(1) + '%' : '0%';
    const teamBPercent = total > 0 ? ((teamBCount / total) * 100).toFixed(1) + '%' : '0%';
    statsData.push([type, teamACount, teamAPercent, teamBCount, teamBPercent, total]);
  });

  statsData.push([]);
  statsData.push(['TOTAL', teamAEvents.length, '100%', teamBEvents.length, '100%', data.events.length]);

  const outcomeTypes = [...new Set(data.events.map(e => e.outcome).filter(Boolean))];
  if (outcomeTypes.length > 0) {
    statsData.push([]);
    statsData.push(['STATISTIQUES PAR RÉSULTAT']);
    statsData.push([]);
    statsData.push(['Résultat', data.matchInfo.teamA, '%', data.matchInfo.teamB, '%', 'Total']);

    outcomeTypes.forEach(outcome => {
      const teamACount = teamAEvents.filter(e => e.outcome === outcome).length;
      const teamBCount = teamBEvents.filter(e => e.outcome === outcome).length;
      const total = teamACount + teamBCount;
      const teamAPercent = total > 0 ? ((teamACount / total) * 100).toFixed(1) + '%' : '0%';
      const teamBPercent = total > 0 ? ((teamBCount / total) * 100).toFixed(1) + '%' : '0%';
      statsData.push([outcome || 'Non spécifié', teamACount, teamAPercent, teamBCount, teamBPercent, total]);
    });
  }

  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  statsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiques');

  const allEventsData = [
    ['CHRONOLOGIE COMPLÈTE DU MATCH'],
    [],
    ['Temps', 'Équipe', 'Joueur', 'Événement', 'Sous-action', 'Résultat', 'Notes'],
    ...data.events.map(event => [
      formatTime(event.timestamp),
      event.team === 'A' ? data.matchInfo.teamA : data.matchInfo.teamB,
      event.player?.number?.toString() || '-',
      event.event_type?.name || event.label || '-',
      getSubAction(event),
      event.outcome || '-',
      event.notes || '-'
    ])
  ];
  const allEventsSheet = XLSX.utils.aoa_to_sheet(allEventsData);
  allEventsSheet['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, allEventsSheet, 'Chronologie');

  XLSX.writeFile(workbook, `match_${data.matchInfo.teamA}_vs_${data.matchInfo.teamB}_${Date.now()}.xlsx`);
}

function getSubAction(event: ExportData['events'][0]): string {
  const parts: string[] = [];
  if (event.label && event.event_type?.name && event.label !== event.event_type.name) {
    parts.push(event.label);
  }
  if (event.keywords && event.keywords.length > 0) {
    parts.push(...event.keywords);
  }
  return parts.length > 0 ? parts.join(', ') : '-';
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
