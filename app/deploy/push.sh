#!/bin/sh
# Envoie le code du PC vers le dossier de build du VPS puis lance deploy.sh.
# Le site en ligne (/opt/glacify/app) n'est touché qu'une fois le build réussi :
# aucune coupure pendant npm ci et la compilation.
# Usage (depuis app/) : sh deploy/push.sh
set -eu
HOST=${GLACIFY_HOST:-root@72.62.190.7}
tar czf - --exclude=node_modules --exclude=dist --exclude=.env . | ssh "$HOST" '
  set -e
  mkdir -p /opt/glacify/build
  cd /opt/glacify/build
  find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .env -exec rm -rf {} +
  tar xzf - 2>/dev/null
  sh deploy/deploy.sh
'
