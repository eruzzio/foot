/*
  # Sports Coding Application Schema

  ## Overview
  This migration creates the complete database schema for a live sports coding and analysis application.
  The system allows coaches and analysts to code matches in real-time using customizable buttons,
  then automatically generates statistics and insights from the event timeline.

  ## Tables Created

  ### 1. teams
  Stores team information
  - id: unique identifier
  - name: team name
  - created_at: timestamp of creation

  ### 2. players
  Stores player information linked to teams
  - id: unique identifier
  - team_id: reference to teams table
  - name: player name
  - number: jersey number
  - created_at: timestamp of creation

  ### 3. event_types
  Standard event types for statistics (Tir, Passe, Perte, etc.)
  - id: unique identifier
  - name: event type name (e.g., "Tir", "Passe")
  - category: grouping category (attack, defense, transition)
  - has_outcome: whether this event has success/failure outcome
  - color: default color for UI display
  - icon: icon identifier
  - created_at: timestamp of creation

  ### 4. matches
  Match information and metadata
  - id: unique identifier
  - team_a_id: reference to first team
  - team_b_id: reference to second team
  - match_date: date of the match
  - status: match status (setup, in_progress, paused, completed)
  - match_time: current match time in seconds
  - created_at: timestamp of creation

  ### 5. button_templates
  Customizable button configurations
  - id: unique identifier
  - event_type_id: reference to standard event type
  - label: custom display label
  - position: button position in UI
  - color: custom color
  - is_active: whether button is currently visible
  - created_at: timestamp of creation

  ### 6. match_events
  Timeline of events clicked during live coding
  - id: unique identifier
  - match_id: reference to match
  - event_type_id: reference to event type
  - team: which team (A or B)
  - player_id: optional reference to player
  - timestamp: match time when event occurred (in seconds)
  - outcome: result (success, failure, neutral)
  - notes: optional text notes
  - created_at: timestamp of creation

  ## Security
  - RLS enabled on all tables
  - Public access policies for MVP (to be restricted in production with auth)

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - Foreign keys ensure data integrity
  - Indexes on frequently queried columns for performance
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  number integer,
  created_at timestamptz DEFAULT now()
);

-- Create event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  has_outcome boolean DEFAULT true,
  color text DEFAULT '#3B82F6',
  icon text DEFAULT 'circle',
  created_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  match_date timestamptz DEFAULT now(),
  status text DEFAULT 'setup',
  match_time integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create button_templates table
CREATE TABLE IF NOT EXISTS button_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id uuid REFERENCES event_types(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer DEFAULT 0,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create match_events table
CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  event_type_id uuid REFERENCES event_types(id) ON DELETE SET NULL,
  team text NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  timestamp integer NOT NULL,
  outcome text DEFAULT 'neutral',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_event_type_id ON match_events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_match_events_timestamp ON match_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_button_templates_event_type_id ON button_templates(event_type_id);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE button_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (MVP - to be restricted with auth later)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Public can insert teams"
  ON teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update teams"
  ON teams FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete teams"
  ON teams FOR DELETE
  USING (true);

CREATE POLICY "Public can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Public can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update players"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete players"
  ON players FOR DELETE
  USING (true);

CREATE POLICY "Public can view event_types"
  ON event_types FOR SELECT
  USING (true);

CREATE POLICY "Public can insert event_types"
  ON event_types FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update event_types"
  ON event_types FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete event_types"
  ON event_types FOR DELETE
  USING (true);

CREATE POLICY "Public can view matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "Public can insert matches"
  ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update matches"
  ON matches FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete matches"
  ON matches FOR DELETE
  USING (true);

CREATE POLICY "Public can view button_templates"
  ON button_templates FOR SELECT
  USING (true);

CREATE POLICY "Public can insert button_templates"
  ON button_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update button_templates"
  ON button_templates FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete button_templates"
  ON button_templates FOR DELETE
  USING (true);

CREATE POLICY "Public can view match_events"
  ON match_events FOR SELECT
  USING (true);

CREATE POLICY "Public can insert match_events"
  ON match_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update match_events"
  ON match_events FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete match_events"
  ON match_events FOR DELETE
  USING (true);

-- Insert default event types for common sports actions
INSERT INTO event_types (name, category, has_outcome, color, icon) VALUES
  ('Tir', 'attack', true, '#10B981', 'target'),
  ('Passe', 'attack', true, '#3B82F6', 'move'),
  ('Dribble', 'attack', true, '#8B5CF6', 'zap'),
  ('Perte', 'attack', false, '#EF4444', 'x-circle'),
  ('Récupération', 'defense', false, '#10B981', 'shield'),
  ('Interception', 'defense', false, '#3B82F6', 'shield-check'),
  ('Faute', 'general', false, '#F59E0B', 'alert-circle'),
  ('Tacle', 'defense', true, '#6366F1', 'swords')
ON CONFLICT DO NOTHING;
