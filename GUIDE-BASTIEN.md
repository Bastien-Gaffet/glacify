# Guide de Bastien : mettre Glacify en ligne et le tester

Rédigé le 25 octobre 2026, à la fin de la session où Glacify a été refait. Tout ce qui suit se
fait depuis votre ordinateur (accès SSH au VPS, jeton DNS Hostinger). Rien n'est encore en
ligne : ni DNS, ni base, ni service.

---

## 0. Récupérer le code

Tout le code est sur GitHub, sur la branche **`ccr-30a92e47-5yjyst`** (pas encore sur `main`).

```bash
git clone https://github.com/Bastien-Gaffet/glacify.git
cd glacify
git checkout ccr-30a92e47-5yjyst
```

**À faire en premier : la fusionner dans `main`** (pull request ou
`git checkout main && git merge ccr-30a92e47-5yjyst && git push`). C'est nécessaire pour le
bouton « Run workflow » du workflow **Android** : GitHub ne propose un lancement manuel que si
le fichier du workflow est sur la branche par défaut.

La CI (types, tests, build) passe déjà sur cette branche.

---

## 1. DNS : `glacify.bastiengaffet.fr`

Ajouter un enregistrement **A** `glacify` → `72.62.190.7`, comme pour `babelibris`.
Par l'API Hostinger : le jeton est dans `/root/equiliz-secrets/hostinger-api-token` sur le VPS
(**valable jusqu'à mi-novembre 2026**), ou à la main dans le panneau Hostinger.

Vérifier : `dig +short glacify.bastiengaffet.fr` doit répondre `72.62.190.7`.

---

## 2. Préparer le VPS (une seule fois, en root)

Avant tout, **vérifier que le port 8103 est libre** (Equiliz utilise 8099, Babelibris 8102) :

```bash
ss -ltnp | grep 8103   # rien ne doit s'afficher
```

S'il est pris, choisir un autre port et le remplacer dans `app/.env.example`,
`app/deploy/nginx-glacify.conf` et le `.env` ci-dessous.

### Utilisateur, dossiers, base

```bash
useradd --system --home /opt/glacify --shell /usr/sbin/nologin glacify
mkdir -p /opt/glacify/app /opt/glacify/apk /var/www/glacify-acme
PASS=$(openssl rand -hex 16)
mysql -e "CREATE DATABASE glacify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
          CREATE USER 'glacify'@'127.0.0.1' IDENTIFIED BY '$PASS';
          GRANT ALL ON glacify.* TO 'glacify'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

### Fichier `.env` (secrets, jamais affichés ni committés)

```bash
cat > /opt/glacify/app/.env <<EOF
NODE_ENV=production
APP_URL=https://glacify.bastiengaffet.fr
HOST=127.0.0.1
PORT=8103
APP_SECRET=$(openssl rand -hex 32)
DATABASE_URL=mysql://glacify:$PASS@127.0.0.1:3306/glacify
REGISTRATION_OPEN=true
BETA_PREMIUM=true
EOF
chmod 600 /opt/glacify/app/.env
```

`BETA_PREMIUM=true` est la valeur par défaut de toute façon : tout est gratuit et illimité.

### Service systemd

Le fichier est dans le dépôt (`app/deploy/glacify.service`). Il utilise le même Node que les
autres apps (`/opt/node-v24.18.0-linux-x64`) : vérifier que ce chemin existe toujours.

```bash
# depuis le PC, dans app/ :
scp deploy/glacify.service root@72.62.190.7:/etc/systemd/system/glacify.service
# sur le VPS :
systemctl daemon-reload && systemctl enable glacify   # pas encore start : il n'y a pas de build
```

### nginx et certificat

Le 443 public est déjà multiplexé par le bloc `stream` : tout le TLS part vers
`127.0.0.1:8443`, rien à y ajouter. Le certificat n'existe pas encore, donc on fait en deux temps.

1. D'abord **seulement le bloc port 80**, pour que certbot puisse valider :

   ```bash
   cat > /etc/nginx/sites-available/glacify.conf <<'EOF'
   server {
       listen 80;
       server_name glacify.bastiengaffet.fr;
       location /.well-known/acme-challenge/ { root /var/www/glacify-acme; }
       location / { return 301 https://glacify.bastiengaffet.fr$request_uri; }
   }
   EOF
   ln -s /etc/nginx/sites-available/glacify.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot certonly --webroot -w /var/www/glacify-acme -d glacify.bastiengaffet.fr
   ```

2. Puis **le fichier complet** du dépôt (`app/deploy/nginx-glacify.conf`) à la place :

   ```bash
   # depuis le PC, dans app/ :
   scp deploy/nginx-glacify.conf root@72.62.190.7:/etc/nginx/sites-available/glacify.conf
   # sur le VPS :
   nginx -t && systemctl reload nginx
   certbot renew --dry-run --cert-name glacify.bastiengaffet.fr
   ```

---

## 3. Premier déploiement

Depuis le PC, dans `app/` (même méthode que Babelibris) :

```bash
sh deploy/push.sh
```

Le script envoie le code dans `/opt/glacify/build` et compile sur le VPS (`npm ci`, `npm run
check`, `npm run build`). Il bascule ensuite vers `/opt/glacify/app`, crée les tables
(`npm run db:migrate`) et démarre le service. Rien à installer sur le PC.

Vérifier :

```bash
curl -s https://glacify.bastiengaffet.fr/api/trpc/ping   # {"result":{"data":{"json":{"ok":true,...
journalctl -u glacify -n 30
```

Mises à jour suivantes : la même commande `sh deploy/push.sh`. Il n'y a pas de coupure : le
site ne bascule qu'une fois le build réussi.

---

## 4. Tester sur le téléphone (première fois)

Ouvrir **https://glacify.bastiengaffet.fr** sur le téléphone. Pour l'avoir comme une app :
menu du navigateur, « Ajouter à l'écran d'accueil ».

Le mieux est de tester avec **deux téléphones** : le vôtre (celui qui sert) et celui d'un
proche (un invité). À défaut, ouvrez le lien invité dans une fenêtre de navigation privée.

À vérifier :

1. **Accueil** : « Commencer » avec votre prénom, sans compte.
2. **Ma carte** : passer un parfum en épuisé, en ajouter un avec sa couleur, modifier un
   contenant (nombre de boules).
3. **Nouvelle tournée** (« Goûter » par exemple), puis le **QR code** (icône en haut à
   droite).
4. **Invité** : scanner le QR code avec l'autre téléphone, mettre son prénom, choisir pot ou
   cornet, les parfums, un supplément, puis « Envoyer ma commande ». Le parfum épuisé ne doit
   pas apparaître. Essayer « Ajouter une autre glace » (pour un enfant).
5. **Chez vous** : la commande arrive en moins de 5 s, sans recharger. Ajouter aussi une glace
   vous-même (« Ajouter une glace »), et essayer le bouton « la même pour quelqu'un d'autre ».
6. **Service** : cocher les étapes, puis « Servir » une personne. Sur le téléphone de
   l'invité, sa glace doit passer à « Servie, bonne dégustation ».
7. **Fermer la tournée** (menu « … ») : le lien ne prend plus de commande, la tournée passe
   dans l'historique.
8. **Moi** : « Créer un compte » garde la carte et les tournées. « Bêta gratuite » doit être
   affiché.

Notez tout ce qui ne va pas, même les petits détails visuels : ce sera la liste de la
prochaine session.

---

## 5. APK Android (test)

Une fois la branche fusionnée dans `main` (étape 0) :

```bash
gh workflow run android.yml -R Bastien-Gaffet/glacify
gh run list -R Bastien-Gaffet/glacify --workflow android.yml     # attendre la fin (~5 min)
gh run download <id> -R Bastien-Gaffet/glacify -n glacify-android -D ../apk
scp ../apk/glacify-debug.apk root@72.62.190.7:/opt/glacify/apk/glacify-debug.apk
```

Puis sur le téléphone : **https://glacify.bastiengaffet.fr/glacify.apk** (servi par nginx).
L'APK charge le site en ligne : une mise à jour web suffit ensuite, sauf si l'icône ou la
config Capacitor change.

**Pas encore testé** : ce workflow n'a jamais tourné, faute de Java et du SDK Android pendant
la session. Il est copié de celui de Babelibris, qui marche. Seul `deploy/android-patch.mjs`
change : bords transparents avec icônes sombres, fond blanc. S'il échoue, le journal de
l'action dira quelle étape.

---

## 6. Les décisions prises (25 octobre 2026)

- **Repartir de zéro.** L'ancien Glacify ne fonctionnait pas, n'était pas attractif et était
  difficile à utiliser. La première refonte (site statique sans dépendance) ne suivait pas vos
  standards. Elle a été remplacée par la **même stack et le même hébergement qu'Equiliz et
  Babelibris** : React + Vite + Hono/tRPC + Drizzle/MariaDB, systemd derrière le nginx
  multiplexé, Capacitor pour Android, CI GitHub.
- **Usage** : entre proches **et** petit commerce (stand, buvette), dans la même app.
- **Prise de commande** : **les deux modes**. Un lien ou QR code (chacun commande sur son
  téléphone, sans compte), et la saisie par celui qui sert pour les autres.
- **Plan de service** : contenants, puis boules **parfum par parfum et étage par étage**,
  puis suppléments, puis distribution. Dans un cornet, l'ordre demandé des boules est
  respecté. Dans un pot, il est réorganisé pour ouvrir moins de bacs. Une étape cochée se
  décoche seule si une nouvelle commande la change.
- **Sans compte pour commencer** (comme Babelibris). Un compte, plus tard, garde tout.
- **Les invités** n'ont pas de compte. Un jeton secret gardé par leur navigateur leur permet
  de modifier ou d'annuler leurs glaces tant qu'elles ne sont pas servies. Les parfums épuisés
  leur sont cachés.
- **Direction artistique « gelato chic »** : fond blanc, titres en Bricolage Grotesque, texte
  en Inter, boutons noirs sans halo, accent framboise `#DE3163`, vert pistache pour
  « servi ». **Les couleurs viennent des parfums.** Les glaces sont dessinées en SVG, boules
  enfoncées dans le cornet ou le pot.
- **Logo** : cornet gaufré tenant une boule blanche ourlée de rose, sur fond framboise,
  agrandi pour remplir l'icône.
- **Règles reprises de vos autres apps** : aucun emoji, pas de fenêtres système (`confirm`,
  `select`), vouvoiement partout.
- **Gratuit** : Glacify n'est **pas** une app payante. Comme la bêta d'Equiliz, tout est
  gratuit et illimité, et il n'y a aucune mention de Premium. Le mécanisme de limites reste en
  sommeil dans le code ; il ne s'activerait qu'avec `BETA_PREMIUM=false`. Seuls restent des
  garde-fous anti-abus : 150 glaces par tournée, 8 par invité.
  Le dépôt peut donc rester public, et la licence MIT ne pose pas de problème.
- **Noms techniques** : adresse `glacify.bastiengaffet.fr`, service, utilisateur et base
  `glacify`, port `8103`, paquet Android **`app.glacify.android`**. Ce dernier devient
  **définitif** dès le premier envoi sur Google Play.

Le détail technique est dans `CONTEXTE-PROJET.md` (produit, DA, feuille de route) et
`app/deploy/README.md` (déploiement). `CLAUDE.md` donne les règles aux prochaines sessions.

---

## 7. Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié pendant la session, sur une vraie base MariaDB et deux navigateurs de téléphone
simulés : le parcours complet (hôte, invité par le lien, service, « Servie » chez l'invité,
carte, compte), les types, les 8 tests unitaires et le build de production. La CI GitHub est
verte.

Pas vérifié : le déploiement sur le VPS (pas d'accès), l'APK Android, le partage natif
(« Envoyer ») sur un vrai téléphone, et l'affichage sur un vrai écran avec encoche.

## 8. Ensuite (proposé)

1. Vos retours après le premier test sur téléphone.
2. Les prix (par contenant, par boule, par supplément) et un total par tournée, pour le stand.
3. Un tutoriel interactif (visite guidée sur une tournée de démonstration, comme Equiliz).
4. Les statistiques des parfums les plus demandés, pour savoir quoi racheter.
5. Plusieurs personnes qui servent la même tournée.
