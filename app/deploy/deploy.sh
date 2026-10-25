#!/bin/sh
# Build puis bascule de Glacify sur le VPS. Lancé par push.sh depuis
# /opt/glacify/build (copie du code envoyée par le PC).
#
# 1. Tout se compile dans /opt/glacify/build : le site en ligne continue de
#    tourner, et un build raté ne touche à rien.
# 2. Bascule vers /opt/glacify/app par rsync. Les anciens fichiers de
#    dist/public/assets sont gardés 14 jours : un onglet ouvert avant le
#    déploiement réclame encore les anciens noms de fichiers (index-xxxx.js),
#    ils doivent rester servis sinon la page tombe sur un écran gris.
set -eu

export PATH=/opt/node-v24.18.0-linux-x64/bin:$PATH
BUILD=/opt/glacify/build
APP=/opt/glacify/app
cd "$BUILD"

# Même configuration que le site (variables VITE_ éventuelles, base de données)
ln -sfn "$APP/.env" .env

npm ci --no-audit --no-fund
npm run check
npm run build

# Code et dépendances : copie exacte
rsync -a --delete --exclude node_modules --exclude dist --exclude .env "$BUILD/" "$APP/"
rsync -a --delete "$BUILD/node_modules/" "$APP/node_modules/"
# Build : copie exacte, sauf les anciens assets hachés qu'on protège
rsync -a --delete --filter='P public/assets/*' "$BUILD/dist/" "$APP/dist/"
find "$APP/dist/public/assets" -type f -mtime +14 -delete

# Les migrations lisent DATABASE_URL dans .env (drizzle.config.ts charge dotenv)
cd "$APP"
npm run db:migrate

chown -R glacify:glacify "$APP/dist"
systemctl restart glacify
sleep 2
systemctl --no-pager --lines=5 status glacify
