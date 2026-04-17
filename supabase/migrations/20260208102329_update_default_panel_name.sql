/*
  # Update Default Panel Name

  ## Overview
  This migration updates the name of the default football panel from "Panneau Football" 
  to "Football (défaut)" for all existing users.

  ## Changes
  1. Updates all panels with is_default = true and name = 'Panneau Football'
  2. Changes the name to 'Football (défaut)' for consistency

  ## Notes
  - Only affects default panels with the old naming convention
  - Does not affect custom panels created by users
*/

UPDATE panels
SET name = 'Football (défaut)'
WHERE is_default = true 
AND name = 'Panneau Football';
