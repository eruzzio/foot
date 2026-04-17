/*
  # Add Team Customization Support

  1. New Features
    - Add customization fields to teams table:
      - `user_id` - Link team to user account
      - `category` - Team category/age group (e.g., U13, U15, Senior)
      - `logo_url` - Team logo/badge URL
      - `description` - Team description
      - `founded_year` - Year the team was founded
      - `colors` - Team colors (JSON object with primary/secondary)
    
  2. Storage
    - Create storage bucket for team logos
    - Set up RLS policies for secure logo uploads
    
  3. Security
    - Enable RLS on teams table
    - Add policies for users to manage their own teams
*/

-- Add new columns to teams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'category'
  ) THEN
    ALTER TABLE teams ADD COLUMN category text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE teams ADD COLUMN logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'description'
  ) THEN
    ALTER TABLE teams ADD COLUMN description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'founded_year'
  ) THEN
    ALTER TABLE teams ADD COLUMN founded_year integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'colors'
  ) THEN
    ALTER TABLE teams ADD COLUMN colors jsonb DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF"}'::jsonb;
  END IF;
END $$;

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own teams" ON teams;
DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
DROP POLICY IF EXISTS "Users can update own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete own teams" ON teams;

-- Create RLS policies for teams
CREATE POLICY "Users can view own teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for team logos
DROP POLICY IF EXISTS "Users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own team logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own team logos" ON storage.objects;

CREATE POLICY "Users can upload team logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view team logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'team-logos');

CREATE POLICY "Users can update own team logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'team-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own team logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );