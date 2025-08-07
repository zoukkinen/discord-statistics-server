.PHONY: help build up down logs restart status clean dev prod backup restore platform-info dev-hot dev-detached stop-dev shell shell-root shell-dev shell-dev-root heroku-validate heroku-backup heroku-restore sync-production list-backups

# Detect platform for better compatibility
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# WSL detection
WSL_DETECTED := $(shell if [ -f /proc/version ] && grep -qi microsoft /proc/version; then echo "true"; else echo "false"; fi)

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
ifeq ($(WSL_DETECTED),true)
	@echo "  🐧 Running on Windows Subsystem for Linux"
endif
ifeq ($(UNAME_M),arm64)
	@echo "  🍎 ARM64 detected (Apple Silicon compatible)"
endif

# Development commands
dev: ## Start in development mode (without nginx)
	@echo "🚀 Starting Assembly Discord Tracker in development mode..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
ifeq ($(WSL_DETECTED),true)
	@echo "🐧 WSL detected - using optimized settings..."
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose up --build
else
	docker-compose up --build
endif

# Production commands
prod: ## Start in production mode (with nginx)
	@echo "🚀 Starting Assembly Discord Tracker in production mode..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
ifeq ($(WSL_DETECTED),true)
	@echo "🐧 WSL detected - using optimized settings..."
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose --profile production up --build -d
else
	docker-compose --profile production up --build -d
endif

# Basic Docker operations
build: ## Build the Docker image
	@echo "🔨 Building Discord tracker image..."
ifeq ($(UNAME_M),arm64)
	@echo "🍎 Building for ARM64 (Apple Silicon)..."
	DOCKER_BUILDKIT=1 docker-compose build
else ifeq ($(WSL_DETECTED),true)
	@echo "🐧 Building for WSL (AMD64)..."
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
else
	DOCKER_BUILDKIT=1 docker-compose build
endif

build-fast: ## Fast build with cache and single platform
	@echo "⚡ Fast building for current platform only..."
	DOCKER_BUILDKIT=1 docker-compose build --parallel

build-multiplatform: ## Build for multiple platforms (ARM64, AMD64)
	@echo "🔨 Building multi-platform images..."
	docker buildx create --use --name multiplatform-builder || true
	docker buildx build --platform linux/amd64,linux/arm64 -t assembly-discord-tracker --load .

# Local Development (Container-First)
dev-hot: ## Start development environment with hot reload
	@echo "🐳 Starting development environment with hot reload..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
ifeq ($(WSL_DETECTED),true)
	@echo "🐧 WSL detected - using optimized settings..."
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.dev.yml up --build
else
	docker-compose -f docker-compose.dev.yml up --build
endif

dev-detached: ## Start development environment in background
	@echo "🐳 Starting development environment in background..."
	@if [ ! -f .env ]; then echo "❌ .env file not found! Copy .env.example and configure it."; exit 1; fi
ifeq ($(WSL_DETECTED),true)
	@echo "🐧 WSL detected - using optimized settings..."
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.dev.yml up --build -d
else
	docker-compose -f docker-compose.dev.yml up --build -d
endif

stop-dev: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down

# WSL specific commands
wsl-setup: ## Setup Docker for WSL (Windows users)
	@echo "🐧 Setting up Docker for WSL..."
	@echo "Enabling BuildKit and optimizations for WSL..."
	@echo 'export COMPOSE_DOCKER_CLI_BUILD=1' >> ~/.bashrc
	@echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
	@echo "Please restart your WSL session or run: source ~/.bashrc"

up: ## Start the services
	@echo "⬆️  Starting services..."
	docker-compose up -d

down: ## Stop and remove all services
	@echo "⬇️  Stopping services..."
	docker-compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	docker-compose restart

# Monitoring and logs
logs: ## Show logs from all services
	docker-compose logs -f

logs-bot: ## Show logs from Discord bot only
	docker-compose logs -f discord-bot

logs-nginx: ## Show logs from nginx only (production mode)
	docker-compose logs -f nginx

# Development monitoring
logs-dev: ## Show logs from development services
	docker-compose -f docker-compose.dev.yml logs -f

logs-dev-backend: ## Show logs from development backend only
	docker-compose -f docker-compose.dev.yml logs -f discord-bot-dev

logs-dev-frontend: ## Show logs from development frontend only
	docker-compose -f docker-compose.dev.yml logs -f frontend-dev

status-dev: ## Show status of development services
	@echo "📊 Development Service Status:"
	@echo "=============================="
	docker-compose -f docker-compose.dev.yml ps

status: ## Show status of all services
	@echo "📊 Service Status:"
	@echo "=================="
	docker-compose ps

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
	docker-compose down -v --rmi all
	docker system prune -af

clean-soft: ## Remove containers and networks only (keeps data volume)
	@echo "🧹 Soft cleanup (keeping data)..."
	docker-compose down
	docker-compose rm -f

# Database operations
backup: ## Backup the local PostgreSQL database
	@echo "💾 Creating local database backup..."
	@mkdir -p backups
	@docker-compose -f docker-compose.dev.yml exec -T postgres-dev pg_dump -U discord_bot -d discord_stats > backups/local_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Local backup created in backups/ directory"

