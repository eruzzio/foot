-- Setup Player Photos Storage
-- Description: Creates a Supabase Storage bucket for player profile photos
-- and sets up appropriate security policies

-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload own player photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own player photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'player-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own player photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view player photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'player-photos');