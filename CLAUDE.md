# Projet : Glacify — commandes et service de glaces

Lire **`CONTEXTE-PROJET.md`** avant toute action : produit, décisions, DA, feuille de route.

Règles :
- Répondre en français. Vouvoiement partout dans l'interface.
- Même stack et même hébergement qu'Equiliz et Babelibris : React + Vite + Hono/tRPC +
  Drizzle/MariaDB, service systemd sur le VPS derrière le nginx multiplexé, shell Capacitor qui
  charge le site en ligne. S'en inspirer avant de réinventer.
- Le VPS héberge d'autres services (Equiliz, Babelibris, Minecraft, AnoTrack…) : ne rien casser.
- Aucun emoji dans l'interface. Des icônes (lucide) plutôt que du texte quand c'est possible.
- Pas de `confirm()`/`alert()` ni de `<select>` natifs : `confirmDialog`, `Sheet`, `Segmented`.
- Couleurs : uniquement les jetons de `src/index.css` (`ink`, `canvas`, `surface`, `accent`…),
  jamais de couleur fixe dans les composants (sauf les couleurs des parfums, qui sont des données).
- La logique de service (`contracts/plan.ts`) et la validation des commandes
  (`contracts/orders.ts`) sont testées : toute modification passe par leurs tests.
- **Bêta gratuite** : tout est gratuit et illimité, aucune mention de paiement ni de Premium
  dans l'interface (décision de Bastien, 25 oct. 2026). Voir `CONTEXTE-PROJET.md`.

Code dans `app/`. Vérifier avec `npm run check`, `npm test` et `npm run build`.
