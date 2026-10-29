# Glacify — contexte du projet

Mis à jour le 26 octobre 2026.

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
2. les boules **un bac à la fois** (décision de Bastien, 26 oct. 2026) : on ouvre le parfum le
   plus commandé, on sert toutes ses boules, on le remet au congélateur, puis le suivant. Chaque
   bac n'est ouvert qu'une fois. L'ordre des boules est donc libre, dans un pot **comme dans un
   cornet** (l'invité en est prévenu : « L'ordre des boules peut changer au service »). Pour ne
   pas se perdre, chaque bac regroupe les personnes selon ce que leur contenant a déjà :
   « Dans 3 cornets et 2 pots vides : … », « Sur mangue et chocolat : … » ;
3. les suppléments ;
4. servir, personne par personne (les invités voient « Servie » sur leur téléphone).

La clé d'une étape cochée contient son nombre (`b:<parfum>:<boules>`) : si une commande arrive après
coup, l'étape réapparaît non cochée.

**Mode service plein écran** (demandé par Bastien le 26 oct. 2026, pour un service plus ludique) :
le bouton « Commencer le service » ouvre les étapes une par une, en plein écran
(`src/pages/round/ServiceMode.tsx`, chargé à la demande avec la bibliothèque `motion`). On passe
d'un écran à l'autre en validant ou en glissant. Chaque bac a son écran : on touche la tuile d'une
personne quand sa boule est posée (la boule tombe dans le dessin), ou « Au congélateur ! » valide
tout le bac d'un coup (le couvercle se referme, puis l'écran suivant arrive). Une commande tardive
est annoncée par un bandeau et rouvre ses étapes. L'onglet Service garde la liste complète comme
**récapitulatif**. Les étapes et les clés de coche sont dans `serviceSteps.ts`. Les coches partent
au serveur l'une après l'autre, par lots, et le serveur verrouille la ligne (`useServiceState.ts`,
`rounds.setCheck`) : des touches rapides ne se perdent pas.
Si toucher chaque tuile devient trop lourd à l'usage, Bastien envisage de ne garder qu'un bouton
« Bac terminé » par écran.

L'ancien plan « étage par étage » (toutes les premières boules, puis les deuxièmes ; l'ordre
d'un cornet respecté) est gardé dans le tag `v0.1-minimaliste`.

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
  l'interface ne parle ni de paiement ni de Premium, ni même de bêta (mention retirée de Moi
  le 29 oct. 2026, à la demande de Bastien). Seuls restent
  les plafonds anti-abus de `HARD_LIMITS` (150 glaces par tournée, 8 par invité…).
  Le mécanisme d'une éventuelle version payante est gardé en sommeil : limites dans
  `contracts/plans.ts`, `users.premium`, `api/lib/entitlements.ts`. Il ne s'active que si le
  serveur tourne avec `BETA_PREMIUM=false` (sans la variable, tout reste gratuit). À ne
  rallumer que sur décision de Bastien.

## Motifs des parfums (29 oct. 2026)

Un parfum a une couleur et, au choix, un **motif** dessiné dans la seconde couleur (`accent`) :
uni, éclats (stracciatella, menthe chocolat), marbré (caramel), morceaux (fraise, pistache),
grains (vanille, framboise). Choix de Bastien : des motifs dessinés plutôt que des photos.
Dessin unique dans `src/components/FlavorPattern.tsx`, utilisé par les boules (`IceCream`), les
tuiles de commande, la carte et le service. La carte classique en est équipée, et la migration
`0001_flavor_patterns` a équipé les parfums classiques des cartes existantes.

## Langues (29 oct. 2026)

Français et anglais, sur le modèle d'Equiliz : `src/lib/i18n.tsx`, dictionnaires
`src/lib/locales/fr.ts` (référence) et `en.ts` (anglais britannique, « carte » devient « menu »).
Choix dans Moi > Préférences > Langue, sinon la langue du téléphone. La page invité a un
sélecteur FR/EN. Le serveur n'écrit aucun texte : il renvoie des codes d'erreur
(`contracts/errors.ts`), traduits par l'application. La carte classique est créée dans la langue
choisie (`DEFAULT_FLAVORS` porte les deux noms), et « Remettre les parfums classiques » reconnaît
un parfum sous ses deux noms.

