/*
  # Add team names to matches table

  1. Changes
    - Add `team_a_name` column to store the name of team A directly
    - Add `team_b_name` column to store the name of team B directly
    - Set default values to maintain compatibility

  2. Notes
    - This allows storing team names directly in the match without requiring team records
    - Existing matches will have default values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_name'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_name text DEFAULT 'Équipe A';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_name'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_name text DEFAULT 'Équipe B';
  END IF;
END $$;