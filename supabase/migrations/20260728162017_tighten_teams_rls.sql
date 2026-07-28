-- Resserrement RLS sur la table `teams`
--
-- Contexte : la migration initiale (20260204073841) avait créé des policies
-- "Public can ..." avec USING(true) / WITH CHECK(true) — lecture, insertion,
-- mise à jour et suppression ouvertes à tous, y compris les visiteurs anonymes.
-- La migration 20260208101237 a ensuite ajouté des policies restrictives
-- "Users can ... own teams" (authenticated + auth.uid() = user_id), mais SANS
-- supprimer les anciennes policies publiques. Comme les policies RLS se cumulent
-- en OU logique, les policies publiques rendaient le resserrement inopérant :
-- n'importe qui pouvait toujours lire/modifier toutes les équipes.
--
-- Vérifié côté application : les vues publiques (SharedReport via /share/,
-- SharedPlaylist via /playlist/) ne lisent PAS la table `teams` — elles passent
-- par un share_token sur `matches` et `playlists`. La lecture de `teams`
-- (ex: logos dans MatchReport) se fait uniquement en contexte authentifié.
-- Supprimer les policies publiques ne casse donc aucune fonctionnalité.

-- Supprime les anciennes policies publiques (USING(true)) restées en place
DROP POLICY IF EXISTS "Public can view teams" ON teams;
DROP POLICY IF EXISTS "Public can insert teams" ON teams;
DROP POLICY IF EXISTS "Public can update teams" ON teams;
DROP POLICY IF EXISTS "Public can delete teams" ON teams;

-- Filet de sécurité : (re)crée les policies restrictives si elles n'existaient pas.
-- Idempotent grâce au DROP IF EXISTS préalable.
DROP POLICY IF EXISTS "Users can view own teams" ON teams;
DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
DROP POLICY IF EXISTS "Users can update own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete own teams" ON teams;

CREATE POLICY "Users can view own teams"
  ON teams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams"
  ON teams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
