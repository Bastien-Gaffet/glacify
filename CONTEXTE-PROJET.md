# Glacify — contexte du projet

Mis à jour le 25 octobre 2026.

## Le produit

Glacify sert à **prendre les commandes de glaces d'un groupe et à les servir efficacement**.

Deux usages, une seule app :
- **Entre proches** : goûter, soirée, vacances. Une personne sert les glaces aux autres.
- **Petit commerce** : stand, buvette, food truck, glacier qui prend des commandes groupées.

Deux façons de prendre la commande, utilisables ensemble :
- **Lien partagé** (`/t/<code>`, QR code) : chacun choisit sa glace sur son téléphone, sans
  compte ni installation. Les commandes arrivent en direct chez celui qui sert.
- **Saisie par celui qui sert**, pour ceux qui n'ont pas de téléphone (enfants, grands-parents).

Puis le **plan de service** : les commandes individuelles sont réorganisées en étapes
(`contracts/plan.ts`) :
1. sortir les contenants (2 cornets, 3 pots) ;
2. les boules **parfum par parfum et étage par étage** : dans un cornet, la première boule doit
   être posée avant la deuxième, donc on fait toutes les premières boules (un bac ouvert à la
   fois), puis toutes les deuxièmes. Dans un pot, l'ordre est libre : les boules sont rangées
   pour que les parfums les plus demandés tombent au même étage, donc moins de bacs ouverts ;
3. les suppléments ;
4. servir, personne par personne (les invités voient « Servie » sur leur téléphone).

La clé d'une étape cochée contient son nombre (`l0:<parfum>:3`) : si une commande arrive après
coup, l'étape réapparaît non cochée.

## Ce qui est en place (v0.1, 25 octobre 2026)

Le projet avait été commencé puis mis en pause ; il a été entièrement refait le 25 octobre 2026
sur le modèle d'Equiliz et Babelibris (l'ancien code n'existait plus que sous forme de README).

- **Sans compte** (comme Babelibris) : « Commencer » crée une session liée à l'appareil
  (`users.anonymous`). Créer un compte ensuite garde la carte et les tournées.
- **Ma carte** : parfums (nom, couleur), suppléments, contenants (cornet ou pot, nombre de boules
  maximum). Interrupteur « disponible » (un parfum épuisé disparaît du lien), retrait de la carte
  (archivé : les anciennes commandes le nomment encore), « Remettre les parfums classiques ».
  Une carte classique est créée avec chaque nouvel utilisateur (`contracts/menu.ts`).
- **Tournées** : création, lien et QR code, saisie des commandes (dupliquer « la même pour
  quelqu'un d'autre », précision libre), récapitulatif « À prévoir », plan de service à cocher,
  fermeture (le lien ne prend plus de commande) et historique. Mise à jour en direct par
  interrogation toutes les 4 à 5 s (pas de websocket).
- **Page invité** : prénom retenu par le navigateur, plusieurs glaces par personne (enfants),
  modification et annulation tant que la glace n'est pas servie (jeton secret gardé dans le
  navigateur, `orders.guest_token`), liste de ceux qui ont déjà commandé.
- **Bêta gratuite** (décidée par Bastien le 25 oct. 2026 : Glacify n'était pas pensée comme une
  app payante) : tout est gratuit et illimité pour tout le monde, comme la bêta d'Equiliz, et
  l'interface ne parle ni de paiement ni de Premium (« Bêta gratuite » dans Moi). Seuls restent
  les plafonds anti-abus de `HARD_LIMITS` (150 glaces par tournée, 8 par invité…).
  Le mécanisme d'une éventuelle version payante est gardé en sommeil : limites dans
  `contracts/plans.ts`, `users.premium`, `api/lib/entitlements.ts`. Il ne s'active que si le
  serveur tourne avec `BETA_PREMIUM=false` (sans la variable, tout reste gratuit). À ne
  rallumer que sur décision de Bastien.

## Direction artistique : « gelato chic »

Choisie par Bastien le 25 octobre 2026. Un comptoir clair et lumineux, une typographie forte, et
**les couleurs viennent des parfums** :
- fond blanc, cartes gris très clair (`surface`), texte encre presque noire (`ink`) ;
- titres en Bricolage Grotesque (gras, serré), texte en Inter ;
- boutons principaux en encre, sans halo ; accent framboise `#DE3163` (logo, bande des pots) ;
  vert pistache pour « servi » et « disponible » ;
- illustrations de glaces en SVG (`src/components/IceCream.tsx`) : boules empilées sur un
  cornet gaufré ou dans un pot, construites boule par boule pendant la commande ;
- tuiles de parfums pleines couleur, texte foncé ou blanc selon la couleur (`inkOn`).

Logo : un cornet à une boule blanche ourlée de rose, sur fond framboise (`marketing/logo/`,
icônes rendues par `node marketing/logo/render.cjs`).

## Mise en ligne (à faire)

Rien n'est encore déployé. Prévu : https://glacify.bastiengaffet.fr, service `glacify` sur
`127.0.0.1:8103`, base `glacify` dans la MariaDB existante. Pas à pas complet (DNS, VPS, premier
déploiement, premier test sur téléphone, APK) : **`GUIDE-BASTIEN.md`**.

## Feuille de route (proposée)

1. Mise en ligne sur le VPS, puis premier APK (workflow `Android`).
2. Prix (par contenant, par boule, par supplément) et total par tournée, pour l'usage commerce.
3. (Seulement si Bastien le décide un jour) une version payante : le mécanisme est déjà là.
4. Tutoriel interactif (visite guidée, comme Equiliz) joué sur une tournée de démonstration.
5. Statistiques : parfums les plus demandés, pour savoir quoi racheter.
6. Plusieurs serveurs sur la même tournée (partager l'accès au plan de service).
