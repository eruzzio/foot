# Cahier des Charges — Application de Codage Sportif

---

## 1. Présentation générale

Application web de codage et d'analyse de matchs sportifs en temps réel, destinée aux entraîneurs et analystes vidéo. Permet d'enregistrer des événements de match via des boutons personnalisables, de gérer une équipe et ses effectifs, de visualiser des statistiques détaillées et d'exporter les données.

**Stack technique**
- Frontend : React 18 + TypeScript + Tailwind CSS + Lucide React
- Backend : Supabase (PostgreSQL, Auth, Storage, Realtime)
- Build : Vite

---

## 2. Authentification

- Inscription et connexion par e-mail / mot de passe (Supabase Auth)
- Gestion automatique de la session (refresh JWT)
- Listener temps réel sur l'état d'authentification
- Toutes les données utilisateur sont isolées par RLS (`auth.uid() = user_id`)

---

## 3. Navigation principale

Quatre sections accessibles depuis le tableau de bord :

| Section | Accès | Description |
|---|---|---|
| Codage Live | Toujours | Interface de codage en temps réel |
| Mon Panneau | Toujours | Éditeur de panneaux de boutons |
| Mes Stats | Après 1 match terminé | Analyse des matchs passés |
| Mon Équipe | Toujours | Gestion de l'équipe et des joueurs |

---

## 4. Codage Live (`CodingInterface`)

### 4.1 Gestion du match
- Saisie des noms des équipes A et B, du championnat, de la journée, du lieu et de la date via une fiche match (modal)
- Sélection du panneau de boutons à utiliser pour le match
- Suivi du score en temps réel (incrémentation / décrémentation par équipe)
- Statuts du match : `setup` → `in_progress` → `paused` → `completed`
- Confirmation avant de clôturer le match

### 4.2 Chronomètre (`MatchTimer`)
- Affichage MM:SS en police monospace
- Boutons Lecture / Pause / Remise à zéro
- Indicateur visuel "En direct" (pulsation rouge) ou "En pause"
- Synchronisation du temps en base (table `matches.match_time`)

### 4.3 Enregistrement d'événements
- Clic sur un bouton → événement horodaté enregistré en base
- Pour les événements avec résultat (`has_outcome = true`) : sélection Réussi / Raté
- Résultat neutre possible pour les événements sans issue binaire
- Abonnement Supabase Realtime sur `match_events` pour mise à jour automatique

### 4.4 Panneau de boutons (`ActionButtons`)
- Affichage des boutons du panneau actif
- Deux modes d'affichage :
  - **Grille basique** : disposition en grille responsive 2–4 colonnes
  - **Layout libre** : positionnement absolu selon coordonnées sauvegardées
- Boutons sans type d'événement assigné visibles mais désactivés (mention "Non assigné")
- Couleur personnalisable par bouton (texte blanc sur fond coloré)
- Icône associée au type d'événement

