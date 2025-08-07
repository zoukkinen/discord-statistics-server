#!/bin/bash

# Heroku PostgreSQL backup script for Assembly Discord Tracker
# This script helps backup and restore data from Heroku PostgreSQL to local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Platform detection (same as Makefile)
UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

# WSL detection
WSL_DETECTED="false"
if [ -f /proc/version ] && grep -qi microsoft /proc/version; then
    WSL_DETECTED="true"
fi

# Determine compose files based on platform (same logic as Makefile)
COMPOSE_FILES="-f docker-compose.yml"

if [ "$WSL_DETECTED" = "true" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.wsl.yml"
elif [ "$UNAME_M" = "arm64" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.arm64.yml"
fi

# Docker compose command with platform files (same as Makefile)
DOCKER_COMPOSE="docker-compose $COMPOSE_FILES"

echo -e "${BLUE}💾 Assembly Discord Tracker - Heroku PostgreSQL Backup${NC}"
echo "======================================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}❌ Heroku CLI is not installed!${NC}"
    echo "Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Heroku${NC}"
    echo "Please login first:"
    heroku auth:login
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [APP_NAME]"
    echo ""
    echo "Commands:"
    echo "  backup     Create a backup from Heroku PostgreSQL"
    echo "  restore    Restore backup to local PostgreSQL (for development)"
    echo "  list       List available Heroku apps"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup assembly-discord-tracker-prod"
    echo "  $0 restore assembly-discord-tracker-prod"
    echo "  $0 list"
}

# Function to list Heroku apps
list_apps() {
    echo -e "${BLUE}📱 Your Heroku apps:${NC}"
    heroku apps --json | jq -r '.[] | "\(.name) - \(.web_url)"' 2>/dev/null || heroku apps
}

# Function to create backup
create_backup() {
    local APP_NAME="$1"
    
    if [ -z "$APP_NAME" ]; then
        echo -e "${RED}❌ Please specify the Heroku app name${NC}"
        echo "Usage: $0 backup <app-name>"
        list_apps
        exit 1
    fi
    
    # Check if app exists
    if ! heroku apps:info $APP_NAME &> /dev/null; then
        echo -e "${RED}❌ App '$APP_NAME' not found!${NC}"
        list_apps
        exit 1
    fi
    
    # Check if app has PostgreSQL addon
    echo -e "${YELLOW}🔍 Checking PostgreSQL addon...${NC}"
    if ! heroku addons --app $APP_NAME | grep -q postgres; then
        echo -e "${RED}❌ No PostgreSQL addon found for app '$APP_NAME'!${NC}"
        echo "Available addons:"
        heroku addons --app $APP_NAME
        exit 1
    fi
    
    # Create backups directory
    mkdir -p backups
    
    # Generate backup filename with timestamp
    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/heroku_${APP_NAME}_${BACKUP_DATE}.sql"
    
    echo -e "${YELLOW}💾 Creating PostgreSQL backup from Heroku...${NC}"
    echo "App: $APP_NAME"
    echo "File: $BACKUP_FILE"
    
    # Create Heroku PostgreSQL backup and download
    echo -e "${BLUE}📥 Downloading PostgreSQL dump...${NC}"
    heroku pg:backups:capture --app $APP_NAME
    heroku pg:backups:download --app $APP_NAME --output "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Backup created successfully!${NC}"
        echo "File: $BACKUP_FILE"
        echo "Size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        exit 1
    fi
}

# Function to restore PostgreSQL backup to local PostgreSQL database
restore_to_postgres() {
    local APP_NAME="$1"
    
    if [ -z "$APP_NAME" ]; then
        echo -e "${RED}❌ Please specify the Heroku app name to find backup${NC}"
        echo "Usage: $0 restore <app-name>"
        exit 1
    fi
    
    # Find the latest backup file for the app
    LATEST_BACKUP=$(ls -t backups/heroku_${APP_NAME}_*.sql 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No backup found for app '$APP_NAME'!${NC}"
        echo "Available backups:"
        ls -la backups/ 2>/dev/null || echo "No backups directory found"
        echo ""
        echo "Run: $0 backup $APP_NAME"
        exit 1
    fi
    
    echo -e "${BLUE}🔄 Restoring PostgreSQL backup to local development...${NC}"
    echo "Source: $LATEST_BACKUP"
    
    # Check if development containers are running
    if ! $DOCKER_COMPOSE ps postgres | grep -q "Up"; then
        echo -e "${YELLOW}⚠️  PostgreSQL container not running. Starting development environment...${NC}"
        $DOCKER_COMPOSE up -d postgres
        
        # Wait for PostgreSQL to be ready
        echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
        timeout=60
        while [ $timeout -gt 0 ]; do
            if $DOCKER_COMPOSE exec -T postgres pg_isready -U discord_bot -d discord_stats >/dev/null 2>&1; then
                break
            fi
            sleep 2
            timeout=$((timeout - 2))
        done
        
        if [ $timeout -le 0 ]; then
            echo -e "${RED}❌ PostgreSQL failed to start within 60 seconds${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
    fi
    
    # Create a backup of current data before restore
    echo -e "${YELLOW}� Creating backup of current local data...${NC}"
    LOCAL_BACKUP="backups/local_backup_$(date +%Y%m%d_%H%M%S).sql"
    $DOCKER_COMPOSE exec -T postgres pg_dump -U discord_bot -d discord_stats > "$LOCAL_BACKUP"
    echo -e "${GREEN}✅ Local backup created: $LOCAL_BACKUP${NC}"
    
    # Drop and recreate the database to ensure clean restore
    echo -e "${BLUE}🗑️  Preparing database for restore...${NC}"
    $DOCKER_COMPOSE exec -T postgres psql -U discord_bot -d postgres -c "DROP DATABASE IF EXISTS discord_stats;"
    $DOCKER_COMPOSE exec -T postgres psql -U discord_bot -d postgres -c "CREATE DATABASE discord_stats;"
    
    # Restore the Heroku backup
    echo -e "${BLUE}📥 Restoring Heroku backup...${NC}"
    
    # Stop the backend to release database connections
    echo -e "${YELLOW}⏹️  Stopping backend to release database connections...${NC}"
    $DOCKER_COMPOSE stop discord-bot 2>/dev/null || true
    
    # Copy backup into container and restore
    docker cp "$LATEST_BACKUP" assembly-postgres:/tmp/backup.sql
    docker exec assembly-postgres pg_restore -U discord_bot -d discord_stats --verbose --clean --no-acl --no-owner /tmp/backup.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Heroku backup restored successfully!${NC}"
        
        # Restart the backend to connect to the restored database
        echo -e "${BLUE}🔄 Restarting backend service...${NC}"
        $DOCKER_COMPOSE start discord-bot
        
        echo -e "${GREEN}🎉 Restore complete!${NC}"
        echo ""
        echo -e "${YELLOW}📋 What's next:${NC}"
        echo "• Your local development now has the production data from Heroku"
        echo "• Backend service has been restarted to connect to the restored database"
        echo "• Visit http://localhost:3000 to see the restored data"
        echo "• Local backup saved to: $LOCAL_BACKUP"
    else
        echo -e "${RED}❌ Restore failed!${NC}"
        echo "Restoring local backup..."
        $DOCKER_COMPOSE exec -T postgres psql -U discord_bot -d postgres -c "DROP DATABASE IF EXISTS discord_stats;"
        $DOCKER_COMPOSE exec -T postgres psql -U discord_bot -d postgres -c "CREATE DATABASE discord_stats;"
        $DOCKER_COMPOSE exec -T postgres psql -U discord_bot -d discord_stats < "$LOCAL_BACKUP"
        echo -e "${YELLOW}⚠️  Local backup restored${NC}"
        # Restart backend even if restore failed
        $DOCKER_COMPOSE start discord-bot
        exit 1
    fi
}

# Main script logic
case "${1:-help}" in
    "backup")
        create_backup "$2"
        ;;
    "restore")
        restore_to_postgres "$2"
        ;;
    "list")
        list_apps
        ;;
    "help"|*)
        show_usage
        ;;
esac
