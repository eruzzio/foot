import { MatchEventWithDetails } from '../types/database';

/**
 * Calcul xG simplifié basé sur :
 * - Distance au but (field_x, field_y)
 * - Angle au but
 * - Type de tir (penalty, tête, pied)
 *
 * Terrain normalisé : 0-100% en x et y
 * But adverse : x=100, y=50 (centre du but en bas du terrain)
 */

const GOAL_X = 100; // % position du but en x (côté offensif)
const GOAL_Y = 50;  // % centre du but en y

// Distance max réaliste pour un tir (en unités %)
const MAX_DISTANCE = 50;

function calcDistance(fx: number, fy: number): number {
  const dx = GOAL_X - fx;
  const dy = GOAL_Y - fy;
  return Math.sqrt(dx * dx + dy * dy);
}

function calcAngle(fx: number, fy: number): number {
  // Largeur du but = ~7.32m / 105m terrain = ~7%
  const goalHalfWidth = 3.66;
  const dx = GOAL_X - fx;
  const dy = fy - GOAL_Y;

  if (dx <= 0) return 0;

  const angleRad = Math.atan2(goalHalfWidth * dx, dx * dx + dy * dy - goalHalfWidth * goalHalfWidth);
  return Math.max(0, angleRad);
}

function xGFromDistanceAngle(distance: number, angleDeg: number, isFoot: boolean): number {
  // Modèle inspiré de StatsBomb open model simplifié
  const distanceFactor = Math.exp(-distance / 20); // décroissance exponentielle
  const angleFactor = Math.sin(angleDeg) * 0.8 + 0.2; // angle normalisé
  const typeFactor = isFoot ? 1.0 : 0.75; // tête moins précise

  return Math.min(0.99, Math.max(0.01, distanceFactor * angleFactor * typeFactor * 0.85));
}

export function calculateXG(event: MatchEventWithDetails): number | null {
  const label = ((event.event_type as { name?: string } | null)?.name ?? event.label ?? '').toLowerCase();
  const isShotEvent = ['tir', 'frappe', 'shot', 'but', 'penalty', 'coup franc', 'tête'].some(k => label.includes(k));
  if (!isShotEvent) return null;

  // Penalty → xG fixe
  if (label.includes('penalty') || label.includes('pénalty')) return 0.76;

  // Coup franc direct → légèrement moins
  if (label.includes('coup franc') || label.includes('coup-franc')) {
    const fx = event.field_x ?? 75;
    const fy = event.field_y ?? 50;
    const dist = calcDistance(fx, fy);
    const angle = calcAngle(fx, fy);
    return Math.round(xGFromDistanceAngle(dist, angle, true) * 0.7 * 100) / 100;
  }

  // Pas de position → xG moyen estimé
  if (event.field_x === null || event.field_y === null) return 0.1;

  const dist = calcDistance(event.field_x, event.field_y);
  const angle = calcAngle(event.field_x, event.field_y);
  const isHeader = label.includes('tête') || label.includes('tete');

  const xg = xGFromDistanceAngle(dist, angle, !isHeader);
  return Math.round(xg * 100) / 100;
}

export function calculateTeamXG(events: MatchEventWithDetails[], team: 'A' | 'B'): number {
  return events
    .filter(e => e.team === team)
    .map(e => calculateXG(e))
    .filter((xg): xg is number => xg !== null)
    .reduce((sum, xg) => sum + xg, 0);
}

export function getShotEvents(events: MatchEventWithDetails[]): MatchEventWithDetails[] {
  return events.filter(e => {
    const label = ((e.event_type as { name?: string } | null)?.name ?? e.label ?? '').toLowerCase();
    return ['tir', 'frappe', 'shot', 'but', 'penalty', 'coup franc'].some(k => label.includes(k));
  });
}
