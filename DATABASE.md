# Database Configuration Guide

This project uses a database adapter pattern that automatically detects and uses the appropriate database for your environment.

## Local Development (SQLite)
- **Automatic**: SQLite is used by default for local development
- **No setup required**: Database file is created automatically in `./data/discord_stats.db`
- **Configuration**: Set `DATABASE_PATH` in your `.env` file if you want to change the location

## Heroku Production (PostgreSQL)
- **Automatic**: PostgreSQL is detected when `DATABASE_URL` environment variable is present
- **Setup**: Add the Heroku Postgres addon to your app
- **Migration**: Data from SQLite will need to be migrated manually if you have existing data

## Manual PostgreSQL Setup
For custom PostgreSQL installations, configure these environment variables:
```bash
DATABASE_TYPE=postgresql
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=discord_stats
DB_USER=your-username
DB_PASSWORD=your-password
```

## Environment Detection
The system automatically chooses the database adapter based on:
1. `DATABASE_TYPE` environment variable (if set)
2. Presence of `DATABASE_URL` (Heroku PostgreSQL)
3. Presence of `DB_HOST` (manual PostgreSQL)
4. Falls back to SQLite for local development

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
Both SQLite and PostgreSQL use the same schema:
- `member_stats` - Discord server member counts over time
- `game_stats` - Game activity snapshots
- `game_sessions` - Individual user game sessions with start/end times

## Migration Notes
- Tables are created automatically on first run
- No manual migrations needed for new deployments
- Existing SQLite data would need manual export/import for production migration
