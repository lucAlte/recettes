#!/bin/sh
# Instagram change souvent : on met yt-dlp à jour à chaque démarrage du PC
echo "[recettes] Mise à jour de yt-dlp..."
yt-dlp -U >/dev/null 2>&1 || echo "[recettes] yt-dlp : mise à jour impossible (on continue)"
mkdir -p /files/tmp 2>/dev/null || true
exec n8n start
