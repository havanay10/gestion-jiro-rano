# Gestion Jiro & Rano

Application web de gestion des logements, personnes, relevés mensuels et répartition des factures d’électricité (Jiro) et d’eau (Rano). Les administrateurs gèrent les données et les périodes; chaque personne dispose d’un espace pour consulter ses relevés.

## Fonctionnalités

- Tableau de bord avec indicateurs, historique récent et graphique des factures.
- Gestion des logements et des personnes, de leur période de départ et de leur compte personnel.
- Saisie mensuelle des factures et des relevés, calcul des parts Jiro/Rano à six décimales et contrôles d’équilibre.
- Consultation des périodes, détails et exports CSV/PDF.
- Journal d’audit de l’administration.
- Espace personnel avec accueil animé, historique et détail des relevés.
- Authentification Supabase et contrôle des rôles administrateur/personnel dans l’application.

## Technologies

- React, TypeScript et Vite
- React Router
- Supabase Auth, Postgres, RPC et Edge Functions
- Decimal.js pour le calcul déterministe des répartitions
- Recharts, jsPDF, React PDF et Papa Parse pour les graphiques et exports

## Prérequis

- Node.js compatible avec Vite 8
- npm
- Un projet Supabase configuré pour l’application

## Installation locale

1. Installer les dépendances :

   ```sh
   npm ci
   ```

2. Copier `.env.example` vers `.env.local`, puis renseigner les paramètres du projet Supabase :

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<clé-publique-anon-ou-publishable>
   ```

   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont requis au démarrage. Les variables préfixées par `VITE_` sont intégrées au code envoyé au navigateur : n’y placez jamais de clé `service_role`, mot de passe ou autre secret serveur.

   `VITE_ADMIN_CONTACT` figure aussi dans le fichier d’exemple et les types Vite, mais n’est actuellement pas lu par l’application.

3. Démarrer le serveur de développement :

   ```sh
   npm run dev
   ```

Vite affiche l’adresse locale à ouvrir dans le navigateur (généralement `http://localhost:5173`).

## Commandes disponibles

| Commande | Utilité |
|---|---|
| `npm run dev` | Démarrer l’application en développement |
| `npm run lint` | Vérifier le code avec ESLint |
| `npm run build` | Vérifier les types TypeScript et créer la version de production dans `dist/` |
| `npm run preview` | Servir localement la version compilée |

## Parcours et routes

| Route | Accès | Page |
|---|---|---|
| `/login` | Public | Connexion |
| `/admin` | Administrateur | Tableau de bord |
| `/admin/logements` | Administrateur | Gestion des logements |
| `/admin/personnes` | Administrateur | Gestion des personnes et comptes |
| `/admin/periodes` | Administrateur | Saisie d’une période |
| `/admin/historique` | Administrateur | Historique et exports |
| `/admin/periodes/:periodeId` | Administrateur | Détail d’une période |
| `/admin/audit` | Administrateur | Journal d’audit |
| `/accueil` | Personnel | Accueil personnel |
| `/espace` | Personnel | Historique personnel |
| `/espace/periodes/:periode` | Personnel | Détail d’un relevé |

Les chemins inconnus redirigent vers `/login`. Les contrôles d’accès dans React améliorent le parcours utilisateur, mais la sécurité des données doit également être appliquée par les politiques RLS et les fonctions SQL Supabase.

## Supabase

Le client web utilise l’URL du projet et sa clé publique. Les opérations sensibles passent par les fonctions RPC ou la fonction Edge, notamment la création de personne, l’enregistrement de période et la création de compte personnel.

Les tables utilisées par le code comprennent : `profils`, `personnes`, `logements`, `rattachements_personne_logement`, `periodes`, `releves` et `journal_audit`.

Les fonctions RPC utilisées comprennent : `est_admin`, `creer_personne`, `desactiver_personne`, `reactiver_personne`, `enregistrer_periode`, `get_user_emails`, `mes_donnees` et `creer_profil_personnel`.

Le dépôt contient la configuration Supabase et la fonction Edge `create-personnel-account`, mais pas les migrations SQL qui créent le schéma, les politiques RLS, les triggers et les fonctions RPC. Il faut donc disposer d’une base Supabase initialisée avec ces objets avant de pouvoir utiliser toutes les pages. Conserver les migrations SQL dans le dépôt permettra de reproduire et d’auditer le schéma.

### Déployer la fonction Edge de création de compte

La fonction `create-personnel-account` vérifie l’identité de l’appelant et son rôle administrateur, crée un utilisateur Auth, puis rattache son profil à une personne. Elle a `verify_jwt = false` dans `supabase/config.toml` parce que son code vérifie lui-même le jeton et le rôle.

Après connexion à Supabase CLI et association du projet, déployer la fonction :

```sh
npx supabase functions deploy create-personnel-account --project-ref <project-ref>
```

La liste CORS est définie dans `supabase/functions/create-personnel-account/index.ts`. Ajouter à `ORIGINES_AUTORISEES` l’origine exacte du site (schéma, domaine et port éventuel, sans chemin), ainsi que les origines locales nécessaires. Toute modification de la fonction doit être redéployée pour prendre effet.

## Structure du code

```text
src/
  components/ui/       Composants partagés de l’interface
  features/auth/       Authentification et protection des routes
  features/espace-personnel/
                       Accueil, historique et détail personnel
  features/historique/ Historique, audit et export CSV
  features/layout/     Cadres et navigations
  features/logements/  Gestion des logements
  features/periodes/   Saisie, calcul, détail et export PDF
  features/personnes/  Gestion des personnes et des comptes
  features/tableau-bord/
                       Indicateurs et graphique
  lib/                 Client Supabase et constantes métier
  styles/              Styles communs
supabase/
  config.toml
  functions/create-personnel-account/
                       Fonction Edge et configuration Deno
```

## Déploiement de l’application web

Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans l’environnement de build de l’hébergeur, puis lancer `npm run build`. La sortie statique se trouve dans `dist/`.

Comme l’application utilise React Router côté navigateur, l’hébergeur doit réécrire les chemins de l’application vers `index.html` pour que les URL directes telles que `/admin/personnes` fonctionnent après actualisation. Ajouter également l’origine de production à la liste CORS de la fonction Edge, puis redéployer cette fonction.

## Précision des montants

Les montants et parts sont affichés avec six décimales. Le calcul distribue les unités résiduelles au millionième d’Ariary afin que la somme des parts corresponde au montant réparti, sous réserve que les données et les règles appliquées côté base soient cohérentes avec le calcul de l’application.
