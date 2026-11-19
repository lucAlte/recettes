# 📘 Guide d'installation complet : Mes Recettes

> Durée totale : **3 à 4 h**, en 7 phases. Chaque phase se termine par un **✅ Test de validation**. Ne passe pas à la suivante tant que le test ne passe pas, sinon tu débugueras 4 briques en même temps.

## Vue d'ensemble

```
📱 Instagram ──Partager──▶ 🤖 Bot Telegram
                                │ (webhook, 24 h/24)
                                ▼
              ☁️ Supabase Edge Function "telegram-webhook"
                                │ insère l'URL
                                ▼
              🗄️ Supabase : table import_queue (file d'attente durable)
                                ▲
        toutes les 5 min / au démarrage, quand le PC est allumé
                                │
💻 PC Windows → Docker Desktop → n8n
        1. réserve ≤ 3 imports      4. GPT met en forme (JSON strict)
        2. yt-dlp : légende + audio  5. miniature → Storage, recette → table recipes
        3. OpenAI transcrit l'audio  6. ✅ / ❌ message Telegram
                                │
                                ▼
🌐 App web (GitHub Pages) ◀──▶ Supabase (Auth + base + images + temps réel)
```

| Brique | Rôle | Coût |
|---|---|---|
| Supabase (Free) | Comptes, base, images, file d'attente, webhook | 0 € |
| GitHub Pages | Hébergement de l'app | 0 € (dépôt public) |
| Telegram | Bot de réception | 0 € |
| n8n en local (Docker) | Orchestration | 0 € |
| OpenAI | Transcription + mise en forme | ≈ 0,5 centime par recette |

**Ce que tu as entre les mains :**

```
recettes/
├── GUIDE.md                       ← ce fichier
├── README.md
├── docs/                          ← l'application web (GitHub Pages)
│   ├── index.html, manifest.webmanifest, assets/, css/
│   └── js/ (config.js ← à remplir, main.js, catalog.js, units.js, views/…)
├── supabase/
│   ├── schema.sql                 ← base de données complète
│   └── functions/telegram-webhook/index.ts
└── n8n/
    ├── Dockerfile, docker-compose.yml, entrypoint.sh
    ├── .env.example               ← à copier en .env
    ├── workflow-recettes.json     ← workflow n8n prêt à importer
    └── files/                     ← cookies.txt + audio temporaire
```

---

## Phase 0 : Prérequis (15 min)

Crée ou vérifie les comptes suivants :

- [ ] **GitHub** : https://github.com
- [ ] **Supabase** : https://supabase.com (connexion avec GitHub, c'est le plus simple)
- [ ] **OpenAI Platform** : https://platform.openai.com (≠ ChatGPT Plus : c'est l'API, facturée à l'usage)
  - Ajoute 5 $ de crédit (*Settings → Billing*). Cela couvre environ un millier de recettes.
  - **Fixe une limite de budget** (*Settings → Limits*), par exemple 5 $/mois. C'est ton filet de sécurité.
- [ ] **Telegram** installé sur ton téléphone
- [ ] **Docker Desktop** pour Windows : https://www.docker.com/products/docker-desktop
  - L'installeur active WSL 2 : accepte, puis redémarre le PC si demandé.

> 🔐 Prépare un gestionnaire de mots de passe ou un fichier texte **local** pour noter au fur et à mesure : URL Supabase, clé anon, clé service_role, token du bot, secret du webhook, clé OpenAI.

---

## Phase 1 : Supabase, la base de données (30 min)

### 1.1 Créer le projet
1. Supabase → **New project**.
2. Nom : `recettes`. Région : **West EU (Paris)** ou Frankfurt. Mot de passe de base : génère-le et garde-le.
3. Attends environ 2 min que le projet soit prêt.

### 1.2 Créer les tables, la sécurité et les fonctions
1. Menu gauche → **SQL Editor** → **New query**.
2. Colle **tout** le contenu de `supabase/schema.sql` → **Run**.
3. Résultat attendu : `Success. No rows returned`. Le script peut être relancé sans risque.

Ce script crée :

