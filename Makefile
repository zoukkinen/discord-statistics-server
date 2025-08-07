.PHONY: help build up down logs restart status clean dev dev-build dev-logs dev-detached prod backup restore platform-info shell shell-root heroku-validate heroku-backup heroku-restore sync-production list-backups rebuild

# Detect platform for better compatibility
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# WSL detection
WSL_DETECTED := $(shell if [ -f /proc/version ] && grep -qi microsoft /proc/version; then echo "true"; else echo "false"; fi)

# Determine compose files based on platform
COMPOSE_FILES := -f docker-compose.yml

# Add platform-specific overrides (only for special cases)
ifeq ($(WSL_DETECTED),true)
	COMPOSE_FILES += -f docker-compose.wsl.yml
else ifeq ($(UNAME_M),arm64)
	COMPOSE_FILES += -f docker-compose.arm64.yml
endif
# Note: Linux AMD64 is the default - no override needed

# Docker compose command with platform files
DOCKER_COMPOSE := docker-compose $(COMPOSE_FILES)

# Default target
help: ## Show this help message
	@echo "Universal Discord Activity Tracker (Container-First)"
	@echo "=================================================="
	@echo ""
	@$(MAKE) platform-info
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

platform-info: ## Show platform information
	@echo "Platform Information:"
	@echo "  OS: $(UNAME_S)"
	@echo "  Architecture: $(UNAME_M)"
	@echo "  WSL Detected: $(WSL_DETECTED)"
	@echo "  Compose Files: $(COMPOSE_FILES)"
ifeq ($(WSL_DETECTED),true)
	@echo "  🐧 Running on Windows Subsystem for Linux"
else ifeq ($(UNAME_M),arm64)
	@echo "  🍎 ARM64 detected (Apple Silicon compatible)"
else
	@echo "  🐧 Standard Linux/AMD64 (using defaults)"
endif

# Development commands
dev: ## Start fast development environment with hot reload (no rebuild needed)
	@echo "⚡ Starting fast development environment with hot reload..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
	@if [ "$$(grep '^NODE_ENV=' .env | cut -d'=' -f2)" != "development" ]; then \
		echo "⚠️  Warning: NODE_ENV is not set to 'development' in .env file"; \
		echo "   Current value: $$(grep '^NODE_ENV=' .env | cut -d'=' -f2)"; \
		echo "   Fast development works best with NODE_ENV=development"; \
	fi
	$(DOCKER_COMPOSE) up -d

dev-build: ## Build and start development environment (first time only)
	@echo "🔨 Building development environment (first time)..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
	$(DOCKER_COMPOSE) up --build -d

dev-logs: ## Show logs from development environment
	@echo "📋 Showing development logs (Ctrl+C to exit)..."
	$(DOCKER_COMPOSE) logs -f discord-bot

# Production commands
prod: down ## Start in production mode (with nginx)
	@echo "🚀 Starting Assembly Discord Tracker in production mode..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
	NODE_ENV=production $(DOCKER_COMPOSE) --profile production up --build -d

# Basic Docker operations
build: ## Build the Docker image
	@echo "🔨 Building Discord tracker image..."
	$(DOCKER_COMPOSE) build

build-fast: ## Fast build with cache and single platform
	@echo "⚡ Fast building for current platform only..."
	$(DOCKER_COMPOSE) build --parallel

rebuild: ## Force rebuild from scratch (no cache) and restart
	@echo "🔨 Force rebuilding from scratch..."
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache --parallel
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Application rebuilt and restarted"

# Local Development (Container-First)
dev-detached: ## Start development environment in background (same as dev but silent)
	@echo "🐳 Starting development environment in background..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
	@if [ "$$(grep '^NODE_ENV=' .env | cut -d'=' -f2)" != "development" ]; then \
		echo "⚠️  Warning: NODE_ENV is not set to 'development' in .env file"; \
		echo "   Current value: $$(grep '^NODE_ENV=' .env | cut -d'=' -f2)"; \
		echo "   Fast development works best with NODE_ENV=development"; \
	fi
	$(DOCKER_COMPOSE) up -d

up: ## Start the services
	@echo "⬆️  Starting services..."
	$(DOCKER_COMPOSE) up -d

down: ## Stop and remove all services
	@echo "⬇️  Stopping services..."
	$(DOCKER_COMPOSE) down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	$(DOCKER_COMPOSE) restart

# Monitoring and logs
logs: ## Show logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-bot: ## Show logs from Discord bot only
	$(DOCKER_COMPOSE) logs -f discord-bot

