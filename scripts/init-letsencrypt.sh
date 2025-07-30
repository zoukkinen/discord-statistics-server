#!/bin/bash

# Initial setup script for Let's Encrypt certificates
# This script should be run once to obtain the first certificates

set -e

# Configuration
domains="${DOMAINS:-example.com}"
email="${EMAIL:-admin@example.com}"
staging="${STAGING:-1}"  # Set to 0 for production certificates

echo "🔐 Assembly Discord Tracker - SSL Certificate Setup"
echo "=================================================="
echo "Domain(s): $domains"
echo "Email: $email"
echo "Staging mode: $staging"
echo ""

# Check if certificates already exist
for domain in $(echo $domains | tr "," " "); do
    if [ -d "/etc/letsencrypt/live/$domain" ]; then
        echo "⚠️  Certificate for $domain already exists. Skipping..."
        continue
    fi

    echo "🚀 Obtaining certificate for $domain..."
    
    # Select appropriate server URL
    if [ $staging != "0" ]; then
        server_arg="--staging"
        echo "📝 Using Let's Encrypt staging server (test certificates)"
    else
        server_arg=""
        echo "📝 Using Let's Encrypt production server"
    fi

    # Obtain certificate
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $email \
        --agree-tos \
        --no-eff-email \
        $server_arg \
        -d $domain

    if [ $? -eq 0 ]; then
        echo "✅ Certificate obtained successfully for $domain"
    else
        echo "❌ Failed to obtain certificate for $domain"
        exit 1
    fi
done

echo ""
echo "🎉 Certificate setup complete!"
echo ""
echo "Next steps:"
echo "1. Update nginx.conf to use your domain name"
echo "2. Restart nginx: docker-compose restart nginx"
echo "3. Enable HTTPS redirect in nginx.conf"
echo ""
echo "To switch to production certificates:"
echo "1. Set STAGING=0 in your environment"
echo "2. Delete existing certificates: docker-compose exec certbot rm -rf /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal"
echo "3. Run this script again"
