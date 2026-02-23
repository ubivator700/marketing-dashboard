#!/bin/sh
# ============================================
# Nginx entrypoint: generate self-signed cert
# if Let's Encrypt certs don't exist yet.
# This allows nginx to start before running
# init-letsencrypt.sh
# ============================================

DOMAIN="lkmarketing.online"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "[nginx-entrypoint] No SSL certificate found for $DOMAIN"
    echo "[nginx-entrypoint] Generating self-signed certificate..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN" 2>/dev/null
    echo "[nginx-entrypoint] Self-signed certificate created. Run init-letsencrypt.sh to get a real one."
fi

exec nginx -g "daemon off;"
