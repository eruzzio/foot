/*
  # Add keyword support to match_events

  ## Summary
  This migration enhances the match_events table to properly support the
  event/keyword button distinction. Previously, all button clicks created
  independent events. Now, keyword buttons attach their labels directly to
  the parent event they qualify.

  ## Changes

  ### Modified Tables
  - `match_events`
    - Add `keywords` (text[]) — array of keyword labels attached to this event
    - Add `parent_event_id` (uuid, nullable) — when a keyword is fired as
      a standalone row (legacy), links it back to the event it qualifies.
      Going forward we prefer to update the parent event's `keywords` array.

  ## Notes
  - All existing rows get an empty keywords array by default (safe migration)
  - parent_event_id is nullable to preserve backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE match_events ADD COLUMN keywords text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'parent_event_id'
  ) THEN
    ALTER TABLE match_events ADD COLUMN parent_event_id uuid REFERENCES match_events(id) ON DELETE SET NULL;
  END IF;
END $$;
