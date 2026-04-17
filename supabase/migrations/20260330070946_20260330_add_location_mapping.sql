/*
  # Add Location/Zone Mapping Support

  1. New Fields
    - `match_events.location_id` (uuid, nullable): Reference to the zone button that was selected for spatial mapping
    - `panel_buttons.is_zone` (boolean, default false): Marks a button as a "Zone" type for location mapping

  2. Modified Tables
    - `match_events`: Add location_id field
    - `panel_buttons`: Add is_zone field

  3. Important Notes
    - When is_zone = true, the button displays as a location/zone selector overlay during match coding
    - location_id stores the ID of the zone button clicked when recording an event's spatial location
    - Zones are only displayed in a special overlay after an event (with outcome) is recorded
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_events' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE match_events ADD COLUMN location_id uuid REFERENCES panel_buttons(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'is_zone'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN is_zone boolean DEFAULT false;
  END IF;
END $$;
