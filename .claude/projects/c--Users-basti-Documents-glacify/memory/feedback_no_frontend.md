---
name: Ne pas coder le frontend sans instruction explicite
description: L'utilisateur gère lui-même le frontend et les couleurs, Claude ne doit pas créer d'écrans UI de sa propre initiative
type: feedback
---

Ne pas créer de fichiers frontend (écrans, composants, styles, couleurs) sauf si l'utilisateur fournit le code exact à utiliser.

**Why:** L'utilisateur considère Claude mauvais en frontend et préfère gérer cette partie lui-même.

**How to apply:** Pour un projet React Native / Expo, limiter les créations de fichiers aux configs et à la logique métier (store, types, utils). Attendre que l'utilisateur fournisse le code frontend avant de le créer.
