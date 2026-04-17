/*
  # Add Video Support to Matches

  1. New Columns
    - `matches.video_url` (text) - Full VEO video share URL
    - `matches.video_provider` (text) - Provider identifier ('veo', 'hudl', 'dartfish', etc.)
    - `matches.video_share_id` (text) - Share ID for the video
    - `matches.video_duration` (integer) - Video duration in seconds
    - `match_events.video_timestamp` (integer) - Event timestamp in video (seconds)

  2. Security
    - No RLS changes needed - inherits from matches table
    - Video URLs are public share links, not sensitive data

  3. Notes
    - video_url stores full share link for playback
    - video_share_id used for tracking/deduplication
    - video_timestamp allows mapping events to exact video frame
    - All columns are optional for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE matches ADD COLUMN video_url text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'video_provider'
  ) THEN
    ALTER TABLE matches ADD COLUMN video_provider text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'video_share_id'
  ) THEN
    ALTER TABLE matches ADD COLUMN video_share_id text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'video_duration'
  ) THEN
    ALTER TABLE matches ADD COLUMN video_duration integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'video_timestamp'
  ) THEN
    ALTER TABLE match_events ADD COLUMN video_timestamp integer DEFAULT NULL;
  END IF;
END $$;
