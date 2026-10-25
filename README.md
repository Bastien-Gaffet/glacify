# Glacify

Prenez les commandes de glaces de tout le monde, servez-les dans le bon ordre.

Chacun choisit sa glace sur son téléphone grâce à un lien (ou celui qui sert la saisit), puis
Glacify transforme les commandes en plan de service : contenants, boules parfum par parfum et
étage par étage, suppléments, puis distribution.

- Contexte, décisions et feuille de route : [`CONTEXTE-PROJET.md`](CONTEXTE-PROJET.md)
- Code : [`app/`](app) (React + Vite + Hono/tRPC + Drizzle/MariaDB, Capacitor pour Android)
- Mise en ligne et premier test, pas à pas : [`GUIDE-BASTIEN.md`](GUIDE-BASTIEN.md)
- Déploiement (référence) : [`app/deploy/README.md`](app/deploy/README.md)

## Développement

```bash
cd app
cp .env.example .env   # puis renseigner DATABASE_URL (MariaDB) et APP_SECRET
npm install
npm run db:migrate
npm run dev            # http://localhost:3000
```

Vérifications : `npm run check`, `npm test`, `npm run build`.

## Droits

© 2026 Bastien Gaffet. Tous droits réservés. Le code est public pour être consulté, mais aucune
licence n'est accordée : sa réutilisation, sa copie, sa modification ou sa redistribution
demandent une autorisation écrite.
