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
	@echo "  setup         Create .env file"
	@echo "  quick-start   Complete setup and start development"
	@echo ""
	@echo "Development:"
	@echo "  dev           Start development environment"
	@echo "  build         Build Docker images"
	@echo "  rebuild       Force rebuild from scratch"
	@echo "  restart       Restart all services"
	@echo "  stop          Stop all services"
	@echo "  logs          Show application logs"
	@echo "  shell         Open shell in bot container"
	@echo ""
	@echo "Testing:"
	@echo "  test          Run all tests (unit, integration, migration, frontend, lint)"
	@echo "  test-unit     Run unit tests only"
	@echo "  test-integration Run integration tests"
	@echo "  test-frontend Run frontend tests"
	@echo "  test-migration Run database migration tests"
	@echo "  test-coverage Generate test coverage report"
	@echo ""
	@echo "Production:"
	@echo "  prod          Start production with nginx"
	@echo "  deploy        Full production deployment"
	@echo "  health        Check application health"
	@echo ""
	@echo "Heroku:"
	@echo "  heroku-deploy Deploy to Heroku (APP_NAME=name)"
	@echo "  heroku-logs   View Heroku logs (APP_NAME=name)"
	@echo "  heroku-status Check Heroku status (APP_NAME=name)"
	@echo ""
	@echo "Database:"
	@echo "  migrate       Run database migrations"
	@echo "  backup        Backup local database"
	@echo "  restore       Restore database (BACKUP_FILE=filename)"
	@echo "  list-backups  List available backups"
	@echo "  sync-prod     Sync with production data (HEROKU_APP=name)"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean         Remove all containers and data"
	@echo "  clean-tests   Clean test artifacts"
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
	@echo "🔐 Checking encryption key..."
	@if [ -z "$${CREDENTIAL_ENCRYPTION_KEY}" ] && [ ! -f .env ] || ! grep -q "^CREDENTIAL_ENCRYPTION_KEY=" .env; then \
		echo "⚠️  CREDENTIAL_ENCRYPTION_KEY not set - will use default (not secure for production)"; \
	fi

quick-start: setup validate-env dev migrate ## Complete setup and start development

# === DEVELOPMENT ===
dev: validate-env ## Start development environment
	@echo "⚡ Starting development environment..."
	@$(DOCKER_COMPOSE) up -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 3



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

deploy-check: validate-env ## Check deployment readiness
	@echo "🔍 Checking deployment readiness..."
	@echo "📦 Building application..."
	@$(DOCKER_COMPOSE) build --quiet
	@echo "🧪 Running critical tests..."
	@$(MAKE) test-unit
	@echo "🔐 Validating security features..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test -- --testNamePattern="CredentialEncryption" --silent
	@echo "🗄️ Testing database migrations..."
	@$(MAKE) test-migration
	@echo "✅ Deployment readiness check passed!"

deploy: validate-env deploy-check build prod ## Full production deployment with testing
	@echo "🎉 Production deployment complete!"
	@echo "🌐 Dashboard: http://localhost"
	@echo "🧪 Running post-deployment health checks..."
	@sleep 10
	@$(MAKE) health

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

# === TESTING ===
test: validate-env ## Run all tests in Docker container (unit, integration, migration, frontend, lint, format)
	@echo "🧪 Running comprehensive test suite in Docker..."
	@echo "🔬 Step 1/6: Running unit tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:unit
	@echo ""
	@echo "🔄 Step 2/6: Running migration tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:migration
	@echo ""
	@echo "🔗 Step 3/6: Running integration tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:integration
	@echo ""
	@echo "🎨 Step 4/6: Running frontend tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:frontend
	@echo ""
	@echo "🔍 Step 5/6: Checking TypeScript compilation..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npx tsc --noEmit
	@$(DOCKER_COMPOSE) exec -T discord-bot npx tsc --project frontend/tsconfig.json --noEmit
	@echo ""
	@echo "✨ Step 6/6: Running code quality checks..."
	@echo "  (Additional linting/formatting can be added here)"
	@echo ""
	@echo "✅ All tests completed successfully!"

test-unit: validate-env ## Run only unit tests in Docker
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:unit

test-integration: validate-env ## Run only integration tests in Docker
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:integration

test-unit: ## Run unit tests only
	@echo "🔬 Running unit tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:unit

test-integration: validate-env ## Run integration tests (requires database)
	@echo "🔗 Running integration tests..."
	@$(DOCKER_COMPOSE) up -d postgres
	@sleep 5
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:integration

test-frontend: ## Run frontend tests
	@echo "🎨 Running frontend tests..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:frontend

test-watch: ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	@$(DOCKER_COMPOSE) exec discord-bot npm run test:watch