restore: ## Restore database from backup (specify BACKUP_FILE=filename)
	@echo "📥 Restoring database from backup..."
	@if [ -z "$(BACKUP_FILE)" ]; then echo "❌ Please specify BACKUP_FILE=filename"; exit 1; fi
	@if [ ! -f "backups/$(BACKUP_FILE)" ]; then echo "❌ Backup file not found!"; exit 1; fi
	@echo "⏹️  Stopping backend to release database connections..."
	@docker-compose -f docker-compose.dev.yml stop discord-bot-dev
	@echo "🗑️  Preparing database for restore..."
	@docker-compose -f docker-compose.dev.yml exec -T postgres-dev psql -U discord_bot -d postgres -c "DROP DATABASE IF EXISTS discord_stats;"
	@docker-compose -f docker-compose.dev.yml exec -T postgres-dev psql -U discord_bot -d postgres -c "CREATE DATABASE discord_stats;"
	@echo "📥 Restoring from $(BACKUP_FILE)..."
	@docker-compose -f docker-compose.dev.yml exec -T postgres-dev psql -U discord_bot -d discord_stats < backups/$(BACKUP_FILE)
	@echo "🔄 Restarting backend..."
	@docker-compose -f docker-compose.dev.yml start discord-bot-dev
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
	docker-compose -f docker-compose.dev.yml stop discord-bot-dev || true; \
	./scripts/heroku-backup.sh restore $(HEROKU_APP)

sync-production: ## Download and restore latest production data (one command)
	@echo "🚀 Syncing local development with production data..."
	@if [ -z "$(HEROKU_APP)" ]; then \
		HEROKU_APP="assembly-discord-tracker-2025"; \
	fi; \
	echo "🔧 Using Heroku app: $$HEROKU_APP"; \
	echo "🛑 Step 1: Stopping backend service..."; \
	docker-compose -f docker-compose.dev.yml stop discord-bot-dev; \
	echo "☁️  Step 2: Downloading latest backup from production..."; \
	./scripts/heroku-backup.sh backup $$HEROKU_APP; \
	echo "🔄 Step 3: Restoring to local development..."; \
	./scripts/heroku-backup.sh restore $$HEROKU_APP; \
	echo "🚀 Step 4: Starting all development services..."; \
	docker-compose -f docker-compose.dev.yml up -d; \
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
	docker-compose exec discord-tracker sh

shell-root: ## Open root shell in the Discord bot container
	docker-compose exec -u root discord-tracker sh

shell-dev: ## Open shell in the development bot container
	docker-compose -f docker-compose.dev.yml exec discord-bot-dev sh

shell-dev-root: ## Open root shell in the development bot container
	docker-compose -f docker-compose.dev.yml exec -u root discord-bot-dev sh

update: ## Update and rebuild the application
	@echo "🔄 Updating application..."
	git pull
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Application updated and restarted"

# Quick start
quick-start: setup validate-env dev ## Complete setup and start in development mode

dev-info: ## Show development workflow information
	@echo "🛠️  Development Workflow (Container-First):"
	@echo ""
	@echo "📦 Development Commands:"
	@echo "  make quick-start          # Complete setup and start"
	@echo "  make dev                  # Start standard development"
	@echo "  make dev-hot              # Start development with hot reload"
	@echo "  make dev-detached         # Start development in background"
	@echo "  make logs                 # View logs"
	@echo "  make logs-dev             # View development container logs"
	@echo ""
	@echo "🔨 Building and Deployment:"
	@echo "  make build                # Build images"
	@echo "  make build-multiplatform  # Build for multiple architectures"
	@echo "  make prod                 # Start in production mode (with nginx)"
	@echo ""
	@echo "💾 Database Operations:"
	@echo "  make backup               # Backup local PostgreSQL database"
	@echo "  make restore              # Restore from backup"
	@echo "  make sync-production      # Sync with Heroku production data"
	@echo ""
	@echo "🚀 Production Deployment:"
	@echo "  make heroku-validate      # Test if ready for Heroku deployment"
	@echo "  make heroku-deploy APP_NAME=your-app  # Deploy to Heroku"
	@echo ""
	@echo "🌐 Access Points:"
	@echo "  Development: http://localhost:3000"
	@echo "  Production:  http://localhost (with nginx)"

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
	docker-compose --profile production run --rm certbot sh -c "DOMAINS=$(DOMAIN) EMAIL=$(EMAIL) STAGING=$(STAGING) /scripts/init-letsencrypt.sh"

ssl-renew: ## Manually renew SSL certificates
	@echo "🔄 Renewing SSL certificates..."
	docker-compose --profile production exec certbot /scripts/renew-certs.sh

ssl-status: ## Check SSL certificate status
	@echo "📋 SSL Certificate Status:"
	docker-compose --profile production exec certbot certbot certificates

ssl-test: ## Test SSL certificate renewal (dry run)
	@echo "🧪 Testing SSL certificate renewal..."
	docker-compose --profile production exec certbot certbot renew --dry-run

configure-domain: ## Configure nginx for specific domain (requires DOMAIN)
	@echo "🔧 Configuring domain..."
	@if [ -z "$(DOMAIN)" ]; then echo "❌ Please specify DOMAIN=your-domain.com"; exit 1; fi
	docker-compose --profile production exec nginx sh -c "DOMAIN=$(DOMAIN) /scripts/configure-domain.sh $(DOMAIN)"
	docker-compose --profile production restart nginx

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
	docker-compose --profile production exec certbot rm -rf /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal
	@echo "🗑️  SSL certificates removed"

ssl-logs: ## Show certbot logs
	@echo "📋 Certbot logs:"
	docker-compose --profile production logs certbot

# Heroku deployment commands
heroku-validate: ## Validate that the app builds correctly for Heroku
	@echo "🔍 Validating Heroku deployment readiness..."
	@echo "📦 Testing Docker build process..."
	docker-compose build
	@echo "✅ Docker build successful!"
	@echo "📋 Checking container functionality..."
	@docker-compose up -d
	@sleep 10
	@curl -f http://localhost:3000/api/health >/dev/null 2>&1 && echo "✅ Health check passed" || echo "❌ Health check failed"
	@docker-compose down
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
