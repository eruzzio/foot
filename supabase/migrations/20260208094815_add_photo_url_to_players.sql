/*
  # Add Photo URL to Players

  ## Description
  This migration adds a photo_url field to the players table to allow users
  to add profile photos for each player.

  ## Changes Made
  
  ### 1. Players Table Enhancement
  - Add `photo_url` (text, nullable) - URL to player's profile photo
  
  ## Security
  - No additional RLS policies needed as players table already has proper RLS

  ## Notes
  - Photo URL is optional (nullable) for backward compatibility
  - Users should provide publicly accessible image URLs (e.g., from Pexels)
*/

-- Add photo_url column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE players ADD COLUMN photo_url text;
  END IF;
END $$;