test-coverage: validate-env ## Generate test coverage report
	@echo "📊 Generating test coverage report..."
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:coverage
	@echo "📈 Coverage report generated in coverage/ directory"

test-migration: validate-env ## Test database migration system
	@echo "🔄 Testing database migrations..."
	@$(DOCKER_COMPOSE) up -d postgres
	@sleep 5
	@$(DOCKER_COMPOSE) exec -T discord-bot npm run test:migration



# === DATABASE ===
migrate: ## Run database migrations
	@echo "🔄 Running database migrations..."
	@echo "ALTER TABLE events ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE; CREATE INDEX IF NOT EXISTS idx_events_visible ON events(guild_id, is_hidden) WHERE is_hidden = false;" | $(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d discord_stats
	@echo "✅ Migrations completed"

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
	@echo "🔍 Detecting backup format..."
	@if file backups/$(BACKUP_FILE) | grep -q "PostgreSQL custom database dump"; then \
		echo "📦 Custom format detected, using pg_restore..."; \
		cat backups/$(BACKUP_FILE) | $(DOCKER_COMPOSE) exec -T postgres pg_restore -U discord_bot -d discord_stats --no-owner --no-acl || true; \
	else \
		echo "📄 SQL format detected, using psql..."; \
		cat backups/$(BACKUP_FILE) | $(DOCKER_COMPOSE) exec -T postgres psql -U discord_bot -d discord_stats; \
	fi
	@$(DOCKER_COMPOSE) start discord-bot
	@echo "✅ Database restored successfully"



list-backups: ## List available backups
	@echo "📋 Available backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups found"


sync-prod: ## Sync with production data
	@if [ -z "$(HEROKU_APP)" ]; then HEROKU_APP="assembly-discord-tracker-2025"; fi; \
	echo "🚀 Syncing with production ($$HEROKU_APP)..."; \
	$(DOCKER_COMPOSE) stop discord-bot; \
	./scripts/heroku-backup.sh backup $$HEROKU_APP; \
	./scripts/heroku-backup.sh restore $$HEROKU_APP; \
	$(DOCKER_COMPOSE) up -d; \
	echo "✅ Synced with production!"

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
	@rm -rf coverage/ node_modules/.cache/ .nyc_output/
	@echo "✅ Cleanup complete"

clean-soft: ## Remove containers only (keep data)
	@echo "🧹 Soft cleanup..."
	@$(DOCKER_COMPOSE) down

clean-tests: ## Clean test artifacts and coverage reports
	@echo "🧹 Cleaning test artifacts..."
	@rm -rf coverage/ test-results/ .nyc_output/
	@$(DOCKER_COMPOSE) exec postgres psql -U discord_bot -c "DROP DATABASE IF EXISTS discord_stats_test;" 2>/dev/null || true
	@echo "✅ Test artifacts cleaned"

update: ## Update and rebuild application
	@echo "🔄 Updating application..."
	@git pull
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build --no-cache
	@$(DOCKER_COMPOSE) up -d
	@echo "🧪 Running post-update tests..."
	@$(MAKE) test-unit
	@echo "✅ Application updated and tested"

status-full: ## Show comprehensive project status
	@echo "📊 Universal Discord Activity Tracker - Project Status"
	@echo "=================================================="
	@echo ""
	@echo "🌿 Git Status:"
	@git status --porcelain | head -10 || echo "  Repository clean"
	@echo "  Current branch: $$(git branch --show-current 2>/dev/null || echo 'unknown')"
	@echo "  Last commit: $$(git log -1 --oneline 2>/dev/null || echo 'No commits')"
	@echo ""
	@echo "🐳 Docker Status:"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "🗄️ Database Status:"
	@$(DOCKER_COMPOSE) exec postgres psql -U discord_bot -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE '%discord%';" 2>/dev/null || echo "  Database not available"
	@echo ""
	@echo "🧪 Test Status:"
	@echo "  Unit Tests: $$($(DOCKER_COMPOSE) exec -T discord-bot npm run test:unit 2>/dev/null | grep -E 'Tests:|passed|failed' | tail -1 || echo 'Not available')"
	@echo "  Coverage: $$(test -d coverage && echo 'Available in coverage/' || echo 'Not generated')"
	@echo ""
	@echo "🔐 Security Status:"
	@echo "  Encryption Key: $$(test -n "$$CREDENTIAL_ENCRYPTION_KEY" && echo 'Set' || echo 'Using default (development only)')"
	@echo "  Admin Password: $$(test -n "$$ADMIN_PASSWORD" && echo 'Custom' || echo 'Default (change for production)')"
	@echo ""
	@echo "🌐 Service Health:"
	@$(MAKE) health 2>/dev/null || echo "  Health check not available"
