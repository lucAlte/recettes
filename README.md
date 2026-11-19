# 🍳 Mes Recettes

Carnet de recettes partagé (couple / famille) + liste de courses, alimenté automatiquement par des Reels Instagram partagés à un bot Telegram.

```
📱 Instagram → Partager → 🤖 Bot Telegram
        → ☁️ Supabase Edge Function (toujours en ligne) → table import_queue
💻 PC allumé → Docker → n8n (toutes les 5 min)
        → yt-dlp (légende + audio) → OpenAI (transcription + mise en forme)
        → Supabase (recette + photo) → ✅ message Telegram
🌐 App web (GitHub Pages) : recettes, filtres, notes, liste de courses temps réel
```

| Dossier | Contenu |
|---|---|
| `docs/` | L'application web (servie par GitHub Pages) |
| `supabase/schema.sql` | Base de données, sécurité, fonctions |
| `supabase/functions/telegram-webhook/` | Webhook du bot Telegram |
| `n8n/` | n8n local (Docker) + workflow à importer |
| `GUIDE.md` | **Le pas-à-pas complet d'installation** |

👉 Commence par **[GUIDE.md](GUIDE.md)**.
