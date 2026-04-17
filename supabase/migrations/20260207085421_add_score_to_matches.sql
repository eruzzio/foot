/*
  # Add score columns to matches table

  1. Changes
    - Add `team_a_score` column to track goals/points for team A
    - Add `team_b_score` column to track goals/points for team B
    - Set default values to 0

  2. Notes
    - This allows tracking the score directly in the match record
    - Score can be incremented/decremented during live coding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_score'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_score'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_score integer DEFAULT 0;
  END IF;
END $$;