### 4.5 Changement de panneau en cours de match
- Sélecteur de panneaux (liste des panneaux de l'utilisateur)
- Le panneau par défaut est pré-sélectionné

### 4.6 Statistiques en direct (`Statistics`)
- Nombre total d'événements par équipe
- Répartition par type d'événement avec barre comparative équipe A / équipe B
- Taux de réussite par équipe
- Distribution par période (0–15 min, 15–30, 30–45, 45+)
- Indicateurs : équipe la plus active, période la plus active, action dominante

### 4.7 Timeline (`Timeline`)
- Liste chronologique des événements (plus récent en premier)
- Heure (MM:SS), type, équipe, résultat (icône verte/rouge/grise)
- Suppression d'un événement avec confirmation
- Hauteur maximale avec défilement

### 4.8 Comparaison d'équipes (`TeamConfrontation`)
- Tableau comparatif dépliable des événements par type
- Compteurs par équipe A et B

### 4.9 Formations par match (`MatchFormationManager`)
- Modale de gestion de la composition tactique pour chaque équipe
- Deux scénarios :
  - Aucune formation : formulaire de création (nom + type de formation) ou copie de la formation active de l'équipe
  - Formation existante : visualisation du terrain avec assignation des joueurs

### 4.10 Export
- Bouton d'export accessible depuis l'interface de codage et le rapport de match
- Formats : Excel (.xlsx) et CSV (.csv)
- Données exportées : événements, statistiques, compositions

---

## 5. Gestion des panneaux (`PanelsManager`)

### 5.1 Vue liste
- Affichage de tous les panneaux de l'utilisateur
- Badge "Défaut" sur le panneau par défaut
- Compteur de boutons par panneau
- Création, modification et suppression de panneaux

### 5.2 Panneau par défaut
- Créé automatiquement à la première connexion
- Contient 8 actions football standard (Tir, Passe, Dribble, Perte, Récupération, Interception, Faute, Tacle)
- Non modifiable directement (bannière d'information)

### 5.3 Gestion des boutons
- Ajout d'un bouton : label, type d'événement (liste groupée par catégorie), couleur, position
- Modification et suppression de boutons
- `event_type_id` nullable : un bouton peut exister sans type assigné

### 5.4 Éditeur de layout libre (`FreeLayoutEditor`)
- Glisser-déposer des boutons sur un canvas avec fond en grille (20 px)
- Redimensionnement par poignée coin bas-droit (taille minimale 80×40 px)
- Sélection visuelle (ring bleu)
- Contrainte dans les limites du conteneur
- Sauvegarde automatique des positions en base (`layout_x`, `layout_y`, `width`, `height`)
- Bouton de réinitialisation (remise à la grille par défaut) avec confirmation

---

## 6. Gestion de l'équipe (`MyTeam`)

### 6.1 Informations d'équipe (`TeamSettings`)
- Nom, catégorie (U13, U15, U17, U19, Senior, Autre), description
- Logo : upload de fichier (max 5 Mo, formats image) ou saisie d'URL
- Prévisualisation du logo
- Stockage dans le bucket Supabase `team-logos`

### 6.2 Effectif joueurs
- Liste des joueurs avec photo, prénom, nom, numéro, poste
- Ajout / modification / suppression de joueur
- Indicateur vert si le joueur est assigné à la formation active

### 6.3 Formulaire joueur (`PlayerForm`)
- Prénom, nom (requis), numéro (1–99), poste (Gardien, Défenseur, Milieu, Attaquant)
- Photo : upload de fichier ou URL (prévisualisation circulaire)
- Stockage dans le bucket Supabase `player-photos` (5 Mo, JPEG/PNG/GIF/WebP)

### 6.4 Formations tactiques (`FieldVisualization`)
- Visualisation du terrain de football
- 7 formations disponibles : 4-4-2, 4-3-3, 3-5-2, 5-3-2, 3-4-3, 4-2-3-1, 4-5-1
- Sélecteur de formation → recréation des positions
- Clic sur une position pour assigner / désassigner un joueur
- Sauvegarde en base (`team_formations`, `formation_positions`)

---

## 7. Statistiques et rapports (`MyStats` / `MatchReport`)

### 7.1 Liste des matchs terminés
- Cartes de match avec noms des équipes et date
- Accessible uniquement après au moins un match complété

### 7.2 Rapport de match (`MatchReport`)
- En-tête : noms des équipes, scores, date, durée
- Cartes récapitulatives : total événements, taux de réussite par équipe
- Composant `Statistics` complet (même que dans le live)
- Timeline complète du match
- Export Excel / CSV

---

## 8. Schéma de base de données

### Tables principales

| Table | Description |
|---|---|
| `teams` | Équipes (nom, catégorie, logo, description, couleurs) |
| `players` | Joueurs (prénom, nom, numéro, poste, photo, user_id) |
| `matches` | Matchs (noms équipes, scores, statut, temps, date) |
| `event_types` | Types d'événements système et personnalisés |
| `match_events` | Événements enregistrés pendant le match |
| `panels` | Panneaux de boutons utilisateur |
| `panel_buttons` | Boutons d'un panneau (label, couleur, position, layout) |
| `team_formations` | Formations tactiques de l'équipe |
| `formation_positions` | Positions sur le terrain avec joueur assigné |
| `match_formations` | Associations formation ↔ match ↔ équipe |

### Politiques de sécurité (RLS)
- Toutes les tables activent RLS
- Chaque utilisateur n'accède qu'à ses propres données (`user_id = auth.uid()`)
- Les types d'événements système (`user_id IS NULL`) sont visibles par tous
- Les boutons de panneaux héritent des droits via leur panneau parent

---

## 9. Types d'événements système

| Nom | Catégorie | Résultat possible | Couleur |
|---|---|---|---|
| Tir | Attaque | Oui | Vert |
| Passe | Attaque | Oui | Bleu |
| Dribble | Attaque | Oui | Violet |
| Perte | Attaque | Non | Rouge |
| Récupération | Défense | Non | Vert |
| Interception | Défense | Non | Bleu |
| Faute | Général | Non | Ambre |
| Tacle | Défense | Oui | Indigo |

Types personnalisés créables par l'utilisateur avec nom, catégorie, icône et couleur.

---

## 10. Stockage fichiers

| Bucket | Usage | Limite | Formats |
|---|---|---|---|
| `team-logos` | Logos d'équipe | Par défaut | Tous formats image |
| `player-photos` | Photos joueurs | 5 Mo | JPEG, PNG, GIF, WebP |

Accès public en lecture, écriture restreinte au propriétaire (`user_id` dans le chemin).

---

## 11. Fonctionnalités temps réel

- Abonnement Supabase Realtime sur `match_events` filtré par `match_id`
- Mise à jour automatique de la timeline et des statistiques lors d'insertions, modifications ou suppressions
- Permet à plusieurs utilisateurs de suivre le même match simultanément

---

## 12. Design et UX

- Thème sombre pour les interfaces de travail (codage, équipe, stats)
- Thème clair pour les sections de configuration (panneaux, rapports)
- Palette : fond sombre `#0a0a0a`, orange `#ff6b35` (actions), vert `#22C55E` (équipe A / succès), rouge `#EF4444` (échec / suppression)
- Responsive : mobile (1 colonne), tablette (2 colonnes), desktop (3–4 colonnes)
- Transitions, effets hover et scale sur les boutons interactifs
- Modales avec overlay noir semi-transparent pour les formulaires

---

## 13. Migrations appliquées

| Fichier | Contenu |
|---|---|
| `20260204073841` | Schéma initial (teams, players, event_types, matches, match_events) |
| `20260207083651` | Ajout noms des équipes directement sur les matchs |
| `20260207085421` | Ajout scores sur les matchs |
| `20260207091919` | Création du système de panneaux et boutons avec RLS |
| `20260207092959` | Types d'événements personnalisés par utilisateur |
| `20260207094630` | Support du layout libre sur les boutons de panneau |
| `20260208094215` | Détails joueurs (prénom/nom/poste/user_id) et formations tactiques |
| `20260208094815` | Photo des joueurs |
| `20260208095237` | Bucket de stockage pour les photos joueurs |
| `20260208101237` | Personnalisation d'équipe (logo, catégorie, description, couleurs) |
| `20260208102329` | Nom par défaut du panneau initial |
| `20260208102803` | Formations spécifiques par match |
| `20260316124303` | `event_type_id` nullable dans `panel_buttons` |

---

*Document généré le 16 mars 2026.*
