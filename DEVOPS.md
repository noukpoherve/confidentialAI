# Guide DevOps — Confidential Agent

Ce guide explique toute la pipeline DevOps mise en place pour ce projet.

---

## Vue d'ensemble : C'est quoi une pipeline DevOps ?

```
Ton code local
     │
     ▼ git push
GitHub (dépôt)
     │
     ▼ déclenche automatiquement
GitHub Actions (CI/CD)
     │
     ├─► Tests (CI)           → vérifie que rien n'est cassé
     │
     ├─► Deploy API           → Koyeb (FastAPI)
     ├─► Deploy Dashboard     → Vercel (Next.js)
     └─► Build Extension      → artifacts .zip
```

**DevOps = automatiser tout ce qui est répétitif** pour que tu puisses te concentrer sur le code.

---

## Structure des fichiers créés

```
confidential-agent/
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← Tests automatiques (tous les composants)
│       ├── deploy-api.yml          ← Déploie l'API sur Koyeb
│       ├── deploy-dashboard.yml    ← Déploie le dashboard sur Vercel
│       └── build-extension.yml    ← Build + package l'extension
└── services/
    └── security-api/
        ├── Dockerfile              ← Comment construire l'image Docker de l'API
        └── .dockerignore           ← Fichiers à exclure du build Docker
```

---

## Étape 1 : Configurer les Secrets GitHub

Les "secrets" sont des variables sensibles (clés API, tokens) que GitHub
stocke de façon chiffrée. Tes workflows y accèdent via `${{ secrets.NOM }}`.

**Aller dans :** GitHub → ton repo → Settings → Secrets and variables → Actions

### Secrets à créer :

#### Pour Koyeb (déploiement API)

