/*
  # Change layout columns from integer to numeric

  ## Summary
  The layout_x, layout_y, width, height columns in panel_buttons were integer
  but the FreeLayoutEditor computes percentage-based float values (e.g. 5.427).
  This migration converts them to numeric(10,4) to store decimal values properly.

  ## Changes
  - `panel_buttons.layout_x` integer → numeric(10,4)
  - `panel_buttons.layout_y` integer → numeric(10,4)
  - `panel_buttons.width` integer → numeric(10,4)
  - `panel_buttons.height` integer → numeric(10,4)
*/

ALTER TABLE panel_buttons
  ALTER COLUMN layout_x TYPE numeric(10,4) USING layout_x::numeric,
  ALTER COLUMN layout_y TYPE numeric(10,4) USING layout_y::numeric,
  ALTER COLUMN width TYPE numeric(10,4) USING width::numeric,
  ALTER COLUMN height TYPE numeric(10,4) USING height::numeric;
