/*
  # Add Match Formations Support

  ## Description
  This migration adds the capability to save and manage tactical formations specific to each match.
  Users can create different formations for different matches and quickly switch between them.

  ## Changes Made

  ### 1. New Table: match_formations
  - `id` (uuid, primary key) - Unique identifier
  - `match_id` (uuid, foreign key) - Links to matches table
  - `formation_id` (uuid, foreign key) - Links to team_formations table
  - `team` (text) - Which team this formation is for ('A' or 'B')
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  This table allows users to associate specific formations with specific matches,
  enabling them to save different tactical setups for different opponents or game situations.

  ## Security
  - Enable RLS on match_formations table
  - Users can only view and modify formations for matches they own
  - Authenticated users required for all operations

  ## Notes
  - One formation per team per match
  - Formations can be reused across multiple matches
  - When a match is deleted, the link is removed but the formation remains
  - Users can create match-specific formations or use their general team formation
*/

-- Create match_formations table
CREATE TABLE IF NOT EXISTS match_formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES team_formations(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('A', 'B')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(match_id, team)
);

-- Enable RLS on match_formations
ALTER TABLE match_formations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_formations
CREATE POLICY "Users can view own match formations"
  ON match_formations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = match_formations.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own match formations"
  ON match_formations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = match_formations.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own match formations"
  ON match_formations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = match_formations.formation_id
      AND team_formations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = match_formations.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own match formations"
  ON match_formations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = match_formations.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_formations_match_id ON match_formations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_formations_formation_id ON match_formations(formation_id);
