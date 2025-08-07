import express from 'express';
import cors from 'cors';
import path from 'path';
import { Database } from './database';
import { Config } from './config';

export class WebServer {
    private app: express.Application;
    private server: any;
    private database: Database;
    private port: number;

    constructor(database: Database) {
        this.app = express();
        this.database = database;
        this.port = parseInt(process.env.PORT || process.env.WEB_PORT || '3000');
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Set correct MIME types for PWA files
        this.app.use('/sw.js', (req, res, next) => {
            res.type('application/javascript');
            next();
        });
        
        this.app.use('/manifest.json', (req, res, next) => {
            res.type('application/json');
            next();
        });
        
        // Serve PWA files from public root (both dev and prod need these)
        this.app.use('/sw.js', express.static(path.join(__dirname, '../public/sw.js')));
        this.app.use('/manifest.json', express.static(path.join(__dirname, '../public/manifest.json')));
        
        // Serve static files from the SolidJS build output
        if (process.env.NODE_ENV === 'production') {
            // In production, serve the built SolidJS files
            this.app.use(express.static(path.join(__dirname, '../public/dist')));
        } else {
            // In development, serve from public directory (for backwards compatibility)
            this.app.use(express.static(path.join(__dirname, '../public')));
        }
    }

    private transformEventToCamelCase(event: any) {
        return {
            id: event.id,
            name: event.name,
            startDate: event.start_date,
            endDate: event.end_date,
            timezone: event.timezone,
            description: event.description,
            guildId: event.guild_id,
            isActive: event.is_active,
            createdAt: event.created_at,
            updatedAt: event.updated_at
        };
    }

    private transformEventSummaryToCamelCase(summary: any) {
        return {
            id: summary.id,
            name: summary.name,
            description: summary.description,
            startDate: summary.start_date,
            endDate: summary.end_date,
            timezone: summary.timezone,
            isActive: summary.is_active,
            createdAt: summary.created_at,
            uniquePlayers: summary.unique_players,
            uniqueGames: summary.unique_games,
            totalSessions: summary.total_sessions,
            totalMinutes: summary.total_minutes
        };
    }

