# Déploiement sur le VPS

**En ligne depuis le 26 octobre 2026.** Même modèle qu'Equiliz et Babelibris :

- Service systemd `glacify` (utilisateur système `glacify`) sur `127.0.0.1:8103` (vérifier que
  le port est libre), unité `deploy/glacify.service` → `/etc/systemd/system/glacify.service`.
- Code et build : `/opt/glacify/app` (compilation dans `/opt/glacify/build`).
- Secrets : `/opt/glacify/app/.env` (600, root ; modèle `.env.example`), générés sur le serveur.
- Base `glacify` et utilisateur `glacify@127.0.0.1` (droits sur cette base seulement) dans la
  MariaDB existante.
- Vhost : `deploy/nginx-glacify.conf` → `/etc/nginx/sites-available/glacify.conf`, sur
  `127.0.0.1:8443` (le 443 public est multiplexé par le bloc `stream`).
- Certificat : certbot en webroot (`/var/www/glacify-acme`).
- DNS : enregistrement A `glacify` → `72.62.190.7`.

## Première installation (sur le VPS, en root)

```bash
useradd --system --home /opt/glacify --shell /usr/sbin/nologin glacify
mkdir -p /opt/glacify/app /opt/glacify/apk /var/www/glacify-acme
mysql -e "CREATE DATABASE glacify; CREATE USER 'glacify'@'127.0.0.1' IDENTIFIED BY '<mot de passe>'; GRANT ALL ON glacify.* TO 'glacify'@'127.0.0.1';"
# .env : copier .env.example, APP_SECRET=$(openssl rand -hex 32), DATABASE_URL avec le mot de passe
cp deploy/glacify.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable glacify
# nginx : d'abord le bloc port 80 seul, certbot, puis le fichier complet
certbot certonly --webroot -w /var/www/glacify-acme -d glacify.bastiengaffet.fr
ln -s /etc/nginx/sites-available/glacify.conf /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
```

## Mise à jour

```bash
cd app
sh deploy/push.sh
```

Envoie le code dans `/opt/glacify/build`, compile là-bas (le site en ligne n'est pas touché),
bascule vers `/opt/glacify/app`, applique les migrations puis redémarre le service.
Si une dépendance change, `package-lock.json` doit être à jour (le VPS lance `npm ci`).

## APK Android (test)

Compilé par GitHub Actions (workflow `Android`, lancé à la main), jamais sur le PC. L'APK charge
le site en ligne : une mise à jour web suffit, sauf changement d'icône ou de config Capacitor.
Icônes : `android-res/`, rendues depuis `marketing/logo/*.svg` par `marketing/logo/render.cjs`.

## Schéma

`db/schema.ts`. Après une modification : `npm run db:generate` (migration SQL dans
`db/migrations/`, à committer), appliquée au déploiement suivant.
