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

# Check if Heroku PostgreSQL add-on is already set up
echo -e "${YELLOW}📋 Checking Heroku configuration...${NC}"
if heroku config --app $APP_NAME | grep -q "DATABASE_URL"; then
    echo -e "${GREEN}✅ PostgreSQL database found${NC}"
else
    echo -e "${YELLOW}⚠️  No DATABASE_URL found. Add PostgreSQL add-on with:${NC}"
    echo "heroku addons:create heroku-postgresql:hobby-dev --app $APP_NAME"
fi

# Display current configuration
echo -e "${YELLOW}⚙️  Current Heroku configuration:${NC}"
heroku config --app $APP_NAME || true

# Instructions for setting environment variables
echo ""
echo -e "${BLUE}📝 Environment Variables:${NC}"
echo "Use the following commands to set required variables:"
echo ""
echo "heroku config:set DISCORD_TOKEN=your_token --app $APP_NAME"
echo "heroku config:set DISCORD_GUILD_ID=your_guild_id --app $APP_NAME"
echo "heroku config:set ADMIN_PASSWORD=your_password --app $APP_NAME"
echo "heroku config:set CREDENTIAL_ENCRYPTION_KEY=your_key --app $APP_NAME"
echo ""
echo -e "${YELLOW}Or set multiple at once:${NC}"
echo "heroku config:set DISCORD_TOKEN=token DISCORD_GUILD_ID=123 ADMIN_PASSWORD=pass --app $APP_NAME"
echo ""

# Verify required variables are set
echo -e "${YELLOW}🔍 Verifying required environment variables...${NC}"
REQUIRED_VARS=("DISCORD_TOKEN" "DISCORD_GUILD_ID" "ADMIN_PASSWORD" "CREDENTIAL_ENCRYPTION_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if heroku config --app $APP_NAME | grep -q "$var"; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${YELLOW}⚠️  $var is NOT set${NC}"
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️  Missing required variables: ${MISSING_VARS[*]}${NC}"
    read -p "Continue with deployment anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

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
