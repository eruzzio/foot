/*
  # Add Team Association to Panel Buttons

  ## Overview
  This migration adds the ability to associate panel buttons with a specific team (A or B) 
  when coding events live. This allows coaches to have team-specific button layouts.

  ## Changes
  - Added `team_association` column to `panel_buttons` table
  - Values: null (no team), 'A' (Team A only), or 'B' (Team B only)
  - Existing buttons default to null (available for both teams)

  ## Notes
  - null value means the button is available for both teams
  - This allows more flexibility in panel configuration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'team_association'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN team_association text DEFAULT NULL;
  END IF;
END $$;
