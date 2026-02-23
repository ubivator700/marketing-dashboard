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

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/3] Starting services (nginx will use self-signed cert) ...${NC}"

docker compose up -d

# Wait for nginx to be ready
sleep 5

echo -e "${YELLOW}[2/3] Requesting Let's Encrypt certificate ...${NC}"

# Select staging or production server
if [ $STAGING != "0" ]; then
    STAGING_ARG="--staging"
    echo -e "${YELLOW}  (Using staging server — certificate will NOT be trusted)${NC}"
else
    STAGING_ARG=""
fi

# Certbot writes real certs over the self-signed ones in the same volume
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    --domain $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal

echo -e "${YELLOW}[3/3] Reloading Nginx with real certificate ...${NC}"

docker compose exec nginx nginx -s reload

echo ""
echo -e "${GREEN}=== Done! SSL certificate installed for $DOMAIN ===${NC}"
echo -e "${GREEN}    Your site is now available at https://$DOMAIN${NC}"
echo ""
echo -e "Certificate auto-renewal is handled by the certbot container."
echo -e "To manually renew: docker compose run --rm certbot renew"
