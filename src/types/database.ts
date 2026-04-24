export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  created_at: string;
}

export interface EventType {
  id: string;
  name: string;
  category: string;
  has_outcome: boolean;
  color: string;
  icon: string;
  created_at: string;
}

export interface Match {
  id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  match_date: string;
  status: 'setup' | 'in_progress' | 'paused' | 'completed';
  match_time: number;
  created_at: string;
  video_url?: string | null;
  video_provider?: string | null;
  video_share_id?: string | null;
  video_duration?: number | null;
}

export interface ButtonTemplate {
  id: string;
  event_type_id: string;
  label: string;
  position: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type_id: string | null;
  label: string | null;
  team: 'A' | 'B';
  player_id: string | null;
  timestamp: number;
  outcome: 'success' | 'failure' | 'neutral';
  notes: string | null;
  keywords: string[];
  parent_event_id: string | null;
  location_id: string | null;
  video_timestamp: number | null;
  field_x: number | null;
  field_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  created_at: string;
}

export interface EventTypeWithTemplate extends EventType {
  template?: ButtonTemplate;
}

export interface MatchEventWithDetails extends MatchEvent {
  event_type?: EventType | null;
  player?: Player;
}

export interface Statistics {
  totalEvents: number;
  eventsByType: Record<string, { count: number; success: number; failure: number }>;
  eventsByTeam: Record<'A' | 'B', number>;
  eventsByPeriod: Record<string, number>;
  successRate: number;
}

export interface Panel {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_default: boolean;
  use_free_layout: boolean;
  created_at: string;
  updated_at: string;
}

export interface PanelButton {
  id: string;
  panel_id: string;
  event_type_id: string | null;
  label: string;
  position: number;
  color: string;
  layout_x: number | null;
  layout_y: number | null;
  width: number | null;
  height: number | null;
  button_type: 'event' | 'keyword';
  tab_page: number;
  shortcut_key: string | null;
  group_name: string | null;
  parent_button_id: string | null;
  display_order: number;
  team_association: 'A' | 'B' | null;
  is_zone: boolean;
  location_mode: 'none' | 'field' | 'field_and_goal';
  created_at: string;
}

export interface PanelButtonWithEventType extends PanelButton {
  event_type?: EventType;
  sub_buttons?: PanelButtonWithEventType[];
}

export interface TeamFormation {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormationPosition {
  id: string;
  formation_id: string;
  player_id: string | null;
  position_x: number;
  position_y: number;
  role: string;
  created_at: string;
}

export interface MatchFormation {
  id: string;
  match_id: string;
  formation_id: string;
  team: 'A' | 'B';
  created_at: string;
  updated_at: string;
}

export interface FormationWithPositions extends TeamFormation {
  positions?: FormationPosition[];
}
