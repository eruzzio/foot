/*
  # Add team_id to team_formations

  ## Changes
  - Adds a `team_id` column (uuid, nullable, FK to teams) to `team_formations`
  - This allows formations to be scoped per team instead of per user only

  ## Notes
  - Column is nullable so existing rows are not broken
  - Foreign key references `teams(id)` with ON DELETE SET NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_formations' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE team_formations ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;
