# Assembly Discord Tracker

[![Comprehensive Test Suite](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/test.yml/badge.svg)](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/test.yml)
[![Deploy to Heroku](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml/badge.svg)](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

Professional Discord bot for monitoring server activity and gaming statistics. Features a modern SolidJS frontend, multi-event management, encrypted credential storage, and admin interface.

## ✨ Features

- **Multi-Event Management** - Create and manage multiple tracked events with independent configurations
- **Real-Time Statistics** - Live member tracking, game activity monitoring, and analytics
- **Admin Dashboard** - Secure admin interface at `/admin` with event management and statistics
- **Encrypted Credentials** - AES-256-GCM encryption for Discord bot tokens and sensitive data
- **SolidJS Frontend** - Modern, reactive UI with Progressive Web App (PWA) support
- **PostgreSQL Database** - Automatic schema migrations with version control
- **Container-Ready** - Docker & Docker Compose for consistent development/production
- **GitHub Actions CI/CD** - Automated testing and deployment pipeline
- **Type-Safe** - Full TypeScript with strict mode enabled

## 📋 Prerequisites

- **Node.js** >= 20.x
- **Docker & Docker Compose** (for local development)
- **Discord Bot Token** (from [Discord Developer Portal](https://discord.com/developers/applications))
- **Discord Server ID** (your server's ID where the bot will operate)

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/zoukkinen/discord-statistics-server.git
cd discord-statistics-server

# Setup environment
cp .env.example .env  # Create .env with your Discord credentials
make dev              # Start development environment
```

### With Docker

```bash
make quick-start      # One-command setup: builds, migrates, starts everything
```

## 📦 Available Commands

### Development

```bash
make dev             # Start dev environment (Vite + Express + PostgreSQL)
make build           # Build TypeScript and SolidJS
make test            # Run full test suite
make test:unit       # Run unit tests only
test:coverage        # Generate coverage reports
```

### Deployment

```bash
make heroku-deploy APP_NAME=myapp    # Deploy to Heroku
make prod                             # Production build locally
make prod-start                       # Start production environment
```

### Database & Utilities

```bash
make backup          # Backup PostgreSQL database
make migrate         # Run database migrations manually
make clean           # Remove all containers and volumes
make logs            # View Docker logs
make help            # Show all available commands
```

## ⚙️ Environment Configuration

Create `.env` file with required variables:

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Admin
ADMIN_PASSWORD=your_secure_password

# Encryption (for credential storage)
CREDENTIAL_ENCRYPTION_KEY=your_encryption_key

# Database (optional - auto-configured in Docker)
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=discord_stats

# Server
PORT=3000
NODE_ENV=development
```

## 🔐 Discord Bot Setup

1. **Create Application**

   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Go to "Bot" section and create bot

2. **Configure Permissions**

   - Required scopes: `bot`, `applications.commands`
   - Required permissions:
     - View Channels
     - Read Messages/View Channels
     - Read Message History
     - View Guild Insights (for analytics)

3. **Get Credentials**

   - Copy bot token to `DISCORD_TOKEN` in `.env`
   - Get your server ID (enable Developer Mode in Discord, right-click server → Copy ID)
   - Add to `DISCORD_GUILD_ID` in `.env`

4. **Invite Bot**
   - Use OAuth2 URL from Developer Portal
   - Select "bot" scope and required permissions
   - Authorize on your server

## 🏗️ Architecture

### Tech Stack

- **Frontend**: SolidJS, TypeScript, Vite, CSS
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL 15+ with automatic migrations
- **Security**: AES-256-GCM encryption, CORS, JWT-ready
- **DevOps**: Docker, Docker Compose, GitHub Actions

### Project Structure

```
.
├── src/                    # Backend source
│   ├── bot.ts             # Discord bot initialization
│   ├── webServer.ts       # Express API server
│   ├── database/          # Database layer with migrations
│   ├── utils/             # Utilities (encryption, etc.)
│   └── types/             # TypeScript types
├── frontend/              # SolidJS frontend
│   ├── src/components/    # UI components
│   ├── src/stores/        # State management
│   └── src/styles/        # CSS styles
├── test/                  # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── migration.test.ts  # Database migration tests
├── scripts/               # Utility scripts
├── docker-compose.yml     # Local development
└── Dockerfile             # Production image
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit          # Unit tests (config, encryption, etc.)
npm run test:integration   # Integration tests (requires PostgreSQL)
npm run test:migration     # Database migration tests
npm run test:coverage      # Generate coverage reports

# Watch mode
npm run test:watch
```

Test coverage includes:

- ✅ Unit tests (config, credential encryption)
- ✅ Integration tests (database, API endpoints)
- ✅ Migration tests (schema changes, data integrity)
- 📊 100% coverage for critical modules (encryption, config)

## 🚀 Heroku Deployment

### Prerequisites

- Heroku account with CLI installed
- PostgreSQL add-on (hobby-dev or higher)

### Deploy Steps

```bash
# 1. Configure Heroku app (first time only)
make heroku-deploy APP_NAME=assembly-discord-tracker-2025

# 2. Set required environment variables
heroku config:set DISCORD_TOKEN=your_token --app assembly-discord-tracker-2025
heroku config:set DISCORD_GUILD_ID=your_guild_id --app assembly-discord-tracker-2025
heroku config:set ADMIN_PASSWORD=your_password --app assembly-discord-tracker-2025
heroku config:set CREDENTIAL_ENCRYPTION_KEY=your_key --app assembly-discord-tracker-2025

# 3. View configuration
heroku config --app assembly-discord-tracker-2025

# 4. View logs
heroku logs --tail --app assembly-discord-tracker-2025
```

**Note**: The `DATABASE_URL` is automatically managed by Heroku's PostgreSQL add-on - do not set manually.

## 📊 Admin Dashboard

Access the admin panel at `https://your-app.com/admin`

**Features**:

- ✅ Event creation and management
- ✅ Real-time statistics and charts
- ✅ Game activity tracking
- ✅ Member analytics
- ✅ Event activation/deactivation

**Authentication**: Use the password from `ADMIN_PASSWORD` environment variable

## 🔍 API Endpoints

### Public Endpoints

- `GET /api/config` - Current configuration and active event
- `GET /api/stats` - Current statistics
- `GET /api/stats/history` - Historical statistics
- `GET /api/stats/top-games` - Top games ranking

### Admin Endpoints (requires authentication)

- `POST /api/admin/auth` - Authenticate with password
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `POST /api/events/:id/activate` - Activate event
- `GET /api/events/:id/stats` - Event statistics

## 🐳 Docker Development

```bash
# Start full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec discord-bot npm run migrate

# Stop everything
docker-compose down
```

## 📝 Database Migrations

Migrations run automatically on startup. To create new migrations:

```bash
# Create migration file in src/database/migrations/
# Format: NNN_description.sql (e.g., 003_add_new_table.sql)
npm run migrate
```

## 🔒 Security

- **Credential Encryption**: Discord tokens encrypted with AES-256-GCM
- **Type Safety**: Full TypeScript strict mode
- **CORS**: Configured for production domains
- **Input Validation**: All user input validated
- **Environment Variables**: Sensitive data via `.env`

## 📄 License

ISC License - See LICENSE file for details

## 🤝 Contributing

Pull requests welcome! Please ensure:

- ✅ All tests pass: `npm run test`
- ✅ TypeScript strict: `npm run build`
- ✅ No linting issues: `npm run lint`

## 📞 Support

For issues and questions:

- GitHub Issues: [discord-statistics-server/issues](https://github.com/zoukkinen/discord-statistics-server/issues)
- Discord: Ask in your server

---

**Made for Gaming Communities** | Last Updated: December 2025
