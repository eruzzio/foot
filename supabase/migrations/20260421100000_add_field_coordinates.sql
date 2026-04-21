/*
  # Add precise location coordinates to match events

  1. New Fields
    - `match_events.field_x` (numeric, nullable): X coordinate on field (0-100%)
    - `match_events.field_y` (numeric, nullable): Y coordinate on field (0-100%)
    - `match_events.goal_x` (numeric, nullable): X coordinate in goal (0-100%)
    - `match_events.goal_y` (numeric, nullable): Y coordinate in goal (0-100%)

  2. Notes
    - field_x/field_y represent exact position on the pitch (percentage)
    - goal_x/goal_y represent where the shot ended in the goal frame (percentage)
    - Both are optional and independent of the existing location_id (zone buttons)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'field_x'
  ) THEN
    ALTER TABLE match_events ADD COLUMN field_x numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'field_y'
  ) THEN
    ALTER TABLE match_events ADD COLUMN field_y numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'goal_x'
  ) THEN
    ALTER TABLE match_events ADD COLUMN goal_x numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'goal_y'
  ) THEN
    ALTER TABLE match_events ADD COLUMN goal_y numeric DEFAULT NULL;
  END IF;
END $$;
