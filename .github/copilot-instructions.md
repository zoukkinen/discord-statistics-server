<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Universal Discord Activity Tracker

This project is a Discord bot that tracks Discord server activity and game statistics for gaming events. Originally designed for Assembly Summer 2025, it has evolved into a universal event configuration system that can be adapted for any gaming event.

## Project Context
- **Purpose**: Monitor Discord server member count and track what games users are playing during gaming events
- **Features**: Real-time member tracking, game activity monitoring, historical statistics, web dashboard, universal event configuration
- **Tech Stack**: TypeScript, Discord.js, Express.js, PostgreSQL, Docker
- **Architecture**: Container-first design for maximum compatibility and deployment ease
- **Current Default**: Assembly Summer 2025 (configurable for any event)

## Universal Configuration System
- **Event Configuration**: Complete event details configurable via environment variables
- **Dynamic Frontend**: Web dashboard adapts automatically to configured event
- **API Integration**: `/api/config` endpoint provides event configuration to frontend
- **Container Architecture**: Full containerization for both development and production
- **Cross-Platform Support**: Runs consistently across Windows, macOS, and Linux via containers
- **Fallback Defaults**: Assembly Summer 2025 configuration as sensible defaults

## Code Guidelines
- Use TypeScript for all source code
- Follow Discord.js v14+ patterns and best practices
- Implement proper error handling and logging
- Use PostgreSQL for data persistence
- Create responsive web dashboard with real-time updates
- Focus on performance and reliability for continuous monitoring
- Include proper environment variable configuration
- Implement graceful bot shutdown and restart capabilities
- Maintain universal configurability - avoid hardcoding event-specific details
- Use the Config class from `src/config.ts` for all event-related settings
- Design for containers: all development and production runs in Docker containers
- Ensure container compatibility with proper environment variable passing

## Key Components
- **Discord Bot**: Real-time monitoring of server activity (`src/bot.ts`)
- **Configuration System**: Universal event configuration (`src/config.ts`)
- **Database Layer**: PostgreSQL persistence for statistics (`src/database/`)
- **Web Server**: API endpoints and dashboard serving (`src/webServer.ts`)
- **Dynamic Frontend**: Event-adaptive web interface (`public/index.html`)
- **Docker Infrastructure**: Containerized deployment with nginx proxy

## Environment Configuration
Configure any gaming event using these environment variables:
- `EVENT_NAME`: Name of the gaming event (default: "Assembly Summer 2025")
- `EVENT_START_DATE`: Event start date in ISO format (default: "2025-07-31T00:00:00+03:00")
- `EVENT_END_DATE`: Event end date in ISO format (default: "2025-08-03T23:59:59+03:00")
- `EVENT_TIMEZONE`: Event timezone (default: "Europe/Helsinki")
- `EVENT_DESCRIPTION`: Event description (default: "Finland's biggest computer festival...")

## Commit Policy
Follow conventional commit format with clear, descriptive messages:
- **feat**: New features (e.g., "feat: implement universal event configuration system")
- **fix**: Bug fixes (e.g., "🐛 Fix Currently Playing accuracy - reduce fallback from 5 minutes to 1 minute")
- **docs**: Documentation updates
- **style**: UI/UX improvements (e.g., "Add gaming controller emoji favicon")
- **refactor**: Code restructuring without feature changes
- **test**: Test additions or modifications
- **chore**: Maintenance tasks

### Commit Message Format
```
<type>: <short description>

[optional longer description with bullet points]
- Detail 1
- Detail 2
- Detail 3
```

### Examples of Good Commits
- `feat: implement universal event configuration system`
- `🐛 Fix Currently Playing accuracy - reduce fallback from 5 minutes to 1 minute`
- `Add gaming controller emoji favicon`
- `docs: update README with configuration instructions`
