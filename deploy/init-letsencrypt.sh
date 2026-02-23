#!/bin/bash
# ============================================
# Marketing Dashboard — SSL Certificate Setup
# ============================================
# Usage:
#   chmod +x deploy/init-letsencrypt.sh
#   sudo ./deploy/init-letsencrypt.sh
# ============================================

set -e

# --- Configuration ---
DOMAIN="lkmarketing.online"
EMAIL="narodnielug@gmail.com"    # Let's Encrypt notifications
STAGING=0                          # Set to 1 for testing (avoids rate limits)

# --- Colors ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Marketing Dashboard — SSL Setup ===${NC}"
echo ""

# Check if domain is still placeholder
if [ "$DOMAIN" = "lkmarketing.online" ]; then
    echo -e "${RED}Error: Replace YOUR_DOMAIN.COM with your actual domain in this script${NC}"
    exit 1
fi

if [ "$EMAIL" = "YOUR_EMAIL@EXAMPLE.COM" ]; then
    echo -e "${RED}Error: Replace YOUR_EMAIL@EXAMPLE.COM with your actual email in this script${NC}"
    exit 1
fi

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] Creating dummy certificate for $DOMAIN ...${NC}"

# Create required directories
mkdir -p "./certbot/conf/live/$DOMAIN"

# Generate dummy certificate so Nginx can start
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo -e "${YELLOW}[2/5] Starting Nginx ...${NC}"

docker compose up -d nginx

echo -e "${YELLOW}[3/5] Removing dummy certificate ...${NC}"

docker compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo -e "${YELLOW}[4/5] Requesting Let's Encrypt certificate ...${NC}"

# Select staging or production server
if [ $STAGING != "0" ]; then
    STAGING_ARG="--staging"
    echo -e "${YELLOW}  (Using staging server — certificate will NOT be trusted)${NC}"
else
    STAGING_ARG=""
fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    --domain $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo -e "${YELLOW}[5/5] Reloading Nginx with real certificate ...${NC}"

docker compose exec nginx nginx -s reload

echo ""
echo -e "${GREEN}=== Done! SSL certificate installed for $DOMAIN ===${NC}"
echo -e "${GREEN}    Your site is now available at https://$DOMAIN${NC}"
echo ""
echo -e "Certificate auto-renewal is handled by the certbot container."
echo -e "To manually renew: docker compose run --rm certbot renew"
