# Database Configuration Guide

This project uses PostgreSQL exclusively and is designed to run in containers for both development and production environments.

## Development Setup (Container-First)

The recommended approach is to use the provided Docker containers:

### Option 1: Automated Container Setup (Recommended)
```bash
# Use the provided setup scripts
./setup.sh
make dev

# This automatically:
# - Sets up PostgreSQL container
# - Creates the Discord tracker app container
# - Configures networking between containers
```

### Option 2: Manual Container Setup
```bash
# Start PostgreSQL and app containers
docker-compose up -d

# View logs
docker-compose logs -f discord-tracker
```

### Option 3: Local PostgreSQL (Advanced)
For developers who prefer local PostgreSQL installation:
```bash
DATABASE_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your-username
DB_PASSWORD=your-password
```

## Heroku Production (PostgreSQL)
- **Automatic**: PostgreSQL is detected when `DATABASE_URL` environment variable is present
- **Setup**: Add the Heroku Postgres addon to your app
- **Configuration**: Database connection is automatically configured via `DATABASE_URL`

## Environment Detection
The system automatically chooses PostgreSQL and configures the connection based on:
1. `DATABASE_URL` environment variable (Heroku PostgreSQL)
2. Individual database connection variables (`DB_HOST`, `DB_PORT`, etc.)
3. Falls back to localhost PostgreSQL for development

## Heroku Deployment Steps

### 1. Add PostgreSQL Addon
```bash
heroku addons:create heroku-postgresql:mini -a your-app-name
```

### 2. Database will be automatically configured
The `DATABASE_URL` environment variable is automatically set by Heroku.

### 3. Deploy your app
```bash
git push heroku main
```

### 4. Verify database connection
```bash
heroku logs --tail -a your-app-name
```
Look for: `✅ PostgreSQL database initialized successfully`

## Schema
PostgreSQL database schema:
- `member_stats` - Discord server member counts over time
- `game_stats` - Game activity snapshots
- `game_sessions` - Individual user game sessions with start/end times

## Migration Notes
- Tables are created automatically on first run
- No manual migrations needed for new deployments