| Objet | Rôle |
|---|---|
| `households`, `household_members` | Les « instances » partagées (couple/famille) et leurs membres |
| `recipes` | Les recettes (ingrédients et étapes en JSON) |
| `shopping_items` | La liste de courses persistante (`todo` / `done` / `missing`) |
| `telegram_links` | Quel chat Telegram alimente quel espace |
| `import_queue` | File d'attente des Reels |
| RLS + droits par colonne | Chacun ne voit **que** ses espaces ; impossible de « s'inviter » ailleurs |
| `create_household`, `join_household`, `regenerate_codes` | Fonctions appelées par l'app |
| `claim_import_jobs`, `fail_import_job` | Fonctions appelées par n8n (clé service uniquement) |
| Bucket `recipe-images` | Photos des recettes |
| Realtime | Liste de courses synchronisée en direct entre vous deux |

### 1.3 Configurer l'authentification
1. **Authentication → URL Configuration** :
   - *Site URL* : `https://TON-PSEUDO-GITHUB.github.io/recettes/` (tu la confirmeras en phase 2).
   - *Redirect URLs* : ajoute la même URL, plus `http://localhost:5500/**` si tu testes en local.
2. **Authentication → Sign In / Providers → Email** :
   - Recommandé pour une app familiale : **désactive « Confirm email »**. Sinon, chaque inscription exige un clic dans un e-mail, et l'envoi d'e-mails par Supabase en version gratuite est limité à quelques messages par heure.

### 1.4 Récupérer les clés
**Project Settings → API Keys** (les intitulés peuvent légèrement varier selon les versions du tableau de bord) :

| Clé | Où l'utiliser | Secret ? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | app + n8n | Non |
| `anon` / *publishable* | app (`docs/js/config.js`) | **Non** : publique, protégée par la RLS |
| `service_role` (onglet *Legacy API keys*, commence par `eyJ…`) | **n8n uniquement** (`.env`) | **OUI** : elle donne tous les droits |

> ⚠️ Pour n8n, prends bien la clé **service_role legacy (JWT `eyJ…`)**. Le workflow l'envoie dans les en-têtes `apikey` et `Authorization: Bearer`, ce qui ne fonctionne pas avec les nouvelles clés `sb_secret_…`.

✅ **Test** : *Table Editor* → tu vois les 6 tables. *Storage* → le bucket `recipe-images` existe.

---

## Phase 2 : L'app sur GitHub Pages (30 min)

### 2.1 Configurer l'app
Ouvre `docs/js/config.js` et remplis :
```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ…ta clé anon…';
export const TELEGRAM_BOT_USERNAME = 'MesRecettesLuc_bot'; // tu le créeras en phase 3, reviens le mettre
```

### 2.2 Publier sur GitHub
1. GitHub → **New repository** → nom `recettes` → **Public** (obligatoire pour GitHub Pages gratuit) → *Create*.
2. Envoie **tout le dossier `recettes/`**, soit avec GitHub Desktop, soit en ligne de commande :
   ```bash
   cd recettes
   git init && git add . && git commit -m "Mes Recettes v1"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/recettes.git
   git push -u origin main
   ```
   Le `.gitignore` empêche l'envoi de `n8n/.env` et de `cookies.txt`.
   **Vérifie après le push que ces deux fichiers n'apparaissent PAS sur GitHub.**
3. Dépôt → **Settings → Pages** → *Source* : **Deploy from a branch** → Branch **main**, dossier **/docs** → *Save*.
4. Après 1 à 2 min, l'URL s'affiche : `https://TON-PSEUDO.github.io/recettes/`. Reporte-la dans Supabase (étape 1.3) si elle diffère.

### 2.3 Premier lancement
1. Ouvre l'URL → **S'inscrire** → crée ton compte.
2. Écran « Ton espace recettes » → **Créer un espace** (ex : « Chez Luc & Léa »).
3. **Réglages → Mon espace → Inviter** : envoie le code à ta compagne. Elle crée son compte puis choisit **Rejoindre un espace**.
4. Sur iPhone : Safari → Partager → **Sur l'écran d'accueil**. Sur Android : Chrome → ⋮ → **Ajouter à l'écran d'accueil**. L'app s'ouvre alors en plein écran.

✅ **Tests** :
- [ ] Créer une recette à la main avec une photo → elle apparaît dans la grille.
- [ ] Modifier la recette et changer la photo → la nouvelle photo s'affiche.
- [ ] Mettre 4 étoiles depuis la fiche, puis filtrer par « ★★★★ et plus ».
- [ ] **Préparer** → cocher la recette, mettre 4 portions → **Générer la liste** → décocher un ingrédient → **Ajouter à ma liste**.
- [ ] **Courses** → **Catalogue** → rayon *Entretien* → « Pastilles lave-vaisselle ».
- [ ] Marquer un article ⚠️ « introuvable », cocher les autres, puis **Courses terminées** : seul l'introuvable reste.
- [ ] Ouvrir la liste sur deux téléphones : cocher sur l'un fait cocher sur l'autre en 1 à 2 s.

