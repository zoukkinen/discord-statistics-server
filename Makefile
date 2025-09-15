.PHONY: help setup dev prod build clean logs shell backup deploy

# Platform detection
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)
WSL_DETECTED := $(shell if [ -f /proc/version ] && grep -qi microsoft /proc/version; then echo "true"; else echo "false"; fi)

# Compose files
COMPOSE_FILES := -f docker-compose.yml
ifeq ($(WSL_DETECTED),true)
	COMPOSE_FILES += -f docker-compose.wsl.yml
else ifeq ($(UNAME_M),arm64)
	COMPOSE_FILES += -f docker-compose.arm64.yml
endif

DOCKER_COMPOSE := docker-compose $(COMPOSE_FILES)

# Default help target
help: ## Show available commands
	@echo "🎮 Universal Discord Activity Tracker"
	@echo "====================================="
	@echo ""
	@echo "Setup:"
	@echo "  setup         Create .env file and validate"
	@echo "  quick-start   Complete setup and start development"
	@echo ""
	@echo "Development:"
	@echo "  dev           Start development environment"
	@echo "  logs          Show application logs"
	@echo "  shell         Open shell in bot container"
	@echo "  restart       Restart all services"
	@echo ""
	@echo "Production:"
	@echo "  prod          Start production with nginx"
	@echo "  build         Build Docker images"
	@echo "  deploy        Full production deployment"
	@echo ""
	@echo "Database:"
	@echo "  backup        Backup local database"
	@echo "  restore       Restore database (BACKUP_FILE=filename)"
	@echo "  sync-prod     Sync with production data"
	@echo ""
	@echo "Deployment:"
	@echo "  heroku-deploy Deploy to Heroku (APP_NAME=name)"
	@echo "  ssl-setup     Complete SSL setup (DOMAIN=domain EMAIL=email)"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean         Remove all containers and data"
	@echo "  update        Update and rebuild application"
	@echo ""
	@echo "Platform: $(UNAME_S)/$(UNAME_M) $(if $(filter true,$(WSL_DETECTED)),(WSL),)"

# === SETUP ===
setup: ## Create .env file from template
	@if [ -f .env ]; then echo "⚠️  .env already exists"; exit 1; fi
	@cp .env.example .env
	@echo "✅ .env file created from .env.example"
	@echo "📝 Please edit .env file with your Discord credentials"

validate-env: ## Validate environment configuration
	@echo "🔍 Validating environment..."
	@if [ ! -f .env ]; then echo "❌ .env file not found!"; exit 1; fi
	@grep -q "^DISCORD_TOKEN=" .env || (echo "❌ DISCORD_TOKEN not set"; exit 1)
	@grep -q "^DISCORD_GUILD_ID=" .env || (echo "❌ DISCORD_GUILD_ID not set"; exit 1)
	@if grep -q "your_discord_bot_token_here" .env; then echo "❌ Please set your actual Discord bot token"; exit 1; fi
	@if grep -q "your_discord_server_id_here" .env; then echo "❌ Please set your actual Discord server ID"; exit 1; fi
	@echo "✅ Environment configuration valid"

quick-start: setup validate-env dev ## Complete setup and start development

# === DEVELOPMENT ===
dev: validate-env ## Start development environment
	@echo "⚡ Starting development environment..."
	@$(DOCKER_COMPOSE) up -d

build: ## Build Docker images
	@echo "🔨 Building Docker images..."
	@$(DOCKER_COMPOSE) build

rebuild: ## Force rebuild from scratch
	@echo "🔨 Force rebuilding from scratch..."
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build --no-cache
	@$(DOCKER_COMPOSE) up -d
	@echo "✅ Application rebuilt and restarted"

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	@$(DOCKER_COMPOSE) restart

stop: ## Stop all services
	@echo "⬇️  Stopping services..."
	@$(DOCKER_COMPOSE) down

# === PRODUCTION ===
prod: validate-env ## Start production mode with nginx
	@echo "🚀 Starting production mode..."
	@NODE_ENV=production $(DOCKER_COMPOSE) --profile production up --build -d

deploy: validate-env build prod ## Full production deployment
	@echo "🎉 Production deployment complete!"
	@echo "🌐 Dashboard: http://localhost"

# === MONITORING ===
logs: ## Show application logs
	@$(DOCKER_COMPOSE) logs -f discord-bot

logs-all: ## Show logs from all services
	@$(DOCKER_COMPOSE) logs -f

status: ## Show service status
	@echo "📊 Service Status:"
	@$(DOCKER_COMPOSE) ps

health: ## Check application health
	@echo "🏥 Health Check:"
	@curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health || echo "❌ Health check failed"

