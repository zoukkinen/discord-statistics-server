#!/bin/bash

# Heroku deployment script for Assembly Discord Tracker
# This script helps set up and deploy the application to Heroku

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Assembly Discord Tracker - Heroku Deployment${NC}"
echo "=============================================="

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
fi

# Get app name from user or use default
APP_NAME="${1:-assembly-discord-tracker-$(date +%s)}"
echo -e "${BLUE}📱 App name: ${APP_NAME}${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with your Discord credentials"
    exit 1
fi

# Create Heroku app
echo -e "${YELLOW}🏗️  Creating Heroku app...${NC}"
if heroku apps:info $APP_NAME &> /dev/null; then
    echo -e "${YELLOW}⚠️  App $APP_NAME already exists${NC}"
else
    heroku create $APP_NAME --region eu
    echo -e "${GREEN}✅ Created Heroku app: $APP_NAME (EU region)${NC}"
fi

# Set stack to container for Docker deployment
echo -e "${YELLOW}🐳 Setting stack to container...${NC}"
heroku stack:set container --app $APP_NAME

# Set environment variables from .env file
echo -e "${YELLOW}⚙️  Setting environment variables...${NC}"

# Read .env file and set variables (excluding comments and empty lines)
while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    
    # Extract key=value pairs
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Skip commented out variables
        if [[ $key =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Remove quotes if present
        value=$(echo "$value" | sed 's/^"//; s/"$//')
        
        # Set the environment variable
        echo "Setting $key..."
        heroku config:set "$key=$value" --app $APP_NAME
    fi
done < .env

# Set Heroku-specific environment variables
echo -e "${YELLOW}🌐 Setting Heroku-specific variables...${NC}"
heroku config:set PORT=\$PORT --app $APP_NAME
heroku config:set NODE_ENV=production --app $APP_NAME
heroku config:set DATABASE_PATH=/app/data/discord_stats.db --app $APP_NAME

# Add buildpacks if using regular deployment (not container)
# heroku buildpacks:add heroku/nodejs --app $APP_NAME

# Set up git remote
echo -e "${YELLOW}📡 Setting up git remote...${NC}"
if git remote | grep -q heroku; then
    git remote remove heroku
fi
heroku git:remote --app $APP_NAME

# Deploy to Heroku
echo -e "${YELLOW}🚀 Deploying to Heroku...${NC}"
git add .
git commit -m "Deploy to Heroku: Assembly Discord Tracker" --allow-empty
git push heroku main

# Wait for deployment
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
sleep 30

# Check deployment status
echo -e "${YELLOW}🏥 Checking application health...${NC}"
APP_URL="https://$APP_NAME.herokuapp.com"

if curl -f "$APP_URL/api/health" &> /dev/null; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Application URL: $APP_URL${NC}"
    echo -e "${GREEN}📊 Dashboard: $APP_URL${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Checking logs..."
    heroku logs --tail --app $APP_NAME
fi

# Display useful commands
echo ""
echo -e "${BLUE}📋 Useful Heroku commands:${NC}"
echo "heroku logs --tail --app $APP_NAME        # View logs"
echo "heroku restart --app $APP_NAME            # Restart app"
echo "heroku config --app $APP_NAME             # View config vars"
echo "heroku ps --app $APP_NAME                 # View running processes"
echo "heroku releases --app $APP_NAME           # View deployment history"

# Open the app in browser
read -p "🌐 Open app in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    heroku open --app $APP_NAME
fi

echo -e "${GREEN}🎉 Assembly Discord Tracker deployment complete!${NC}"
