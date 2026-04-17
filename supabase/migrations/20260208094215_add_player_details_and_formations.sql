/*
  # Add Player Details and Team Formations

  ## Description
  This migration enhances the player management system by adding detailed player information
  and team formation capabilities for tactical visualization.

  ## Changes Made

  ### 1. Players Table Enhancements
  - Add `first_name` (text) - Player's first name
  - Add `last_name` (text) - Player's last name  
  - Add `position` (text) - Player's position (Gardien, Défenseur, Milieu, Attaquant)
  - Add `user_id` (uuid) - Links player to the user who created them
  - Modify `number` to have a default value of 0
  
  ### 2. New Table: team_formations
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - User who owns this formation
  - `name` (text) - Formation name (e.g., "4-4-2", "4-3-3")
  - `is_active` (boolean) - Whether this is the currently active formation
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. New Table: formation_positions
  - `id` (uuid, primary key) - Unique identifier
  - `formation_id` (uuid, foreign key) - Links to team_formations
  - `player_id` (uuid, foreign key, nullable) - Player assigned to this position
  - `position_x` (integer) - X coordinate on field (0-100 scale)
  - `position_y` (integer) - Y coordinate on field (0-100 scale)
  - `role` (text) - Position role (GK, DF, MF, FW)
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all new tables
  - Users can only view and modify their own players and formations
  - Authenticated users required for all operations

  ## Notes
  - Formation positions use a 0-100 coordinate system for flexibility
  - One formation can be marked as active per user
  - Players can be unassigned (player_id nullable in formation_positions)
*/

-- Add new columns to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE players ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE players ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'position'
  ) THEN
    ALTER TABLE players ADD COLUMN position text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE players ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update the name column to be nullable (for backward compatibility)
ALTER TABLE players ALTER COLUMN name DROP NOT NULL;

-- Create team_formations table
CREATE TABLE IF NOT EXISTS team_formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create formation_positions table
CREATE TABLE IF NOT EXISTS formation_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES team_formations(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  position_x integer NOT NULL,
  position_y integer NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on team_formations
ALTER TABLE team_formations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on formation_positions
ALTER TABLE formation_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_formations
CREATE POLICY "Users can view own formations"
  ON team_formations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own formations"
  ON team_formations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own formations"
  ON team_formations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own formations"
  ON team_formations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for formation_positions
CREATE POLICY "Users can view own formation positions"
  ON formation_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = formation_positions.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own formation positions"
  ON formation_positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = formation_positions.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own formation positions"
  ON formation_positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = formation_positions.formation_id
      AND team_formations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = formation_positions.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own formation positions"
  ON formation_positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_formations
      WHERE team_formations.id = formation_positions.formation_id
      AND team_formations.user_id = auth.uid()
    )
  );

-- Update RLS policies for players table to include user_id check
DROP POLICY IF EXISTS "Users can view own players" ON players;
DROP POLICY IF EXISTS "Users can insert own players" ON players;
DROP POLICY IF EXISTS "Users can update own players" ON players;
DROP POLICY IF EXISTS "Users can delete own players" ON players;

CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own players"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own players"
  ON players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);