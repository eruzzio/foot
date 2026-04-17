/*
  # Add Free Layout Support for Panel Buttons

  ## Overview
  This migration adds support for free-form positioning and sizing of buttons in panels.
  Users can now drag buttons to any position and resize them for a fully customizable layout.

  ## Changes
  
  ### 1. Schema Changes
  - Add `layout_x` column: X position in pixels (nullable, defaults to grid position)
  - Add `layout_y` column: Y position in pixels (nullable, defaults to grid position)
  - Add `width` column: Button width in pixels (nullable, defaults to standard size)
  - Add `height` column: Button height in pixels (nullable, defaults to standard size)
  - Add `use_free_layout` column to panels: Boolean to toggle between grid and free layout

  ## Notes
  - When layout_x/layout_y are NULL, use grid-based positioning
  - When layout_x/layout_y are set, use absolute positioning
  - Existing buttons will continue to use grid layout until manually positioned
*/

-- Add layout columns to panel_buttons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'layout_x'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN layout_x integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'layout_y'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN layout_y integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'width'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN width integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'height'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN height integer;
  END IF;
END $$;

-- Add use_free_layout column to panels table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panels' AND column_name = 'use_free_layout'
  ) THEN
    ALTER TABLE panels ADD COLUMN use_free_layout boolean DEFAULT false;
  END IF;
END $$;
