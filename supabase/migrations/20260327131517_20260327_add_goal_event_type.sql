/*
  # Add Goal Event Type

  1. New Event Type
    - Add "But" (Goal) as a standard event type
    - This allows goals to be tracked as match events just like other actions
  
  2. Purpose
    - Goals recorded via the "But" button will now create match_events entries
    - This ensures goal data is consistent between match_events and matches table scores
    - Enables detailed goal tracking with timestamps, team, and other event metadata
*/

INSERT INTO event_types (name, color, icon)
VALUES ('But', '#22c55e', 'target')
ON CONFLICT DO NOTHING;