---

## Phase 3 : Le bot Telegram (30 min)

### 3.1 Créer le bot
1. Dans Telegram, ouvre **@BotFather** → `/newbot`.
2. Nom affiché : `Mes Recettes`. Username : il doit finir par `bot` (ex : `MesRecettesLuc_bot`).
3. Note le **token** (`1234567890:AA…`).
4. Toujours chez BotFather, envoie `/setcommands`, choisis ton bot, puis colle :
   ```
   lier - Lier ce chat à ton espace (code)
   statut - Voir la file d'attente
   aide - Comment ça marche
   ```
5. Reporte le username dans `docs/js/config.js` (`TELEGRAM_BOT_USERNAME`), puis commit et push.

### 3.2 Déployer l'Edge Function (dans le navigateur, sans terminal)
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom : `telegram-webhook` (exactement).
3. Remplace le code d'exemple par le contenu de `supabase/functions/telegram-webhook/index.ts` → **Deploy**.
4. Dans les paramètres de la fonction, **désactive « Enforce JWT verification » / « Verify JWT »**. Telegram n'envoie pas de jeton Supabase. C'est le secret du webhook qui protège la fonction.
5. **Edge Functions → Secrets** → ajoute :
   - `TELEGRAM_BOT_TOKEN` = le token du bot
   - `TELEGRAM_WEBHOOK_SECRET` = une chaîne aléatoire de 32 caractères, **lettres et chiffres uniquement** (ex : générée par un gestionnaire de mots de passe)

> Alternative en ligne de commande (CLI Supabase) : `supabase functions deploy telegram-webhook --no-verify-jwt`.

### 3.3 Brancher Telegram sur la fonction
Colle cette URL dans ton navigateur, en remplaçant les 3 valeurs :
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<SECRET>&drop_pending_updates=true
```
- `<REF>` est l'identifiant de ton projet (le début de ton URL Supabase).
- Réponse attendue : `{"ok":true,"result":true,"description":"Webhook was set"}`.
- Vérification : `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`. Le champ `last_error_message` doit être absent.

### 3.4 Lier ton Telegram à ton espace
App → **Réglages → Bot Telegram → 🔗 Lier Telegram (1 clic)**. Telegram s'ouvre ; appuie sur **Démarrer**. Le bot répond « ✅ Chat lié à l'espace … ».
Ta compagne peut faire pareil avec son propre Telegram : les deux chats alimentent le même espace.

✅ **Test** :
- [ ] Sur Instagram, ouvre un Reel de recette → icône **Partager** (avion en papier) → **Telegram** (ou « Plus… » → Telegram) → ton bot.
- [ ] Le bot répond « 📥 Reçu ! 1 vidéo(s) en attente ».
- [ ] Dans l'app, le bandeau « ⏳ 1 vidéo en attente d'import » apparaît, et **Réglages → Imports** affiche la ligne « En attente ».
- [ ] Repartager le même Reel : le bot répond « déjà dans la file d'attente ».

En cas de problème : Supabase → Edge Functions → `telegram-webhook` → **Logs**.

---

## Phase 4 : n8n en local avec Docker (45 min)

### 4.1 Préparer Docker Desktop pour qu'il démarre tout seul
Docker Desktop → ⚙️ **Settings → General** :
- [x] **Start Docker Desktop when you sign in to your computer**
- [ ] *Open Docker Dashboard when Docker Desktop starts* : décoche-la, pour éviter une fenêtre à chaque démarrage.

Combiné à `restart: unless-stopped` dans `docker-compose.yml`, ça donne : **PC allumé → session ouverte → Docker démarre → n8n démarre**. Tu n'as rien à faire.

### 4.2 Configurer les secrets
1. Copie le dossier `recettes/n8n` à un endroit stable, par exemple `C:\Users\Luc\recettes-n8n\` (ou utilise directement ton clone Git).
2. Dans ce dossier, copie `.env.example` en **`.env`** et remplis-le :
   ```env
   OPENAI_API_KEY=sk-proj-...
   OPENAI_TEXT_MODEL=gpt-4.1-mini
   OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   TELEGRAM_BOT_TOKEN=1234567890:AA...
   ```
   > Vérifie sur https://platform.openai.com/docs/models que les deux modèles existent toujours. Remplace-les par leurs successeurs « mini » si besoin. Le workflow lit ces variables, donc tu n'as rien à modifier dans n8n.

### 4.3 Construire et lancer
Ouvre **PowerShell** dans ce dossier (clic droit dans l'Explorateur → *Ouvrir dans le terminal*) :
```powershell
docker compose up -d --build
```
- Le premier build prend 3 à 6 min (n8n, ffmpeg et yt-dlp sont installés dans l'image).
- Pour voir les logs : `docker compose logs -f`. Attends la ligne `Editor is now accessible via: http://localhost:5678`.

