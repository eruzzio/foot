DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'location_mode'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN location_mode text DEFAULT 'none';
  END IF;
END $$;
