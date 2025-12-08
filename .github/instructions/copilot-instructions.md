<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Universal Discord Activity Tracker

This project is a Discord bot that tracks Discord server activity and game statistics for gaming events. Originally designed for Assembly Summer 2025, it has evolved into a sophisticated multi-event management system with a modern SolidJS frontend and comprehensive admin interface.

## Project Context
- **Purpose**: Monitor Discord server member count and track what games users are playing during gaming events
- **Features**: Multi-event management, real-time member tracking, game activity monitoring, historical statistics, PWA dashboard, admin interface, database-driven configuration
- **Tech Stack**: TypeScript, SolidJS, Discord.js, Express.js, PostgreSQL, Vite, Docker
- **Architecture**: Container-first design with modern frontend tooling and progressive web app capabilities
- **Event System**: Database-driven multi-event support with dynamic switching and admin management

## Modern Frontend Architecture
- **SolidJS Framework**: Reactive frontend with TypeScript in `frontend/src/`
- **Vite Build System**: Modern development server with hot module replacement and optimized production builds
- **Component Architecture**: Modular SolidJS components with reactive stores for state management
- **Progressive Web App**: Full PWA support with service worker, manifest, and install prompts
- **Dual Mode Serving**: Development mode serves from Vite dev server, production serves built files
- **Responsive Design**: Mobile-first design with modern CSS and animations

## Multi-Event Management System
- **Database-Driven Events**: PostgreSQL-based event storage with full CRUD operations
- **Admin Interface**: Password-protected admin panel at `/admin` for event management
- **Dynamic Event Switching**: Real-time event switching without server restart
- **Event Status Tracking**: Automatic status calculation (upcoming/active/completed)
- **Data Association**: All statistics automatically linked to active events
- **Migration Support**: Automatic migration of legacy data to multi-event system

## Code Guidelines
- Use TypeScript for all source code (both frontend and backend)
- Follow SolidJS patterns and reactivity principles for frontend development
- Use Vite for all frontend build processes and development
- Follow Discord.js v14+ patterns and best practices
- Implement proper error handling and logging throughout
- Use PostgreSQL for all data persistence with proper migrations
- Create responsive components with mobile-first approach
- Focus on performance and reliability for continuous monitoring
- Implement proper environment variable configuration
- Use the Event system from `src/types/events.ts` for all event-related operations
- Design for containers: all development and production runs in Docker containers
- Ensure PWA compatibility with proper service worker implementation

## Key Components
- **Discord Bot**: Real-time monitoring of server activity (`src/bot.ts`)
- **Event Management**: Multi-event system (`src/types/events.ts`, `src/database/`)
- **Database Layer**: PostgreSQL with migrations and event support (`src/database/`)
- **Web Server**: API endpoints and SPA serving (`src/webServer.ts`)
- **SolidJS Frontend**: Modern reactive frontend (`frontend/src/`)
- **Admin Interface**: Event management UI (`frontend/src/components/AdminAuth.tsx`, `EventManager.tsx`)
- **PWA Infrastructure**: Service worker, manifest, and installation support (`public/`)
- **Docker Infrastructure**: Multi-stage builds with development/production modes

## Frontend Development
- **Entry Point**: `frontend/src/index.tsx` with SolidJS render
- **Main App**: `frontend/src/App.tsx` with routing and state management
- **Stores**: Reactive state management in `frontend/src/stores/`
- **Components**: Modular UI components in `frontend/src/components/`
- **Styling**: Component-specific CSS with global styles
- **Build Output**: Compiled to `public/dist/` for production serving

## Database Architecture
- **Events Table**: Core event storage with guild association
- **Event Association**: All stats tables linked to events via `event_id`
- **Automatic Migration**: Legacy data automatically migrated to multi-event system
- **Admin Operations**: Full CRUD operations for event management
- **Active Event Logic**: Single active event per Discord guild constraint

## Environment Configuration (Legacy Fallback)
While the system now uses database-driven event management, these environment variables serve as fallbacks:
- `EVENT_NAME`: Default event name (default: "Assembly Summer 2025")
- `EVENT_START_DATE`: Default start date in ISO format (default: "2025-07-31T07:00:00Z")
- `EVENT_END_DATE`: Default end date in ISO format (default: "2025-08-03T13:00:00Z")
- `EVENT_TIMEZONE`: Default timezone (default: "Europe/Helsinki")
- `EVENT_DESCRIPTION`: Default description
- `ADMIN_PASSWORD`: Password for admin interface access

## Development Workflow
- **Frontend Development**: `npm run dev:client` for Vite dev server with HMR
- **Backend Development**: `npm run dev:server` for nodemon TypeScript watching
- **Full Development**: `npm run dev` for concurrent frontend and backend development
- **Production Build**: `npm run build` compiles both frontend and backend
- **Container Development**: `make dev` for containerized development environment
- **Container Production**: `make prod` for production container deployment

## PWA Features
- **Service Worker**: Smart caching strategy in `public/sw.js`
- **App Manifest**: Installation metadata in `public/manifest.json`
- **Install Prompts**: Dynamic install button with beforeinstallprompt handling
- **Offline Support**: Graceful degradation when network unavailable
- **Auto-Updates**: Automatic service worker updates with user notification
- **Mobile Optimization**: Touch-friendly interface with app-like experience

## Admin Interface Access
- **URL**: Navigate to `/admin` for event management interface
- **Authentication**: Password-protected with token-based session management
- **Features**: Create, edit, delete, and activate events through intuitive UI
- **Real-time Updates**: Dashboard automatically reflects admin changes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Commit Policy
Follow conventional commit format with clear, descriptive messages:
- **feat**: New features (e.g., "feat: implement SolidJS frontend with reactive stores")
- **fix**: Bug fixes (e.g., "🐛 Fix event switching in admin interface")
- **docs**: Documentation updates
- **style**: UI/UX improvements (e.g., "improve mobile responsiveness in admin panel")
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
- `feat: implement SolidJS frontend with reactive stores and PWA support`
- `feat: add multi-event database system with admin interface`
- `🐛 Fix service worker caching strategy for API endpoints`
- `style: enhance mobile responsiveness and add dark theme support`
- `docs: update README with new SolidJS architecture details`
