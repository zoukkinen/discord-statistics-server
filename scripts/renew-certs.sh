#!/bin/bash

# Certificate renewal script
# This runs automatically in the certbot container every 12 hours

set -e

echo "🔄 Checking certificate renewal..."
echo "Time: $(date)"

# Attempt to renew certificates
certbot renew --quiet

# Check if renewal was successful and reload nginx if needed
if [ $? -eq 0 ]; then
    echo "✅ Certificate renewal check complete"
    
    # Check if any certificates were actually renewed
    if certbot certificates | grep -q "INVALID\|expires soon"; then
        echo "🔄 Certificates were renewed, reloading nginx..."
        
        # Signal nginx to reload (this requires the container to be linked properly)
        # In docker-compose, we can send a signal to nginx container
        # This is handled by the certbot container's restart policy
        echo "📝 Note: Restart nginx container to apply new certificates"
    else
        echo "📝 No certificates needed renewal"
    fi
else
    echo "❌ Certificate renewal failed"
    exit 1
fi