## Direction artistique : « Pop » (par défaut) et « Épuré »

Deux styles, au choix dans Moi > Préférences > Style (`src/lib/style.tsx`, stocké dans le
navigateur, attribut `data-style` sur `<html>`). **Pop** est le style par défaut depuis le
29 oct. 2026 ; **Épuré** est l'ancien « gelato chic », gardé tel quel.

**Pop** (synthèse validée par Bastien le 29 oct. 2026, maquettes : canevas « Glacify – pistes de
DA », écrans « Synthèse ») : base « Pop sorbet » avec des emprunts aux pistes Comptoir et
Gelateria.
- titres en Fredoka, texte en Nunito ; contours noirs épais (3 px) façon autocollant ;
- aplats de couleurs : `sun` (orange, carte « Nouvelle tournée »), `mint` (tournée en cours),
  `lemon` (tuile QR code), `lilac` (badge d'initiales penché) ; boutons principaux framboise avec
  ombre pleine, **jamais noirs** (demande de Bastien) ;
- accueil : badge d'initiales penché, carte « Nouvelle tournée » + bouton « C'est parti », chaque
  tournée en cours avec sa barre de progression framboise (continue, arrondie) et sa tuile QR code
  à côté, « La vitrine » (parfums disponibles en pastilles arrondies cerclées de noir, motifs) ;
- barre du bas flottante, icônes + libellés, l'onglet actif rempli en framboise sur tout son
  tiers, arrondi des deux côtés ;
- service plein écran : progression en segments colorés (vert fait, framboise en cours) et « 2/6 »
  ; l'écran d'un bac prend la couleur et le motif du parfum, avec le bac dessiné, « Bac 1 sur 4 »,
  « 5 boules / 2 posées, encore 3 » et le nom en grand (texte blanc sur parfum foncé) ; les
  personnes sont dans une carte blanche qui s'arrête à son contenu et défile à l'intérieur
  au-dessus du bouton « Au congélateur ! » ; une tuile cochée passe en menthe et penche.
- En code : variante Tailwind `pop:` et règles `[data-style="pop"]` dans `src/index.css` pour les
  pièces communes (`.card`, `.btn-*`, `.field`, `.title`) ; l'accueil Pop est un composant à part
  (`PopHome`), l'Épuré garde `PlainHome`.

### Épuré (ancien « gelato chic »)

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

## Mise en ligne (faite le 26 octobre 2026)

En ligne sur https://glacify.bastiengaffet.fr : enregistrement A `glacify` → `72.62.190.7` (API
Hostinger), service systemd `glacify` sur `127.0.0.1:8103`, base `glacify` dans la MariaDB
existante, certificat Let's Encrypt (webroot). Le premier APK (workflow `Android`) est servi sur
https://glacify.bastiengaffet.fr/glacify.apk. Mises à jour : `sh deploy/push.sh` depuis `app/`.
Les scripts de `deploy/` doivent rester en LF (`.gitattributes`) : extraits en CRLF sous Windows,
`sh` échoue sur le VPS. Pas à pas et premier test sur téléphone : **`GUIDE-BASTIEN.md`**.

## Feuille de route (proposée)

1. Premier test sur téléphone (site et APK) et retours de Bastien, notamment sur le mode
   service plein écran.
2. ~~Nouvelle direction artistique~~ : faite le 29 oct. 2026 (style Pop, voir plus haut).
   Retours de Bastien sur téléphone à recueillir.
3. **D'autres façons de rendre l'app ludique** (souhait de Bastien) : retours physiques
   (vibrations, ressorts), états vides illustrés, animation à l'arrivée d'une commande, bilan de
   fin de tournée.
4. Prix (par contenant, par boule, par supplément) et total par tournée, pour l'usage commerce.
5. (Seulement si Bastien le décide un jour) une version payante : le mécanisme est déjà là.
6. Tutoriel interactif (visite guidée, comme Equiliz) joué sur une tournée de démonstration.
7. Statistiques : parfums les plus demandés, pour savoir quoi racheter.
8. Plusieurs serveurs sur la même tournée (partager l'accès au plan de service).
