/*
  # Make event_type_id nullable in panel_buttons

  1. Changes
    - `panel_buttons.event_type_id` is made nullable to allow creating placeholder/unassigned buttons
    - The foreign key constraint is preserved but now allows NULL values

  2. Notes
    - This enables users to create a button without selecting an event type yet
    - Buttons without an event type will be displayed as "non configuré" placeholders
*/

ALTER TABLE panel_buttons
  ALTER COLUMN event_type_id DROP NOT NULL;