| Secret | Valeur | Où trouver |
|--------|--------|-----------|
| `KOYEB_API_KEY` | ta clé API | [app.koyeb.com](https://app.koyeb.com) → Account → API Keys |
| `KOYEB_SERVICE_ID` | ID du service | Koyeb → ton service → URL du service |

**Comment créer le service Koyeb :**
1. Va sur [app.koyeb.com](https://app.koyeb.com)
2. Create Service → Docker
3. Image : `ghcr.io/TON-GITHUB-USERNAME/TON-REPO/security-api:latest`
4. Port : `8080`
5. Ajoute toutes tes variables d'environnement (MONGODB_URL, etc.)
6. Déploie une première fois manuellement
7. Copie l'ID du service depuis l'URL

#### Pour Vercel (déploiement Dashboard)

| Secret | Valeur | Où trouver |
|--------|--------|-----------|
| `VERCEL_TOKEN` | ton token | [vercel.com](https://vercel.com) → Settings → Tokens |
| `VERCEL_ORG_ID` | ton org ID | `vercel.com/account` → Settings → copie "Team ID" |
| `VERCEL_PROJECT_ID` | ID du projet | Dans `.vercel/project.json` après `vercel link` |

**Comment lier ton projet Vercel :**
```bash
npm i -g vercel
cd apps/admin-dashboard
vercel link
# Répond aux questions
cat .vercel/project.json  # Tu vois orgId et projectId
```

---

## Étape 2 : Comprendre le workflow CI

**Fichier :** [.github/workflows/ci.yml](.github/workflows/ci.yml)

Ce workflow se déclenche à chaque `git push`. Il fait :

```
Push sur n'importe quelle branche
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
Test API  Test   Test
(pytest) (Next) (Vitest)
    │      │      │
    └──────┴──────┘
           │
      CI Passed ✅ ou ❌
```

Si un test échoue → le merge est bloqué → tu dois corriger avant.

---

## Étape 3 : Comprendre le workflow Deploy API

**Fichier :** [.github/workflows/deploy-api.yml](.github/workflows/deploy-api.yml)

Se déclenche seulement quand tu pushes sur `main` ET que des fichiers de
`services/security-api/` ont changé.

```
Push sur main (fichiers API modifiés)
           │
    Build Docker image
    (multi-stage : builder + runtime)
           │
    Push sur ghcr.io (GitHub Container Registry)
           │
    Appel API Koyeb → "redéploie avec la nouvelle image"
           │
    Koyeb pull l'image → remplace les conteneurs → ✅
```

### Pourquoi Docker ?
Docker = une "boîte" qui contient ton application + toutes ses dépendances.
L'avantage : "ça marche sur ma machine" → "ça marche partout".

### Multi-stage build (dans le Dockerfile)
```dockerfile
# Stage 1 : "builder" — installe tout, compile
FROM python:3.11-slim AS builder
# ... installe les dépendances, télécharge spaCy

# Stage 2 : "runtime" — image finale légère
FROM python:3.11-slim AS runtime
# Copie SEULEMENT le résultat du builder (pas les outils de build)
```
Résultat : image 3x plus petite, plus rapide à déployer.

---

## Étape 4 : Comprendre le workflow Deploy Dashboard

**Fichier :** [.github/workflows/deploy-dashboard.yml](.github/workflows/deploy-dashboard.yml)

Vercel propose deux options :

### Option A (recommandée pour débuter) : Intégration native GitHub
1. Va sur vercel.com → Add New Project
2. Connecte ton repo GitHub
3. Configure le root directory : `apps/admin-dashboard`
4. C'est tout — Vercel gère tout automatiquement

### Option B : Via GitHub Actions (ce workflow)
Donne plus de contrôle : déploie seulement après que les tests CI passent.

```
PR créée → Preview deployment (URL unique pour la PR)
Push main → Production deployment (ton URL principale)
```

---

## Étape 5 : Comprendre le workflow Extension

**Fichier :** [.github/workflows/build-extension.yml](.github/workflows/build-extension.yml)

Utilise la **strategy matrix** : lance le même job 3 fois en parallèle.

```
Push main (fichiers extension modifiés)
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
Chrome  Firefox  Edge
build   build   build
    │      │      │
    └──────┴──────┘
           │
    Artifacts .zip disponibles
    (GitHub → Actions → Summary → Artifacts)
```

Pour créer une release avec les zips :
GitHub → Actions → Build Browser Extension → Run workflow → cocher "Créer une release"

---

## Stratégie de branches (Git Flow simplifié)

```
main          ← Production (protégée, merge uniquement via PR)
  │
develop       ← Intégration (merge des features avant main)
  │
feature/xxx   ← Tes fonctionnalités en cours
fix/xxx       ← Tes corrections de bugs
```

**Règle d'or :** Ne jamais pusher directement sur `main`.

**Workflow quotidien :**
```bash
git checkout develop
git pull
git checkout -b feature/ma-fonctionnalite

# ... travaille, commit ...

git push origin feature/ma-fonctionnalite
# Ouvre une PR sur GitHub → CI tourne → review → merge
```

---

## Variables d'environnement

### Pour l'API (Koyeb)
À configurer dans Koyeb → Service → Settings → Environment Variables :

```
ENVIRONMENT=production
MONGODB_URL=mongodb+srv://...  (MongoDB Atlas ou ton instance)
QDRANT_URL=https://...         (Qdrant Cloud ou ton instance)
QDRANT_API_KEY=...
JWT_SECRET=...                 (généré aléatoirement)
GROQ_API_KEY=...               (ton API key Groq)
```

### Pour le Dashboard (Vercel)
À configurer dans Vercel → Project → Settings → Environment Variables :

```
NEXT_PUBLIC_API_URL=https://ton-api.koyeb.app
```

---

## Commandes utiles

```bash
# Tester le Dockerfile localement avant de pusher
cd services/security-api
docker build -t security-api-test .
docker run -p 8080:8080 --env-file .env security-api-test

# Voir les logs d'un workflow GitHub Actions
# → GitHub → Actions → cliquer sur le run

# Forcer un redéploiement sans changer le code
# → GitHub → Actions → Deploy API to Koyeb → Run workflow
```

---

## Résumé visuel de ce qui se passe quand tu pushes

```
git push feature/xxx    → CI tourne (tests seulement)
git push develop        → CI tourne (tests seulement)
git push main           → CI + Deploy API + Deploy Dashboard + Build Extension
                          (seulement les composants qui ont changé)
```

---

## Prochaines améliorations possibles

- [ ] **Notifications Slack/Discord** quand un déploiement échoue
- [ ] **Health checks** : vérifier que l'API répond après déploiement
- [ ] **Rollback automatique** : revenir à la version précédente si le health check échoue
- [ ] **Environnement staging** : déployer develop sur Koyeb staging avant main
- [ ] **Dependabot** : mises à jour automatiques des dépendances
