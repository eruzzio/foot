/*
  # Add Dartfish Note-style panel button fields

  ## Summary
  Adds fields to panel_buttons to support a Dartfish Note-like panel system:

  ## New Columns on panel_buttons
  - `button_type`: 'event' (creates a timestamped event, shown in red) or 'keyword' (adds a qualifier to the last event, shown in blue). Default: 'event'
  - `tab_page`: Integer (1 or 2) — which page/tab of the panel this button belongs to. Default: 1
  - `shortcut_key`: Optional single keyboard character shortcut displayed on the button
  - `group_name`: Optional group/category label for visual grouping of related buttons

  ## Notes
  - Existing buttons default to button_type='event', tab_page=1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'button_type'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN button_type text NOT NULL DEFAULT 'event'
      CHECK (button_type IN ('event', 'keyword'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'tab_page'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN tab_page integer NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'shortcut_key'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN shortcut_key text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panel_buttons' AND column_name = 'group_name'
  ) THEN
    ALTER TABLE panel_buttons ADD COLUMN group_name text DEFAULT NULL;
  END IF;
END $$;
