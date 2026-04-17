/*
  # Add Panels System with Authentication

  ## Overview
  This migration adds a panels management system that allows authenticated users
  to create and manage their own custom coding panels with personalized button layouts.

  ## New Tables

  ### 1. panels
  Stores user-created custom panels
  - id: unique identifier
  - user_id: reference to auth.users (panel owner)
  - name: panel name
  - description: optional panel description
  - is_default: whether this is the user's default panel
  - created_at: timestamp of creation
  - updated_at: timestamp of last update

  ### 2. panel_buttons
  Stores custom button configurations for each panel
  - id: unique identifier
  - panel_id: reference to panels table
  - event_type_id: reference to event_types table
  - label: custom button label
  - position: button position in the grid
  - color: custom button color
  - created_at: timestamp of creation

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own panels
  - Authenticated users required for all operations

  ## Notes
  - Each user can have multiple panels
  - One panel can be set as default per user
  - Panel buttons reference existing event types for consistency
*/

-- Create panels table
CREATE TABLE IF NOT EXISTS panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create panel_buttons table
CREATE TABLE IF NOT EXISTS panel_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid REFERENCES panels(id) ON DELETE CASCADE NOT NULL,
  event_type_id uuid REFERENCES event_types(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  position integer DEFAULT 0,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_panels_user_id ON panels(user_id);
CREATE INDEX IF NOT EXISTS idx_panels_is_default ON panels(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_panel_buttons_panel_id ON panel_buttons(panel_id);

-- Enable Row Level Security
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_buttons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for panels table
CREATE POLICY "Users can view own panels"
  ON panels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own panels"
  ON panels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own panels"
  ON panels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own panels"
  ON panels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for panel_buttons table
CREATE POLICY "Users can view buttons of own panels"
  ON panel_buttons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panels
      WHERE panels.id = panel_buttons.panel_id
      AND panels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert buttons to own panels"
  ON panel_buttons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM panels
      WHERE panels.id = panel_buttons.panel_id
      AND panels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update buttons of own panels"
  ON panel_buttons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panels
      WHERE panels.id = panel_buttons.panel_id
      AND panels.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM panels
      WHERE panels.id = panel_buttons.panel_id
      AND panels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete buttons of own panels"
  ON panel_buttons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panels
      WHERE panels.id = panel_buttons.panel_id
      AND panels.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for panels table
DROP TRIGGER IF EXISTS update_panels_updated_at ON panels;
CREATE TRIGGER update_panels_updated_at
  BEFORE UPDATE ON panels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to ensure only one default panel per user
CREATE OR REPLACE FUNCTION ensure_single_default_panel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE panels
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ensuring single default panel
DROP TRIGGER IF EXISTS ensure_single_default_panel_trigger ON panels;
CREATE TRIGGER ensure_single_default_panel_trigger
  BEFORE INSERT OR UPDATE ON panels
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_panel();
