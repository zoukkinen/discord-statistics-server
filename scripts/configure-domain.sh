#!/bin/bash

# Domain configuration script
# Updates nginx configuration with the actual domain name

set -e

domain="${1:-}"
if [ -z "$domain" ]; then
    echo "❌ Usage: $0 <domain>"
    echo "Example: $0 your-domain.com"
    exit 1
fi

echo "🔧 Configuring domain: $domain"

# Update nginx configuration
if [ -f "/etc/nginx/nginx.conf" ]; then
    # Replace DOMAIN_PLACEHOLDER with actual domain
    sed -i "s/DOMAIN_PLACEHOLDER/$domain/g" /etc/nginx/nginx.conf
    
    # Update server_name in HTTP block (for proper redirects)
    sed -i "s/server_name _;/server_name $domain;/g" /etc/nginx/nginx.conf
    
    echo "✅ Nginx configuration updated"
    echo "📝 Domain set to: $domain"
    
    # Test nginx configuration
    nginx -t
    if [ $? -eq 0 ]; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration test failed"
        exit 1
    fi
else
    echo "❌ Nginx configuration file not found"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Ensure DNS points $domain to this server"
echo "2. Run certificate setup: make ssl-init DOMAIN=$domain"
echo "3. Restart services: make restart"
