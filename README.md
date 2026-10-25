# 🍦 Glacify

Glacify est une petite web app pour **prendre la commande de glaces d'un groupe** puis **la servir efficacement**.

## Comment ça marche

1. **Commande** : ajoutez chaque personne, choisissez cornet ou pot, touchez les parfums (jusqu'à 4 boules) et les suppléments. Le bouton « dupliquer » sert pour « la même chose pour moi ».
2. **Service** : Glacify réorganise toutes les commandes en un plan de travail à cocher :
   - les contenants à sortir,
   - les boules **parfum par parfum** et **étage par étage** (dans un cornet, la 1re boule doit être posée avant la 2e ; dans un pot, l'ordre est libre, donc les boules sont rangées pour partager un maximum de bacs),
   - les suppléments,
   - la distribution, personne par personne.
3. **Parfums** : marquez un parfum épuisé, ajoutez les vôtres (avec leur couleur) et gérez les suppléments.

Tout est enregistré dans le navigateur (localStorage) : rien à installer, pas de compte, ça marche hors ligne et ça s'installe sur l'écran d'accueil du téléphone.

## Lancer en local

Pas de dépendance ni de build. Il suffit d'un serveur statique :

```bash
npm start            # ou : python3 -m http.server 5173
```

puis ouvrir http://localhost:5173.

## Tests

```bash
npm test
```

## Mettre en ligne

Le site est 100 % statique : il peut être publié tel quel avec GitHub Pages (Settings → Pages → branche `main`, dossier racine), Netlify, Vercel…

## Structure

```
index.html            page unique + barre d'onglets
src/app.js            interface (vues, éditeur de glace, événements)
src/plan.js           calcul du plan de service (logique pure, testée)
src/store.js          parfums par défaut + sauvegarde locale
src/styles.css        styles, pensés mobile d'abord
sw.js                 cache hors ligne
tests/plan.test.js    tests du plan de service
```
