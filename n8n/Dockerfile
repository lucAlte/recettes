# n8n + yt-dlp + ffmpeg, image maîtrisée (Debian) indépendante des changements de l'image officielle
FROM node:22-bookworm-slim

ARG N8N_VERSION=latest

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates curl tini \
 && rm -rf /var/lib/apt/lists/*

# yt-dlp (version Python, mise à jour automatique au démarrage du conteneur)
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && chown node:node /usr/local/bin/yt-dlp

RUN npm install -g --no-audit --no-fund n8n@${N8N_VERSION} \
 && npm cache clean --force

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh \
 && chmod +x /entrypoint.sh \
 && mkdir -p /files/tmp \
 && chown -R node:node /files

USER node
WORKDIR /home/node
EXPOSE 5678
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
