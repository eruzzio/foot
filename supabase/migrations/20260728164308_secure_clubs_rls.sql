-- Resserrement RLS sur la table `clubs`
--
-- Avant : policy "clubs_select" en USING(true) => n'importe qui (avec la clé anon
-- publique) pouvait lister TOUS les clubs et récupérer leurs join_code via une
-- simple requête directe à l'API REST Supabase, sans passer par l'app.
--
-- Après :
--   1. La lecture directe de `clubs` est restreinte aux personnes liées au club
--      (créateur ou membre via club_members).
--   2. Le parcours "rejoindre un club par code" passe désormais par une fonction
--      RPC SECURITY DEFINER qui ne renvoie QUE le club correspondant au code
--      fourni (et seulement des champs non sensibles), sans exposer la table.

-- 1) Remplacer la policy de lecture ouverte par une policy "personne liée au club"
DROP POLICY IF EXISTS "clubs_select" ON clubs;

CREATE POLICY "clubs_select_member_or_owner"
  ON clubs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = clubs.id
        AND club_members.user_id = auth.uid()
    )
  );

-- 2) Fonction RPC pour rejoindre un club via son code, sans exposer toute la table.
--    SECURITY DEFINER => s'exécute avec les droits du propriétaire de la fonction,
--    donc peut lire `clubs` malgré la policy restrictive, mais ne renvoie que la
--    ligne correspondant EXACTEMENT au code fourni, et seulement des champs publics.
CREATE OR REPLACE FUNCTION find_club_by_join_code(p_code text)
RETURNS TABLE (id uuid, name text, logo_url text, city text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.city
  FROM clubs c
  WHERE c.join_code = upper(trim(p_code))
  LIMIT 1;
$$;

-- Autoriser les utilisateurs connectés à appeler cette fonction
REVOKE ALL ON FUNCTION find_club_by_join_code(text) FROM public;
GRANT EXECUTE ON FUNCTION find_club_by_join_code(text) TO authenticated;
