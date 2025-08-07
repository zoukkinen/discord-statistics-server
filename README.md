# 🎮 Discord Activity Tracker

[![Deploy to Heroku](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml/badge.svg)](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

A Discord bot that monitors your Discord server's member activity and tracks what games users are playing. Perfect for gaming events, competitions, or community monitoring to keep track of your Discord community's gaming activity!

## ✨ Features

- 📊 **Real-time Member Tracking**: Monitor how many people are online in your Discord server
- 🎮 **Game Activity Monitoring**: Track what games users are currently playing
- 📈 **Historical Statistics**: Store and visualize activity data over time
- 🌐 **Web Dashboard**: Beautiful web interface to view all statistics
- 📱 **Responsive Design**: Works great on desktop and mobile devices
- ⚡ **Real-time Updates**: Dashboard updates automatically every 15 seconds with smooth visual refresh animations and real-time game activity tracking

## 🚀 Quick Start

### Container-First Approach

This project is designed to run exclusively in containers for maximum compatibility and ease of deployment. All development and production environments use Docker containers.

**Cross-platform compatibility:**
- ✅ Windows (with WSL recommended)
- ✅ Windows Linux Subsystem (WSL)
- ✅ macOS (Intel and Apple Silicon)
- ✅ Linux (AMD64 and ARM64)

**Prerequisites:**
- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose
- A Discord bot token
- Your Discord server ID

**Quick deployment:**
```bash
# Linux/macOS/WSL:
./setup.sh
make dev

# Windows (PowerShell/Command Prompt):
setup.bat
# Then follow the displayed instructions
```

### Platform-Specific Instructions

#### Windows with WSL (Recommended)
```bash
# 1. Open WSL terminal
wsl

# 2. Run setup
./setup.sh

# 3. Configure environment
nano .env

# 4. Start application
make dev
```

#### Windows without WSL
```cmd
REM 1. Run Windows setup
setup.bat

REM 2. Configure environment (edit .env file)

REM 3. Start application
docker-compose up --build
```

#### macOS (Intel and Apple Silicon)
```bash
# 1. Run setup (automatically detects ARM64/AMD64)
./setup.sh

# 2. Configure environment
nano .env

# 3. Start application
make dev
```

#### Linux
```bash
# 1. Run setup
./setup.sh

# 2. Configure environment
nano .env

# 3. Start application
make dev
```

### Option 2: Docker Deployment (Manual)

**Prerequisites:**
- Docker and Docker Compose installed
- A Discord bot token
- Your Discord server ID

**Manual deployment:**
```bash
# 1. Setup environment
make setup
# Edit .env file with your Discord credentials

# 2. Start in development mode
make dev

# 3. Or start in production mode (with nginx)
make prod
```

**Available Make commands:**
```bash
make help              # Show all available commands
make platform-info     # Show platform information

# Development
make dev               # Start in development mode
make dev-hot           # Start development with hot reload
make dev-detached      # Start development in background
make stop-dev          # Stop development environment

# Production
make prod              # Start in production mode (with nginx)
make build             # Build Docker images
make build-multiplatform # Build for multiple architectures

# Monitoring
make logs              # View all logs
make logs-dev          # View development logs
make status            # Check service status
make health            # Health check

# Database
make backup            # Backup PostgreSQL database
make restore           # Restore from backup
make sync-production   # Sync with Heroku production data

# Maintenance
make clean             # Clean up (destructive)
make wsl-setup         # WSL-specific optimizations
```

**Alternative: Manual Container Setup**

If you prefer to set up containers manually without the automated scripts:

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo-url>
   cd discord-statistics-server
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your environment:**
   Edit `.env` file with your Discord bot token and server ID:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_GUILD_ID=your_discord_server_id_here
   WEB_PORT=3000
   ```

## 🎯 Event Configuration

This tracker can be easily configured for any event! By default, it's set up for Assembly Summer 2025, but you can customize it for your own event by adding these environment variables to your `.env` file:

```env
# Event Configuration
EVENT_NAME=Your Event Name 2025
EVENT_START_DATE=2025-12-01T09:00:00Z
EVENT_END_DATE=2025-12-05T18:00:00Z
EVENT_TIMEZONE=Europe/London
EVENT_DESCRIPTION=Discord activity tracking for Your Event Name 2025
```

### Event Configuration Options

| Variable | Description | Example |
|----------|-------------|---------|
| `EVENT_NAME` | Name of your event | `"GameJam 2025"` |
| `EVENT_START_DATE` | Event start date and time (ISO 8601) | `"2025-12-01T09:00:00Z"` |
| `EVENT_END_DATE` | Event end date and time (ISO 8601) | `"2025-12-05T18:00:00Z"` |
| `EVENT_TIMEZONE` | Timezone for date display | `"Europe/London"`, `"America/New_York"` |
| `EVENT_DESCRIPTION` | Brief description of your event | `"Gaming competition tracking"` |

### Popular Timezone Examples
- `Europe/London` (GMT/BST)
- `Europe/Helsinki` (EET/EEST) 
- `America/New_York` (EST/EDT)
- `America/Los_Angeles` (PST/PDT)
- `Asia/Tokyo` (JST)
- `Australia/Sydney` (AEST/AEDT)

**Note:** The dashboard will automatically update its title, dates, and all references to use your configured event details!

4. **Start the containers:**
   ```bash
   # Start PostgreSQL and the app in development mode
   docker-compose up
   
   # Or start in background
   docker-compose up -d
   ```

5. **Open the dashboard:**
   Visit `http://localhost:3000` in your browser

## 🐳 Docker Deployment

### Development Mode
```bash
# Start all services for development
make dev

# Start with hot reload (recommended for development)
make dev-hot

# Start in background
make dev-detached

# View development logs
make logs-dev

# Stop development services
make stop-dev
```

### Production Mode
```bash
# Deploy with nginx reverse proxy
make prod

# Check status
make status

# View logs
make logs-nginx
```

### SSL/HTTPS Setup
```bash
# Complete SSL setup with Let's Encrypt
make ssl-setup-complete DOMAIN=your-domain.com EMAIL=admin@example.com

# Check SSL certificate status
make ssl-status

# Renew certificates manually
make ssl-renew

# Test certificate renewal
make ssl-test
```

For detailed SSL setup instructions, see [SSL_SETUP.md](docs/SSL_SETUP.md).

## ☁️ Heroku Deployment

### Quick Heroku Deploy (EU Region)
```bash
# Deploy to Heroku with auto-setup (EU region for better European performance)
./scripts/deploy-heroku.sh your-app-name

# Or use make command
make heroku-deploy APP_NAME=your-app-name
```

### GitHub Actions Auto-Deploy
```bash
# 1. Set up GitHub secrets (see docs/HEROKU_DEPLOY.md)
# 2. Push to main branch - auto-deploys!
git push origin main

# Monitor deployment status
make heroku-status APP_NAME=your-app-name
```

### Heroku Management
```bash
# View logs
make heroku-logs APP_NAME=your-app-name

# Restart app
make heroku-restart APP_NAME=your-app-name

# Check health
make heroku-health APP_NAME=your-app-name

# Open in browser
make heroku-open APP_NAME=your-app-name
```

For detailed Heroku setup instructions, see [HEROKU_DEPLOY.md](docs/HEROKU_DEPLOY.md).

### Database Management
```bash
# Backup database
make backup

# List available backups
make list-backups

# Restore from backup
make restore BACKUP_FILE=discord_stats_20250730_120000.sql
```

### Docker Commands Reference

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make setup` | Create .env from template |
| `make quick-start` | Complete setup and start development |
| `make dev` | Start in development mode |
| `make dev-hot` | Start development with hot reload |
| `make dev-detached` | Start development in background |
| `make stop-dev` | Stop development environment |
| `make prod` | Start in production mode (with nginx) |
| `make build` | Build Docker images |
| `make build-multiplatform` | Build for multiple architectures |
| `make up` | Start services (detached) |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs` | View all logs |
| `make logs-dev` | View development logs |
| `make logs-dev-backend` | View development backend logs |
| `make logs-dev-frontend` | View development frontend logs |
| `make status` | Check service status |
| `make status-dev` | Check development service status |
| `make health` | Health check |
| `make backup` | Backup PostgreSQL database |
| `make restore` | Restore from backup |
| `make sync-production` | Sync with Heroku production data |
| `make list-backups` | List available backups |
| `make clean` | Remove all containers/images |
| `make clean-soft` | Remove containers only (keep data) |
| `make shell` | Open shell in container |
| `make shell-dev` | Open shell in development container |
| `make update` | Update and redeploy |
| `make validate-env` | Validate environment configuration |

### SSL/Certificate Commands

| Command | Description |
|---------|-------------|
| `make ssl-setup-complete DOMAIN=example.com EMAIL=admin@example.com` | Complete SSL setup |
| `make ssl-init DOMAIN=example.com EMAIL=admin@example.com` | Initialize SSL certificates |
| `make ssl-renew` | Renew certificates manually |
| `make ssl-status` | Check certificate status |
| `make ssl-test` | Test certificate renewal |
| `make ssl-logs` | View certbot logs |
| `make configure-domain DOMAIN=example.com` | Configure nginx for domain |
| `make ssl-remove` | Remove all certificates |

### Heroku Deployment Commands

| Command | Description |
|---------|-------------|
| `make heroku-deploy APP_NAME=your-app` | Deploy to Heroku |
| `make heroku-logs APP_NAME=your-app` | View Heroku logs |
| `make heroku-status APP_NAME=your-app` | Check app status |
| `make heroku-restart APP_NAME=your-app` | Restart Heroku app |
| `make heroku-health APP_NAME=your-app` | Health check |
| `make heroku-open APP_NAME=your-app` | Open app in browser |
| `make heroku-setup` | Show setup guide |

### Custom Domain Commands

| Command | Description |
|---------|-------------|
| `make domain-add APP_NAME=your-app DOMAIN=assembly.test.com` | Add custom domain |
| `make domain-status APP_NAME=your-app` | Check domain & SSL status |
| `make domain-test DOMAIN=assembly.test.com` | Test domain connectivity |
| `make domain-health DOMAIN=assembly.test.com` | Test custom domain health |

## 🐳 Container-First Development

This project uses a **container-first approach** for both development and production. Everything runs in Docker containers to ensure consistency across platforms.

### Development Workflow

```bash
# 1. Complete setup (creates .env and starts development)
make quick-start

# 2. Daily development workflow
make dev-hot           # Start with hot reload
make logs-dev          # Monitor logs
make stop-dev          # Stop when done

# 3. Database operations
make backup            # Backup your local data
make sync-production   # Get latest production data
make restore BACKUP_FILE=local_backup_20250807_120000.sql
```

### Key Benefits

- ✅ **Cross-platform consistency**: Works identically on Windows, macOS, and Linux
- ✅ **No local dependencies**: Only Docker required, no Node.js/npm installation needed
- ✅ **Isolated environments**: Development and production are completely separate
- ✅ **Easy database management**: PostgreSQL runs in container with persistent data
- ✅ **Hot reload**: Frontend and backend automatically restart on code changes
- ✅ **Production parity**: Development environment matches production exactly

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Mode                         │
├─────────────────────────────────────────────────────────────┤
│ discord-bot-dev    │ TypeScript bot with hot reload         │
│ postgres-dev       │ PostgreSQL database with persistent    │
│ frontend-dev       │ Vite dev server with hot reload        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Production Mode                          │
├─────────────────────────────────────────────────────────────┤
│ discord-tracker    │ Compiled TypeScript bot                │
│ postgres           │ PostgreSQL database                     │
│ nginx              │ Reverse proxy + static file serving    │
│ certbot            │ SSL certificate management             │
└─────────────────────────────────────────────────────────────┘
```

### Platform-Specific Optimizations

The Makefile automatically detects your platform and applies optimizations:

- **WSL**: Uses Docker BuildKit optimizations
- **Apple Silicon**: Builds ARM64-compatible images
- **Linux**: Standard Docker operations
- **Multi-platform**: `make build-multiplatform` for cross-platform builds

## 🤖 Discord Bot Setup

### Creating a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token and add it to your `.env` file

### Bot Permissions

Your bot needs the following permissions:
- `View Channels`
- `Read Message History`
- `View Server Insights` (for member information)

### Inviting the Bot

1. Go to the "OAuth2" > "URL Generator" section
2. Select "bot" scope
3. Select the required permissions
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### Getting Your Server ID

1. Enable Developer Mode in Discord (User Settings > App Settings > Advanced > Developer Mode)
2. Right-click on your server name
3. Click "Copy Server ID"
4. Add this ID to your `.env` file

## 📊 Dashboard Features

### Real-time Statistics
- Current online member count
- Total server members
- Number of different games being played
- Total players currently gaming

### Historical Charts
- Member activity over the last 24 hours
- Game popularity trends
- Peak activity times

### Game Statistics
- Currently playing games with player counts
- Top games by total playtime
- Unique players per game
- **NEW**: Real-time activity feed showing when players start/stop playing games

### Visual Experience
- Smooth refresh animations when areas update
- Visual feedback for data updates
- Highlighted new content and activity
- Assembly-themed cyberpunk styling

## 🛠️ Development

### Container-First Development Workflow

All development happens in Docker containers for consistency and isolation:

```bash
# Start development environment with hot reload
make dev-hot

# View logs in real-time
make logs-dev

# Open shell in development container
make shell-dev

# Stop development environment
make stop-dev
```

### Development Commands

```bash
# Complete setup from scratch
make quick-start          # Creates .env and starts development

# Daily development workflow
make dev-hot              # Hot reload development
make dev-detached         # Background development
make logs-dev             # Monitor all development logs
make logs-dev-backend     # Monitor backend only
make logs-dev-frontend    # Monitor frontend only
make status-dev           # Check container status

# Database operations
make backup               # Backup local PostgreSQL
make restore BACKUP_FILE=filename.sql
make sync-production      # Get latest production data
```

### Project Structure

```
src/
├── index.ts          # Main entry point
├── bot.ts            # Discord bot logic
├── config.ts         # Universal event configuration
├── database/         # Database layer (PostgreSQL only)
└── webServer.ts      # Express web server

frontend/
└── src/              # React/TypeScript frontend

public/
└── index.html        # Fallback static dashboard

docker-compose.yml          # Production containers
docker-compose.dev.yml      # Development containers  
Makefile                    # Container orchestration
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Required |
| `DISCORD_GUILD_ID` | Your Discord server ID | Required |
| `WEB_PORT` | Port for the web dashboard | 3000 |
| `EVENT_NAME` | Name of your event | Assembly Summer 2025 |
| `EVENT_START_DATE` | Event start date (ISO 8601) | 2025-07-31T00:00:00+03:00 |
| `EVENT_END_DATE` | Event end date (ISO 8601) | 2025-08-03T23:59:59+03:00 |
| `DATABASE_URL` | PostgreSQL connection URL | Auto-configured for containers |

### Hot Reload Development

The development environment supports hot reload for both backend and frontend:

- **Backend**: TypeScript compilation and Node.js restart on file changes
- **Frontend**: Vite dev server with instant browser updates
- **Database**: Persistent PostgreSQL data across container restarts
- **Environment**: Changes to `.env` require container restart (`make stop-dev && make dev-hot`)

## 📈 Data Collection

The bot collects the following data every 2 minutes:
- Total member count
- Online member count
- Games being played and player counts

Real-time event tracking:
- Individual game session start/end times (immediate via Discord presence events)
- Member join/leave events (immediate)

All data is stored in a PostgreSQL database.

### Discord API Rate Limits & Performance

**Current Optimized Settings:**
- **Stats Collection**: Every 2 minutes (down from 5 minutes)
- **Dashboard Updates**: Every 15 seconds (down from 30 seconds)  
- **Game Activity**: Real-time via Discord events (no polling)

**Discord Rate Limits:**
- Guild data fetching: ~50 requests per 10 seconds per bot
- We use only 1-2 API calls every 2 minutes, well within limits
- Presence data is received via WebSocket events (real-time, no rate limit)

**Further Optimizations Possible:**
- Could reduce to 1 minute intervals if needed (still within rate limits)
- Real-time presence events ensure immediate game tracking
- Member join/leave events are also real-time

## 🎯 Assembly Summer 2025

This project is specifically designed for the Assembly summer 2025 event. The dashboard features Assembly-themed styling and is optimized for tracking gaming communities during the event.

## 🔧 Troubleshooting

### Common Issues

**Bot not responding:**
- Check that the bot token is correct
- Verify the bot has been invited to your server
- Ensure the bot has the required permissions

**Web dashboard not loading:**
- Check that port 3000 is not being used by another application
- Verify the bot is running without errors
- Check the console for any error messages

**No data showing:**
- Wait a few minutes for the bot to collect initial data
- Check that users are online and playing games
- Verify the Discord server ID is correct

### Platform-Specific Issues

#### Windows WSL Issues
```bash
# If Docker commands are slow:
make wsl-setup

# If you get permission errors:
sudo chown -R $USER:$USER /path/to/project

# If builds are slow, enable BuildKit:
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

#### macOS Issues
```bash
# If you get architecture errors on Apple Silicon:
make build-multiplatform

# If containers don't start:
docker system prune -f
make build
```

#### Windows (without WSL) Issues
```cmd
REM If you get "docker-compose not found":
docker compose up --build

REM If port 3000 is in use:
netstat -ano | findstr :3000
REM Kill the process using the port

REM For better performance, consider using WSL:
wsl --install
```

#### Linux Issues
```bash
# If you get permission errors:
sudo usermod -aG docker $USER
# Then logout and login again

# If builds fail with memory errors:
docker system prune -f
```

### Performance Optimization

#### For WSL Users
- Use named volumes (already configured)
- Enable BuildKit: `make wsl-setup`
- Store project files in WSL filesystem, not Windows

#### For Apple Silicon Users
- Multi-arch builds are automatic
- Use `make build-multiplatform` for explicit cross-platform builds

#### For All Platforms
- Use `make prod` for production deployment with nginx
- Monitor with `make status` and `make health`
- Regular backups with `make backup`

### Logs

The bot outputs detailed logs to help with debugging:
- `✅` Success messages
- `📊` Statistics collection
- `🎮` Game activity changes
- `❌` Error messages

## 📝 License

ISC License - feel free to use this for your Assembly event!

## 🤝 Contributing

This is a project for Assembly Summer 2025, but contributions are welcome! Feel free to submit issues or pull requests.

---

Made with ❤️ for Assembly Summer 2025 🎮
