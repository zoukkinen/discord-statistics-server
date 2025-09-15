# Universal Discord Activity Tracker

[![Deploy to Heroku](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml/badge.svg)](https://github.com/zoukkinen/discord-statistics-server/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

Professional Discord bot for monitoring server activity and gaming statistics. Features a modern SolidJS frontend, multi-event management, and admin interface.

## Features

- Multi-event management with admin interface at `/admin`
- Real-time member tracking and game statistics
- SolidJS frontend with Progressive Web App support
- Container-first development with Docker
- PostgreSQL database with automatic migrations

## Quick Start

**Prerequisites**: Docker, Discord bot token, Discord server ID

```bash
make quick-start    # Complete setup and start development
```

## Commands

```bash
make dev            # Development environment
make prod           # Production with nginx + SSL
make heroku-deploy APP_NAME=myapp    # Deploy to Heroku
make backup         # Database backup
make clean          # Remove all containers
make help           # Show all commands
```

## Configuration

Required environment variables in `.env`:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
ADMIN_PASSWORD=your_admin_password
```

## Discord Bot Setup

1. Create bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Required permissions: View Channels, Read Message History, View Server Insights
3. Get server ID and bot token
4. Add credentials to `.env` file

## Architecture

**Tech Stack**: SolidJS, TypeScript, Express.js, Discord.js, PostgreSQL, Docker  
**Development**: Vite dev server + Express backend + PostgreSQL  
**Production**: nginx + compiled SolidJS + Express + SSL

## Deployment

Deploy to Heroku:
```bash
make heroku-deploy APP_NAME=myapp
heroku config:set DISCORD_TOKEN=your_token --app myapp
heroku config:set DISCORD_GUILD_ID=your_guild_id --app myapp
heroku config:set ADMIN_PASSWORD=your_password --app myapp
```

---

**License**: ISC | **Made for Gaming Communities**
