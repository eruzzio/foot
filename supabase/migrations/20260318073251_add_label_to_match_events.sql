/*
  # Add label column to match_events

  ## Summary
  When a panel button has no event_type_id (parent button with sub-buttons only),
  we need to store the button's label directly on the event so it can be displayed
  in the timeline and reports.

  ## Changes
  - `match_events` table: add `label` column (text, nullable) to store button label
    when event_type_id is null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'label'
  ) THEN
    ALTER TABLE match_events ADD COLUMN label text;
  END IF;
END $$;
