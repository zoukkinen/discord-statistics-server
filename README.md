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
# All platforms (Linux/macOS/WSL/Windows):
make setup      # Create .env file
# Edit .env with your Discord credentials
make dev        # Start development environment
```

### Platform-Specific Instructions

#### All Platforms (Unified Process)
```bash
# 1. Setup environment
make setup

# 2. Configure your Discord credentials
# Edit the .env file with your bot token and server ID
nano .env  # or use any text editor

# 3. Start the application
make dev   # Development mode
make prod  # Production mode (with nginx)
```

The Makefile automatically detects your platform (Windows/WSL, macOS Intel/ARM64, Linux) and applies the appropriate optimizations.

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

# Setup
make setup             # Create .env file from template
make validate-env      # Validate environment configuration

# Development
make dev               # Start in development mode
make up                # Start containers
make down              # Stop containers
make restart           # Restart all services

# Production
make prod              # Start in production mode (with nginx)
make build             # Build Docker images

# Monitoring
make logs              # View all logs
make logs-bot          # View Discord bot logs
make status            # Check service status

# Database Operations
make backup            # Backup PostgreSQL database
make restore           # Restore from backup (specify BACKUP_FILE=filename)
make list-backups      # List available backups
make sync-production   # Sync with Heroku production data

# Cleanup
make clean             # Remove containers, images, and data (destructive)
make clean-soft        # Remove containers only (keeps data)
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

## 🎯 Event Management

This tracker supports **dynamic event management** through an intuitive admin interface! You can create, manage, and switch between multiple events without restarting the system.

### 🆕 Admin Interface (Recommended)

**Easy Setup**: After installation, navigate to `/admin` in your browser:
- **Local Development**: http://localhost:5173/admin
- **Production**: https://yourdomain.com/admin

**Features**:
- ✅ Create new events with custom dates and descriptions
- ✅ Switch active events instantly
- ✅ View event history and statistics
- ✅ Edit existing event details
- ✅ No server restart required

### 📋 Legacy Environment Configuration (Deprecated)

> **⚠️ Note**: Environment variables are now deprecated in favor of the admin interface. They're kept for backwards compatibility and initial setup only.

For the initial default event, the system uses Assembly Summer 2025 configuration. If you need to override this during first setup, you can still use:

```env
# ⚠️ DEPRECATED: Use /admin interface instead
EVENT_NAME=Your Event Name 2025
EVENT_START_DATE=2025-12-01T09:00:00Z
EVENT_END_DATE=2025-12-05T18:00:00Z
EVENT_TIMEZONE=Europe/London
EVENT_DESCRIPTION=Discord activity tracking for Your Event Name 2025
```

### 🎨 Multiple Event Support

With the new system, you can:
- **Track multiple events** over time
- **Compare statistics** between different events
- **Maintain historical data** for all your events
- **Switch contexts** easily without data loss

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

# View development logs
make logs

# Stop services
make down
```

### Production Mode
```bash
# Deploy with nginx reverse proxy
make prod

# Check status
make status

# View production logs
make logs
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
| `make prod` | Start in production mode (with nginx) |
| `make build` | Build Docker images |
| `make up` | Start services (detached) |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs` | View all logs |
| `make logs-bot` | View Discord bot logs |
| `make status` | Check service status |
| `make backup` | Backup PostgreSQL database |
| `make restore` | Restore from backup (specify BACKUP_FILE=filename) |
| `make sync-production` | Sync with Heroku production data |
| `make list-backups` | List available backups |
| `make clean` | Remove all containers/images/data (destructive) |
| `make clean-soft` | Remove containers only (keep data) |
| `make shell` | Open shell in Discord bot container |
| `make shell-db` | Open shell in PostgreSQL container |
| `make validate-env` | Validate environment configuration |
| `make setup` | Create .env file from template |

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
| `make heroku-validate` | Test app builds correctly for Heroku |
| `make heroku-logs APP_NAME=your-app` | View Heroku logs |
| `make heroku-status APP_NAME=your-app` | Check app status |
| `make heroku-restart APP_NAME=your-app` | Restart Heroku app |
| `make heroku-open APP_NAME=your-app` | Open app in browser |

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
make dev               # Start development environment
make logs              # Monitor logs
make down              # Stop when done

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

- **WSL**: Automatically includes WSL-specific optimizations via `docker-compose.wsl.yml`
- **Apple Silicon**: Automatically includes ARM64 optimizations via `docker-compose.arm64.yml`
- **Linux**: Uses standard Docker operations with base `docker-compose.yml`
- **Cross-platform**: All builds work across platforms automatically

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
# Start development environment
make dev

# View logs in real-time
make logs

# Open shell in container
make shell

# Stop environment
make down
```

### Development Commands

```bash
# Complete setup from scratch
make quick-start          # Creates .env and starts development

# Daily development workflow
make dev                  # Start development environment  
make logs                 # Monitor all logs
make logs-bot             # Monitor Discord bot only
make status               # Check container status

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

docker-compose.yml          # Main containers (dev & prod)
docker-compose.wsl.yml      # WSL-specific optimizations
docker-compose.arm64.yml    # ARM64-specific optimizations
Makefile                    # Container orchestration & commands
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Required |
| `DISCORD_GUILD_ID` | Your Discord server ID | Required |
| `WEB_PORT` | Port for the web dashboard | 3000 |
| `DATABASE_URL` | PostgreSQL connection URL | Auto-configured for containers |

> **📝 Note**: Event configuration (`EVENT_NAME`, `EVENT_START_DATE`, etc.) has been **moved to the admin interface** at `/admin`. Environment variables are no longer needed for event setup!

### Development Workflow

The development environment provides:

- **Backend**: TypeScript compilation and Node.js restart on file changes
- **Frontend**: Vite dev server with instant browser updates  
- **Database**: Persistent PostgreSQL data across container restarts
- **Environment**: Changes to `.env` require container restart (`make restart`)

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

### Platform-Specific Issues

#### Windows WSL Issues
```bash
# If you get permission errors:
sudo chown -R $USER:$USER /path/to/project

# If builds are slow, the Makefile automatically applies WSL optimizations
# including Docker BuildKit settings
```

#### macOS Issues
```bash
# If containers don't start:
docker system prune -f
make build

# The Makefile automatically detects Apple Silicon and applies ARM64 optimizations
```

#### Windows (without WSL) Issues
```cmd
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
- BuildKit optimizations are applied automatically by the Makefile
- Store project files in WSL filesystem, not Windows

#### For Apple Silicon Users
- Multi-arch builds are handled automatically by the Makefile
- ARM64 optimizations are applied automatically via platform detection

#### For All Platforms
- Use `make prod` for production deployment with nginx
- Monitor with `make status` and `make logs`
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