### 4.4 Importer le workflow
1. Ouvre http://localhost:5678 → crée ton compte propriétaire n8n (local).
2. **Workflows → Create → ⋯ → Import from File** → `workflow-recettes.json`.
3. Le workflow « Recettes Instagram → Supabase » s'affiche :

| # | Nœud | Rôle |
|---|---|---|
| 1 | **Démarrage de n8n** + **Toutes les 5 minutes** | Déclencheurs : au démarrage du PC, puis en continu |
| 2 | **Réserver les imports** | RPC `claim_import_jobs` : prend jusqu'à 3 liens en attente, sans doublon |
| 3 | **Liste des imports** | Revalide l'URL (sécurité), une ligne par vidéo |
| 4 | **Télécharger (yt-dlp)** | Légende + miniature + audio MP3 |
| 5 | **Lire l'audio** → **Transcrire (OpenAI)** | Transcription. Si la vidéo n'a pas de voix, on continue avec la légende seule |
| 6 | **Préparer le prompt** | Fusion légende + transcription, schéma JSON strict |
| 7 | **Mettre en forme (OpenAI)** | Recette structurée : titre, portions, temps, difficulté, régimes, ingrédients avec rayon, étapes |
| 8 | **Construire la recette** | Contrôles, puis mise au format de la table `recipes` |
| 9 | **Télécharger la miniature** → **Envoyer l'image (Storage)** | Image de la recette (facultatif : si ça échoue, la recette est créée sans image) |
| 10 | **Enregistrer la recette** → **Marquer comme importé** | Écriture en base |
| 11 | **Telegram ✅** → **Supprimer l'audio** | Notification + ménage |
| E | **Infos erreur** → **Remettre en file / échec** → **Telegram ❌** | 3 essais automatiques, puis statut `error` et notification |

4. Clique **Execute workflow** pour un premier test manuel. Le Reel partagé en phase 3 doit être traité.
5. Active le workflow : interrupteur **Active** en haut à droite, ou bouton **Publish** selon ta version de n8n.

> ℹ️ n8n v2 désactive par défaut le nœud *Execute Command*. Le `docker-compose.yml` le réactive (`NODES_EXCLUDE=[]`). Si le nœud apparaît en « ? » (inconnu), c'est que cette variable n'est pas prise en compte : relance `docker compose up -d --force-recreate`.

✅ **Test** :
- [ ] L'exécution est verte (*Executions*).
- [ ] Le bot envoie « ✅ Recette ajoutée : … ».
- [ ] La recette apparaît dans l'app, avec la miniature, les ingrédients rangés par rayon et les étapes.
- [ ] Redémarre le PC **sans rien ouvrir** → partage un nouveau Reel → dans les 5 min qui suivent l'ouverture de session, la recette arrive.

---

## Phase 5 : Cookies Instagram (seulement si yt-dlp échoue) (15 min)

Instagram bloque de plus en plus les téléchargements anonymes. Le symptôme : un import en erreur avec un message du type `login required`, `rate-limit` ou `empty media response`.

1. **Crée ou utilise un compte Instagram secondaire**, jamais ton compte principal : il y a un risque de restriction.
2. Connecte-toi avec ce compte dans Chrome ou Firefox.
3. Installe l'extension **« Get cookies.txt LOCALLY »** → sur instagram.com, exporte au format **Netscape**.
4. Enregistre le fichier sous `n8n/files/cookies.txt`. Le workflow l'utilise automatiquement s'il existe.
5. Dans l'app → **Réglages → Imports** → **Relancer** sur les imports en erreur.

> Les cookies expirent au bout de quelques semaines ou mois. Quand les erreurs reviennent, ré-exporte le fichier.

---

## Phase 6 : Recette complète de bout en bout (15 min)

Fais ce scénario en entier, comme un utilisateur :