    private setupRoutes(): void {
        // API Routes
        this.app.get('/api/current', async (req, res) => {
            try {
                const stats = await this.database.getCurrentStats();
                res.json(stats);
            } catch (error) {
                console.error('Error fetching current stats:', error);
                res.status(500).json({ error: 'Failed to fetch current stats' });
            }
        });

        this.app.get('/api/member-history', async (req, res) => {
            try {
                const start = req.query.start as string;
                const end = req.query.end as string;
                
                if (start && end) {
                    // Use date range query
                    const history = await this.database.getMemberStatsInRange(start, end);
                    res.json(history);
                } else {
                    // Fallback to hours-based query
                    const hours = parseInt(req.query.hours as string) || 24;
                    const endDate = new Date().toISOString();
                    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
                    const history = await this.database.getMemberStatsInRange(startDate, endDate);
                    res.json(history);
                }
            } catch (error) {
                console.error('Error fetching member history:', error);
                res.status(500).json({ error: 'Failed to fetch member history' });
            }
        });

        this.app.get('/api/game-history', async (req, res) => {
            try {
                const hours = parseInt(req.query.hours as string) || 24;
                const endDate = new Date().toISOString();
                const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
                const history = await this.database.getGameStatsInRange(startDate, endDate);
                res.json(history);
            } catch (error) {
                console.error('Error fetching game history:', error);
                res.status(500).json({ error: 'Failed to fetch game history' });
            }
        });

        this.app.get('/api/top-games', async (req, res) => {
            try {
                const start = req.query.start as string;
                const end = req.query.end as string;
                const limit = parseInt(req.query.limit as string) || 10;
                
                if (start && end) {
                    // Use date range query
                    const topGames = await this.database.getTopGamesInRange(start, end, limit);
                    res.json(topGames);
                } else {
                    // Default to event period instead of last 24 hours
                    const { start: eventStart, end: eventEnd } = Config.getEventDateRange();
                    const topGames = await this.database.getTopGamesInRange(eventStart, eventEnd, limit);
                    res.json(topGames);
                }
            } catch (error) {
                console.error('Error fetching top games:', error);
                res.status(500).json({ error: 'Failed to fetch top games' });
            }
        });

        this.app.get('/api/recent-activity', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit as string) || 20;
                // Get activity from last 24 hours
                const endDate = new Date().toISOString();
                const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const activity = await this.database.getUserActivity(startDate, endDate);
                
                // Apply limit if specified (get most recent entries)
                const limitedActivity = limit && limit > 0 ? activity.slice(-limit) : activity;
                res.json(limitedActivity);
            } catch (error) {
                console.error('Error fetching recent activity:', error);
                res.status(500).json({ error: 'Failed to fetch recent activity' });
            }
        });

        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Event Management API Endpoints
        
        // Get all events
        this.app.get('/api/events', async (req, res) => {
            try {
                const guildId = process.env.DISCORD_GUILD_ID;
                if (!guildId) {
                    return res.status(500).json({ error: 'Discord Guild ID not configured' });
                }
                
                const events = await this.database.getEvents(guildId);
                const transformedEvents = events.map(event => this.transformEventToCamelCase(event));
                res.json(transformedEvents);
            } catch (error) {
                console.error('Error fetching events:', error);
                res.status(500).json({ error: 'Failed to fetch events' });
            }
        });

        // Get active event
        this.app.get('/api/events/active', async (req, res) => {
            try {
                const guildId = process.env.DISCORD_GUILD_ID;
                if (!guildId) {
                    return res.status(500).json({ error: 'Discord Guild ID not configured' });
                }
                
                const activeEvent = await this.database.getActiveEvent(guildId);
                if (!activeEvent) {
                    return res.status(404).json({ error: 'No active event found' });
                }
                
                res.json(this.transformEventToCamelCase(activeEvent));
            } catch (error) {
                console.error('Error fetching active event:', error);
                res.status(500).json({ error: 'Failed to fetch active event' });
            }
        });

        // Create new event
        this.app.post('/api/events', async (req, res) => {
            try {
                const guildId = process.env.DISCORD_GUILD_ID;
                if (!guildId) {
                    return res.status(500).json({ error: 'Discord Guild ID not configured' });
                }

                const { name, startDate, endDate, timezone, description } = req.body;
                
                // Validate required fields
                if (!name || !startDate || !endDate) {
                    return res.status(400).json({ 
                        error: 'Missing required fields: name, startDate, endDate' 
                    });
                }

                // Validate dates
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return res.status(400).json({ error: 'Invalid date format' });
                }
                
                if (start >= end) {
                    return res.status(400).json({ error: 'Start date must be before end date' });
                }

                const eventData = {
                    name: name.trim(),
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    timezone: timezone || 'UTC',
                    description: description?.trim() || null,
                    guildId,
                    isActive: false // New events are created inactive by default
                };

                const newEvent = await this.database.createEvent(eventData);
                
                console.log(`📅 New event created: "${newEvent.name}" (ID: ${newEvent.id})`);
                res.status(201).json(newEvent);
            } catch (error) {
                console.error('Error creating event:', error);
                res.status(500).json({ error: 'Failed to create event' });
            }
        });

        // Update event
        this.app.put('/api/events/:id', async (req, res) => {
            try {
                const eventId = parseInt(req.params.id);
                if (isNaN(eventId)) {
                    return res.status(400).json({ error: 'Invalid event ID' });
                }

                const { name, startDate, endDate, timezone, description } = req.body;
                
                // Validate dates if provided
                if (startDate || endDate) {
                    const start = startDate ? new Date(startDate) : null;
                    const end = endDate ? new Date(endDate) : null;
                    
                    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
                        return res.status(400).json({ error: 'Invalid date format' });
                    }
                    
                    if (start && end && start >= end) {
                        return res.status(400).json({ error: 'Start date must be before end date' });
                    }
                }

                const updateData: any = {};
                if (name !== undefined) updateData.name = name.trim();
                if (startDate !== undefined) updateData.startDate = new Date(startDate).toISOString();
                if (endDate !== undefined) updateData.endDate = new Date(endDate).toISOString();
                if (timezone !== undefined) updateData.timezone = timezone;
                if (description !== undefined) updateData.description = description?.trim() || null;

                await this.database.updateEvent(eventId, updateData);
                const updatedEvent = await this.database.getEvent(eventId);
                
                if (!updatedEvent) {
                    return res.status(404).json({ error: 'Event not found' });
                }
                
                console.log(`📅 Event updated: "${updatedEvent.name}" (ID: ${eventId})`);
                res.json(updatedEvent);
            } catch (error) {
                console.error('Error updating event:', error);
                res.status(500).json({ error: 'Failed to update event' });
            }
        });

        // Set active event
        this.app.post('/api/events/:id/activate', async (req, res) => {
            try {
                const eventId = parseInt(req.params.id);
                if (isNaN(eventId)) {
                    return res.status(400).json({ error: 'Invalid event ID' });
                }

                const guildId = process.env.DISCORD_GUILD_ID;
                if (!guildId) {
                    return res.status(500).json({ error: 'Discord Guild ID not configured' });
                }

                await this.database.setActiveEvent(guildId, eventId);
                const activeEvent = await this.database.getEvent(eventId);
                
                if (!activeEvent) {
                    return res.status(404).json({ error: 'Event not found' });
                }
                
                console.log(`🎯 Event activated: "${activeEvent.name}" (ID: ${eventId})`);
                res.json(activeEvent);
            } catch (error) {
                console.error('Error activating event:', error);
                res.status(500).json({ error: 'Failed to activate event' });
            }
        });

        // Get event summaries (for history view)
        this.app.get('/api/events/summaries', async (req, res) => {
            try {
                const guildId = process.env.DISCORD_GUILD_ID;
                if (!guildId) {
                    return res.status(500).json({ error: 'Discord Guild ID not configured' });
                }
                
                const summaries = await this.database.getEventSummaries(guildId);
                const transformedSummaries = summaries.map(summary => this.transformEventSummaryToCamelCase(summary));
                res.json(transformedSummaries);
            } catch (error) {
                console.error('Error fetching event summaries:', error);
                res.status(500).json({ error: 'Failed to fetch event summaries' });
            }
        });

        // Get statistics for a specific event
        this.app.get('/api/events/:id/stats', async (req, res) => {
            try {
                const eventId = parseInt(req.params.id);
                if (isNaN(eventId)) {
                    return res.status(400).json({ error: 'Invalid event ID' });
                }

                const stats = await this.database.getEventStats(eventId);
                res.json(stats);
            } catch (error) {
                console.error('Error fetching event stats:', error);
                res.status(500).json({ error: 'Failed to fetch event stats' });
            }
        });

        // Event configuration endpoint
        this.app.get('/api/config', (req, res) => {
            try {
                const config = Config.getEventConfig();
                res.json({
                    event: config,
                    isEventActive: Config.isEventActive(),
                    hasEventStarted: Config.hasEventStarted()
                });
            } catch (error) {
                console.error('Error fetching config:', error);
                res.status(500).json({ error: 'Failed to fetch config' });
            }
        });

        // Serve the main dashboard page
        this.app.get('/', (req, res) => {
            if (process.env.NODE_ENV === 'production') {
                // In production, serve the SolidJS build
                res.sendFile(path.join(__dirname, '../public/dist/index.html'));
            } else {
                // In development, serve the original index.html with SolidJS dev server
                res.sendFile(path.join(__dirname, '../frontend/index.html'));
            }
        });

        // 404 handler
        this.app.use((req, res) => {
            // For non-API routes, serve the main app (SPA routing)
            if (!req.path.startsWith('/api/')) {
                if (process.env.NODE_ENV === 'production') {
                    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
                } else {
                    res.sendFile(path.join(__dirname, '../frontend/index.html'));
                }
            } else {
                res.status(404).json({ error: 'API endpoint not found' });
            }
        });
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`🌐 Web server running on http://localhost:${this.port}`);
                resolve();
            });

            this.server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${this.port} is already in use`);
                } else {
                    console.error('❌ Web server error:', error);
                }
                reject(error);
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('✅ Web server stopped');
                    resolve();
                });
            });
        }
    }
}
