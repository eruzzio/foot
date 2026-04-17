import { MatchEventWithDetails, Match } from '../types/database';
import { generateVEOTimestampLink, formatTimeForVEO } from './veoParser';

export interface TimelineLink {
  url: string;
  timestamp: string;
  eventDescription: string;
  format: 'hudl' | 'dartfish' | 'once' | 'generic' | 'veo';
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateEventDescription(event: MatchEventWithDetails): string {
  const parts: string[] = [];

  parts.push(`Team ${event.team}`);

  if (event.player?.number) {
    parts.push(`#${event.player.number}`);
    if (event.player.name) {
      parts.push(`(${event.player.name})`);
    }
  }

  if (event.event_type?.name) {
    parts.push(`- ${event.event_type.name}`);
  } else if (event.label) {
    parts.push(`- ${event.label}`);
  }

  if (event.outcome && event.outcome !== 'neutral') {
    parts.push(`[${event.outcome.toUpperCase()}]`);
  }

  if (event.keywords && event.keywords.length > 0) {
    parts.push(`(${event.keywords.join(', ')})`);
  }

  return parts.join(' ');
}

export function generateTimelineLinks(
  event: MatchEventWithDetails,
  match: Match,
  baseUrl: string = window.location.origin
): TimelineLink[] {
  const timeString = formatTime(event.timestamp);
  const description = generateEventDescription(event);
  const eventId = event.id;
  const matchId = match.id;

  const links: TimelineLink[] = [];

  links.push({
    url: `${baseUrl}?match=${matchId}&event=${eventId}&time=${event.timestamp}`,
    timestamp: timeString,
    eventDescription: description,
    format: 'generic',
  });

  links.push({
    url: `${baseUrl}#${timeString}`,
    timestamp: timeString,
    eventDescription: description,
    format: 'hudl',
  });

  links.push({
    url: `${baseUrl}?t=${event.timestamp}s&desc=${encodeURIComponent(description)}`,
    timestamp: timeString,
    eventDescription: description,
    format: 'dartfish',
  });

  links.push({
    url: `${baseUrl}?timestamp=${timeString}&event_id=${eventId}&team=${event.team}`,
    timestamp: timeString,
    eventDescription: description,
    format: 'once',
  });

  if (match.video_share_id) {
    const veoLink = generateVEOTimestampLink(match.video_share_id, event.timestamp);
    links.push({
      url: veoLink.url,
      timestamp: veoLink.timeString,
      eventDescription: description,
      format: 'veo',
    });
  }

  return links;
}

export function generateTimelineCSV(events: MatchEventWithDetails[], match: Match): string {
  const headers = ['Time', 'Team', 'Player Number', 'Player Name', 'Event Type', 'Outcome', 'Keywords', 'Notes', 'Link'];

  const rows = events.map(event => [
    formatTime(event.timestamp),
    event.team,
    event.player?.number || '',
    event.player?.name || '',
    event.event_type?.name || event.label || '',
    event.outcome || '',
    event.keywords?.join(';') || '',
    event.notes || '',
    `${window.location.origin}?match=${match.id}&event=${event.id}&time=${event.timestamp}`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function generateTimelineMarkdown(events: MatchEventWithDetails[], match: Match): string {
  const baseUrl = window.location.origin;
  const title = `# Timeline - ${match.team_a_name} vs ${match.team_b_name}`;
  const matchDate = new Date(match.match_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const header = [
    title,
    `**Date:** ${matchDate}`,
    `**Score:** ${match.team_a_name} ${match.team_a_score} - ${match.team_b_score} ${match.team_b_name}`,
    '',
  ].join('\n');

  const eventLines = events.map(event => {
    const time = formatTime(event.timestamp);
    const desc = generateEventDescription(event);
    const url = `${baseUrl}?match=${match.id}&event=${event.id}&time=${event.timestamp}`;
    return `- **${time}** - ${desc} - [Voir](#${url})`;
  });

  return `${header}\n${eventLines.join('\n')}`;
}