1. PC **éteint**. Sur ton téléphone, partage 3 Reels : un avec voix, un avec seulement de la musique et la recette dans la légende, et un qui n'est **pas** une recette.
2. Le bot répond « Reçu » pour chacun.
3. Allume le PC et ouvre ta session sans rien lancer d'autre.
4. Dans les 5 à 10 min :
   - ✅ pour les 2 recettes ;
   - ❌ « Import impossible… pas de recette exploitable » pour le 3ᵉ (pas de nouvel essai : c'est un échec définitif).
5. Dans l'app, ouvre une recette importée, vérifie les quantités, corrige-en une et change la photo.
6. Génère une liste de courses avec les 2 recettes, ajoute des sacs poubelle depuis le catalogue, et fais les courses à deux.

---

## Phase 7 : Exploitation et maintenance

### Pannes fréquentes

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le bot ne répond pas | Webhook mal configuré | `getWebhookInfo` ; logs de l'Edge Function ; « Verify JWT » désactivé ? |
| « Ce chat n'est pas lié » | Lien non fait | Réglages → Lier Telegram |
| Imports bloqués « En attente » | PC éteint, Docker arrêté ou workflow inactif | Docker Desktop lancé ? Workflow actif ? `docker compose ps` |
| Erreur `login required` / `rate-limit` | Instagram bloque yt-dlp | Phase 5 (cookies), puis Relancer |
| Erreur yt-dlp après une mise à jour d'Instagram | yt-dlp pas à jour | `docker compose restart` (mise à jour auto au démarrage) |
| Erreur `401` vers OpenAI | Clé invalide ou crédit épuisé | Vérifier `.env` et le crédit, puis `docker compose up -d` |
| Erreur `model_not_found` | Modèle retiré | Changer `OPENAI_TEXT_MODEL` dans `.env` |
| Erreur `401` / `403` vers Supabase | Mauvaise clé | Clé **service_role legacy** (`eyJ…`) dans `.env` |
| L'app affiche « Configuration requise » | `config.js` pas rempli | Phase 2.1 |
| Connexion impossible après inscription | Confirmation d'e-mail active | Cliquer le lien reçu, ou désactiver « Confirm email » (1.3) |
| Projet Supabase « Paused » | Version gratuite : mise en pause après 7 jours sans activité | Dashboard → *Restore*. n8n le garde actif tant que le PC est allumé régulièrement |

### Commandes utiles (PowerShell, dans le dossier n8n)
```powershell
docker compose ps                 # état
docker compose logs -f            # logs en direct
docker compose restart            # redémarrer (et mettre à jour yt-dlp)
docker compose up -d --build      # après modification du Dockerfile
docker compose build --no-cache --pull; docker compose up -d   # mettre à jour n8n
```

### Sauvegardes
- **Recettes** : sur Supabase, en version gratuite, il n'y a pas de sauvegarde automatique téléchargeable. Fais une fois par mois *Table Editor → recipes → Export CSV*.
- **n8n** : le workflow est déjà dans ton dépôt Git. Si tu le modifies dans n8n, ré-exporte-le (*⋯ → Download*) dans `n8n/workflow-recettes.json`.

### Sécurité, ce qu'il faut retenir
- La clé `service_role` n'existe qu'à **deux** endroits : `n8n/.env` (sur ton PC, ignoré par Git) et les secrets Supabase (injectés automatiquement).
- La clé `anon` dans `config.js` est publique **par conception**. La RLS empêche quiconque de lire un espace dont il n'est pas membre.
- Les URL envoyées au bot sont normalisées par l'Edge Function, puis revalidées par n8n avant d'être passées à yt-dlp : pas d'injection de commande possible.
- n8n n'écoute que sur `127.0.0.1` : invisible depuis le réseau.
- Les photos sont dans un bucket public en lecture (URL impossibles à deviner). Pour des recettes de cuisine, ce compromis est acceptable.

---

## Pistes V2 (une fois que la V1 tourne depuis 2 à 3 semaines)

Priorise d'après **ton usage réel**, pas d'après l'envie :
1. **Planning de la semaine** (lundi → dimanche) qui alimente directement « Préparer ».
2. **Doublons intelligents** : « 2 oignons » + « 150 g d'oignon » → conversion en pièces.
3. **Lecture du texte à l'écran** des Reels muets (quelques images de la vidéo → modèle de vision).
4. **Partage d'une recette** par lien public en lecture seule.
5. **Mode cuisine** : écran toujours allumé, étapes en plein écran.
