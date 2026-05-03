# PMS — Property Management System

## Règles de développement

### TypeScript
- Toujours `"strict": true`
- Jamais de `any` — utiliser `unknown` + narrowing ou types précis
- Toujours typer les retours de Server Actions et API routes

### Architecture
- **Server Actions** plutôt qu'API routes quand possible (mutations formulaires)
- Composants UI génériques → `/components/ui` (shadcn ou custom)
- Composants métier → `/components/features/<domaine>`
- Logique channel manager → `/lib/channels/<adapter>.ts` derrière l'interface `ChannelAdapter`

### Channel Adapter Pattern (CRITIQUE)
Toute synchronisation OTA passe par `ChannelAdapter`. Ne jamais appeler iCal ou une API OTA directement depuis un Server Action ou une page. Implémenter dans `/lib/channels/`.

### Base de données
- Toutes les dates stockées en UTC dans Postgres
- Conversion au fuseau horaire du bien à l'affichage
- La contrainte anti-overlap `EXCLUDE USING gist` est dans la migration — ne jamais la supprimer
- Utiliser `pg_advisory_xact_lock` pour les insertions concurrentes de réservations

### Zod v4
- Utiliser `.issues` (pas `.errors`) pour accéder aux erreurs de validation : `parsed.error.issues[0]?.message`

### Sécurité
- Validation `zod` sur tous les Server Actions et API routes publiques
- URLs iCal export avec token 32+ caractères aléatoires
- Rate limiting sur les endpoints publics (`/api/ical/[token]`)
- Jamais de secrets dans le code — toujours via variables d'environnement

### Workflow
- Avant de passer à chaque étape du plan de développement : **demander confirmation**
- Avant tout commit : `pnpm typecheck && pnpm lint && pnpm test`
- Format dates affichage : `date-fns` avec locale FR
- i18n : `next-intl`, français par défaut, anglais supporté

## Plan de développement

- [x] Étape 1 : Init projet + Auth.js + schema Prisma de base
- [x] Étape 2 : CRUD Property avec upload photos
- [x] Étape 3 : Calendrier disponibilités + contrainte EXCLUDE GIST
- [x] Étape 4 : Gestion des tarifs (RatePlan + PricingRule)
- [x] Étape 5 : Channel Adapter + ICalAdapter (import + export)
- [x] Étape 6 : Détection conflits + page /bookings/conflicts
- [x] Étape 7 : Gestion réservations complète
- [x] Étape 8 : Dashboard analytics
- [x] Étape 9 (phase 2) : API directes Airbnb/Booking, multi-utilisateurs
