/*
  # Add Custom Event Types Support

  ## Overview
  This migration extends the event_types table to support user-created custom event types.
  Users can now create their own personalized buttons beyond the default event types.

  ## Changes
  
  ### 1. Schema Changes
  - Add `user_id` column to event_types table (nullable for system default types)
  - System event types have NULL user_id
  - Custom event types are linked to specific users

  ### 2. Security Updates
  - Update RLS policies to allow viewing of both system and owned custom event types
  - Allow authenticated users to create their own custom event types
  - Users can update and delete only their own custom event types
  - System event types (user_id IS NULL) remain read-only for all users

  ## Notes
  - Existing event types will have user_id set to NULL (system defaults)
  - Custom event types are private to the creating user
  - All authenticated users can see system event types
*/

-- Add user_id column to event_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_types' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE event_types ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON event_types(user_id);

-- RLS Policies for event_types table
CREATE POLICY "Users can view system and own custom event types"
  ON event_types FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can create own custom event types"
  ON event_types FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom event types"
  ON event_types FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom event types"
  ON event_types FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