# === DEVELOPMENT TOOLS ===
shell: ## Open shell in bot container
	@$(DOCKER_COMPOSE) exec discord-bot sh

shell-db: ## Open shell in database container
	@$(DOCKER_COMPOSE) exec postgres sh

# === DATABASE ===
backup: ## Backup local database
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec -T postgres pg_dump -U discord_bot -d discord_stats > backups/local_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

restore: ## Restore database from backup (BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "❌ Usage: make restore BACKUP_FILE=filename"; exit 1; fi
	@if [ ! -f "backups/$(BACKUP_FILE)" ]; then echo "❌ Backup file not found!"; exit 1; fi
	@echo "📥 Restoring database from $(BACKUP_FILE)..."
	@$(DOCKER_COMPOSE) stop discord-bot
	@$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d postgres -c "DROP DATABASE IF EXISTS discord_stats;"
	@$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d postgres -c "CREATE DATABASE discord_stats;"
	@$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d discord_stats < backups/$(BACKUP_FILE)
	@$(DOCKER_COMPOSE) start discord-bot
	@echo "✅ Database restored"

sync-prod: ## Sync with production data
	@if [ -z "$(HEROKU_APP)" ]; then HEROKU_APP="assembly-discord-tracker-2025"; fi; \
	echo "🚀 Syncing with production ($$HEROKU_APP)..."; \
	$(DOCKER_COMPOSE) stop discord-bot; \
	./scripts/heroku-backup.sh backup $$HEROKU_APP; \
	./scripts/heroku-backup.sh restore $$HEROKU_APP; \
	$(DOCKER_COMPOSE) up -d; \
	echo "✅ Synced with production!"

list-backups: ## List available backups
	@echo "📋 Available backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups found"

# === HEROKU DEPLOYMENT ===
heroku-deploy: ## Deploy to Heroku (APP_NAME=name)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Usage: make heroku-deploy APP_NAME=your-app-name"; exit 1; fi
	@echo "🚀 Deploying to Heroku..."
	@./scripts/deploy-heroku.sh $(APP_NAME)

heroku-logs: ## View Heroku logs (APP_NAME=name)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Usage: make heroku-logs APP_NAME=your-app-name"; exit 1; fi
	@heroku logs --tail --app $(APP_NAME)

heroku-status: ## Check Heroku status (APP_NAME=name)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Usage: make heroku-status APP_NAME=your-app-name"; exit 1; fi
	@echo "📊 Heroku Status:"
	@heroku ps --app $(APP_NAME)

# === SSL SETUP ===
ssl-setup: ## Complete SSL setup (DOMAIN=domain EMAIL=email)
	@if [ -z "$(DOMAIN)" ] || [ -z "$(EMAIL)" ]; then echo "❌ Usage: make ssl-setup DOMAIN=domain.com EMAIL=admin@domain.com"; exit 1; fi
	@echo "🔐 Setting up SSL for $(DOMAIN)..."
	@$(MAKE) configure-domain DOMAIN=$(DOMAIN)
	@$(MAKE) ssl-init DOMAIN=$(DOMAIN) EMAIL=$(EMAIL)
	@echo "✅ SSL setup complete for $(DOMAIN)"

configure-domain: ## Configure nginx for domain
	@$(DOCKER_COMPOSE) --profile production exec nginx sh -c "DOMAIN=$(DOMAIN) /scripts/configure-domain.sh $(DOMAIN)"
	@$(DOCKER_COMPOSE) --profile production restart nginx

ssl-init: ## Initialize SSL certificates
	@$(DOCKER_COMPOSE) --profile production run --rm certbot sh -c "DOMAINS=$(DOMAIN) EMAIL=$(EMAIL) /scripts/init-letsencrypt.sh"

ssl-renew: ## Renew SSL certificates
	@$(DOCKER_COMPOSE) --profile production exec certbot /scripts/renew-certs.sh

# === MAINTENANCE ===
clean: ## Remove all containers and data
	@echo "🧹 Cleaning up..."
	@read -p "This will remove ALL containers and data. Continue? (y/N): " confirm && [ "$$confirm" = "y" ]
	@$(DOCKER_COMPOSE) down -v --rmi all
	@docker system prune -af
	@echo "✅ Cleanup complete"

clean-soft: ## Remove containers only (keep data)
	@echo "🧹 Soft cleanup..."
	@$(DOCKER_COMPOSE) down

update: ## Update and rebuild application
	@echo "🔄 Updating application..."
	@git pull
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build --no-cache
	@$(DOCKER_COMPOSE) up -d
	@echo "✅ Application updated"