logs-nginx: ## Show logs from nginx only (production mode)
	$(DOCKER_COMPOSE) logs -f nginx

status: ## Show status of all services
	@echo "📊 Service Status:"
	@echo "=================="
	$(DOCKER_COMPOSE) ps

health: ## Check health of the application
	@echo "🏥 Health Check:"
	@echo "==============="
ifeq ($(WSL_DETECTED),true)
	@curl -s http://localhost:3000/api/health 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/health 2>/dev/null || echo "❌ Health check failed - is the service running?"
else
	@curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health || echo "❌ Health check failed - is the service running?"
endif

# Maintenance commands
clean: ## Remove all containers, images, and volumes (DESTRUCTIVE!)
	@echo "🧹 Cleaning up Docker resources..."
	@read -p "This will remove ALL containers, images, and data. Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v --rmi all
	docker system prune -af

clean-soft: ## Remove containers and networks only (keeps data volume)
	@echo "🧹 Soft cleanup (keeping data)..."
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) rm -f

# Database operations
backup: ## Backup the local PostgreSQL database
	@echo "💾 Creating local database backup..."
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec -T postgres pg_dump -U discord_bot -d discord_stats > backups/local_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Local backup created in backups/ directory"

restore: ## Restore database from backup (specify BACKUP_FILE=filename)
	@echo "📥 Restoring database from backup..."
	@if [ -z "$(BACKUP_FILE)" ]; then echo "❌ Please specify BACKUP_FILE=filename"; exit 1; fi
	@if [ ! -f "backups/$(BACKUP_FILE)" ]; then echo "❌ Backup file not found!"; exit 1; fi
	@echo "⏹️  Stopping backend to release database connections..."
	$(DOCKER_COMPOSE) stop discord-bot
	@echo "🗑️  Preparing database for restore..."
	$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d postgres -c "DROP DATABASE IF EXISTS discord_stats;"
	$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d postgres -c "CREATE DATABASE discord_stats;"
	@echo "📥 Restoring from $(BACKUP_FILE)..."
	$(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d discord_stats < backups/$(BACKUP_FILE)
	@echo "🔄 Restarting backend..."
	$(DOCKER_COMPOSE) start discord-bot
	@echo "✅ Database restored from $(BACKUP_FILE)"

# Heroku Production Database Operations
heroku-backup: ## Download latest backup from Heroku production
	@echo "☁️  Getting latest backup from Heroku production..."
	@if [ -z "$(HEROKU_APP)" ]; then \
		echo "❌ Please specify HEROKU_APP=your-app-name or set it in .env"; \
		echo "💡 Example: make heroku-backup HEROKU_APP=assembly-discord-tracker-2025"; \
		exit 1; \
	fi
	@./scripts/heroku-backup.sh backup $(HEROKU_APP)

heroku-restore: ## Restore Heroku backup to local database
	@if [ -z "$(HEROKU_APP)" ]; then \
		echo "❌ Please specify HEROKU_APP=your-app-name"; \
		echo "💡 Example: make heroku-restore HEROKU_APP=assembly-discord-tracker-2025"; \
		exit 1; \
	fi; \
	@echo "🔄 Restoring Heroku backup to local development..."; \
	echo "🛑 Stopping backend service to release database connections..."; \
	$(DOCKER_COMPOSE) stop discord-bot || true; \
	./scripts/heroku-backup.sh restore $(HEROKU_APP)

sync-production: ## Download and restore latest production data (one command)
	@echo "🚀 Syncing local development with production data..."
	@if [ -z "$(HEROKU_APP)" ]; then \
		HEROKU_APP="assembly-discord-tracker-2025"; \
	fi; \
	echo "🔧 Using Heroku app: $$HEROKU_APP"; \
	echo "🛑 Step 1: Stopping backend service..."; \
	$(DOCKER_COMPOSE) stop discord-bot; \
	echo "☁️  Step 2: Downloading latest backup from production..."; \
	./scripts/heroku-backup.sh backup $$HEROKU_APP; \
	echo "🔄 Step 3: Restoring to local development..."; \
	./scripts/heroku-backup.sh restore $$HEROKU_APP; \
	echo "🚀 Step 4: Starting all development services..."; \
	$(DOCKER_COMPOSE) up -d; \
	echo "✅ Local development now synced with production data!"

list-backups: ## List available database backups
	@echo "📋 Available backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups found"

# Configuration helpers
setup: ## Setup environment file from example
	@if [ -f .env ]; then echo "⚠️  .env already exists"; exit 1; fi
	cp .env.example .env
	@echo "✅ .env file created from .env.example"
	@echo "📝 Please edit .env file with your Discord bot token and server ID"

validate-env: ## Validate environment configuration
	@echo "🔍 Validating environment configuration..."
	@if [ ! -f .env ]; then echo "❌ .env file not found!"; exit 1; fi
	@grep -q "^DISCORD_TOKEN=" .env || (echo "❌ DISCORD_TOKEN not set"; exit 1)
	@grep -q "^DISCORD_GUILD_ID=" .env || (echo "❌ DISCORD_GUILD_ID not set"; exit 1)
	@if grep -q "your_discord_bot_token_here" .env; then echo "❌ Please set your actual Discord bot token"; exit 1; fi
	@if grep -q "your_discord_server_id_here" .env; then echo "❌ Please set your actual Discord server ID"; exit 1; fi
	@echo "✅ Environment configuration looks good"

# Development helpers
shell: ## Open shell in the Discord bot container
	$(DOCKER_COMPOSE) exec discord-bot sh

shell-root: ## Open root shell in the Discord bot container
	$(DOCKER_COMPOSE) exec -u root discord-bot sh

shell-db: ## Open shell in the PostgreSQL container
	$(DOCKER_COMPOSE) exec postgres sh

shell-db-root: ## Open root shell in the PostgreSQL container
	$(DOCKER_COMPOSE) exec -u root postgres sh

update: ## Update and rebuild the application
	@echo "🔄 Updating application..."
	git pull
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Application updated and restarted"

# Quick start
quick-start: setup validate-env dev ## Complete setup and start in development mode

# Production deployment
deploy: validate-env build prod ## Deploy to production
	@echo "🎉 Discord Activity Tracker deployed successfully!"
	@echo "🌐 Dashboard available at: http://localhost"
	@echo "📊 Health check: make health"

# SSL/Certificate management
ssl-init: ## Initialize SSL certificates (requires DOMAIN and EMAIL environment variables)
	@echo "🔐 Initializing SSL certificates..."
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	@if [ -z "$(EMAIL)" ]; then echo "❌ Please specify EMAIL=your-email@example.com"; exit 1; fi
	@echo "Domain: $(DOMAIN)"
	@echo "Email: $(EMAIL)"
	@echo "Staging: $(STAGING)"
	$(DOCKER_COMPOSE) --profile production run --rm certbot sh -c "DOMAINS=$(DOMAIN) EMAIL=$(EMAIL) STAGING=$(STAGING) /scripts/init-letsencrypt.sh"

ssl-renew: ## Manually renew SSL certificates
	@echo "🔄 Renewing SSL certificates..."
	$(DOCKER_COMPOSE) --profile production exec certbot /scripts/renew-certs.sh

ssl-status: ## Check SSL certificate status
	@echo "📋 SSL Certificate Status:"
	$(DOCKER_COMPOSE) --profile production exec certbot certbot certificates

ssl-test: ## Test SSL certificate renewal (dry run)
	@echo "🧪 Testing SSL certificate renewal..."
	$(DOCKER_COMPOSE) --profile production exec certbot certbot renew --dry-run

configure-domain: ## Configure nginx for specific domain (requires DOMAIN)
	@echo "🔧 Configuring domain..."
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	$(DOCKER_COMPOSE) --profile production exec nginx sh -c "DOMAIN=$(DOMAIN) /scripts/configure-domain.sh $(DOMAIN)"
	$(DOCKER_COMPOSE) --profile production restart nginx

ssl-setup-complete: ## Complete SSL setup process (requires DOMAIN and EMAIL)
	@echo "🚀 Complete SSL Setup Process"
	@echo "=============================="
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	@if [ -z "$(EMAIL)" ]; then echo "❌ Please specify EMAIL=your-email@example.com"; exit 1; fi
	$(MAKE) configure-domain DOMAIN=$(DOMAIN)
	$(MAKE) ssl-init DOMAIN=$(DOMAIN) EMAIL=$(EMAIL) STAGING=$(STAGING)
	@echo ""
	@echo "🎉 SSL setup complete!"
	@echo "📝 Next steps:"
	@echo "   1. Test your site: https://$(DOMAIN)"
	@echo "   2. Enable HTTPS redirect in nginx.conf"
	@echo "   3. Check certificate status: make ssl-status"

# SSL helper commands
ssl-remove: ## Remove all SSL certificates (DANGER: destructive operation)
	@echo "⚠️  WARNING: This will remove ALL SSL certificates!"
	@read -p "Are you sure? (yes/no): " confirm; [ "$$confirm" = "yes" ] || exit 1
	$(DOCKER_COMPOSE) --profile production exec certbot rm -rf /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal
	@echo "🗑️  SSL certificates removed"

ssl-logs: ## Show certbot logs
	@echo "📋 Certbot logs:"
	$(DOCKER_COMPOSE) --profile production logs certbot

# Heroku deployment commands
heroku-validate: ## Validate that the app builds correctly for Heroku
	@echo "🔍 Validating Heroku deployment readiness..."
	@echo "📦 Testing Docker build process..."
	$(DOCKER_COMPOSE) build
	@echo "✅ Docker build successful!"
	@echo "📋 Checking container functionality..."
	@$(DOCKER_COMPOSE) up -d
	@sleep 10
	@curl -f http://localhost:3000/api/health >/dev/null 2>&1 && echo "✅ Health check passed" || echo "❌ Health check failed"
	@$(DOCKER_COMPOSE) down
	@echo "🎉 Ready for Heroku deployment!"

heroku-deploy: ## Deploy to Heroku (requires APP_NAME parameter)
	@echo "🚀 Deploying to Heroku..."
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	./scripts/deploy-heroku.sh $(APP_NAME)

heroku-logs: ## View Heroku logs (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	heroku logs --tail --app $(APP_NAME)

heroku-status: ## Check Heroku app status (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	@echo "📊 Heroku App Status:"
	heroku ps --app $(APP_NAME)
	@echo ""
	@echo "🔧 Config Variables:"
	heroku config --app $(APP_NAME)

heroku-restart: ## Restart Heroku app (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	@echo "🔄 Restarting Heroku app..."
	heroku restart --app $(APP_NAME)

heroku-open: ## Open Heroku app in browser (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	heroku open --app $(APP_NAME)

heroku-setup: ## Setup GitHub Actions secrets for Heroku deployment
	@echo "⚙️  Heroku Setup Guide"
	@echo "===================="
	@echo ""
	@echo "1. Create Heroku app:"
	@echo "   heroku create your-app-name --region eu"
	@echo ""
	@echo "2. Get API key:"
	@echo "   heroku auth:token"
	@echo ""
	@echo "3. Add GitHub secrets:"
	@echo "   - HEROKU_API_KEY (from step 2)"
	@echo "   - HEROKU_APP_NAME (your app name)"
	@echo "   - HEROKU_EMAIL (your Heroku email)"
	@echo ""
	@echo "4. Push to main branch to trigger deployment"
	@echo ""
	@echo "📖 Full guide: docs/HEROKU_DEPLOY.md"

heroku-health: ## Check Heroku app health (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	@echo "🏥 Checking app health..."
	@curl -f https://$(APP_NAME).herokuapp.com/api/health && echo "✅ App is healthy!" || echo "❌ Health check failed"

# Custom domain management
domain-add: ## Add custom domain to Heroku app (requires APP_NAME and DOMAIN parameters)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	@echo "🌐 Adding custom domain $(DOMAIN) to $(APP_NAME)..."
	heroku domains:add $(DOMAIN) --app $(APP_NAME)
	@echo "🔐 Enabling automatic SSL..."
	heroku certs:auto:enable --app $(APP_NAME)

domain-status: ## Check custom domain and SSL status (requires APP_NAME parameter)
	@if [ -z "$(APP_NAME)" ]; then echo "❌ Please specify APP_NAME=your-app-name"; exit 1; fi
	@echo "🌐 Domain configuration:"
	heroku domains --app $(APP_NAME)
	@echo ""
	@echo "🔐 SSL certificate status:"
	heroku certs:auto --app $(APP_NAME)

domain-test: ## Test custom domain connectivity (requires DOMAIN parameter)
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	@echo "🔍 Testing DNS resolution for $(DOMAIN)..."
	@nslookup $(DOMAIN) || echo "⚠️  DNS not yet propagated"
	@echo ""
	@echo "🌐 Testing HTTP connectivity..."
	@curl -I http://$(DOMAIN) || echo "⚠️  HTTP not yet available"
	@echo ""
	@echo "🔐 Testing HTTPS connectivity..."
	@curl -I https://$(DOMAIN) || echo "⚠️  HTTPS not yet available"

domain-health: ## Check health endpoint on custom domain (requires DOMAIN parameter)
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	@echo "🏥 Testing health endpoint at https://$(DOMAIN)/api/health..."
	@curl -f https://$(DOMAIN)/api/health && echo "✅ Custom domain is healthy!" || echo "❌ Custom domain health check failed"
