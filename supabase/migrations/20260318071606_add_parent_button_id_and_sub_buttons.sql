/*
  # Add Sub-Button System to Panel Buttons

  ## Summary
  Adds support for hierarchical buttons: primary event buttons can have child
  sub-buttons that appear contextually after the parent is clicked.

  ## Changes

  ### Modified Tables
  - `panel_buttons`
    - `parent_button_id` (uuid, nullable, FK to panel_buttons.id): Links a sub-button to its parent event button
    - `display_order` (integer): Controls display ordering within a group of sub-buttons

  ## Notes
  - Sub-buttons with `parent_button_id` set are hidden until their parent is activated
  - Sub-buttons behave like keywords: they qualify the last event
  - `button_type` for sub-buttons should be 'keyword'
  - A `parent_button_id = NULL` means it's a root-level button
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'parent_button_id'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN parent_button_id uuid REFERENCES panel_buttons(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;
