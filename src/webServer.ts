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
        
        // Serve static files from the build output in development and production
        this.app.use(express.static(path.join(__dirname, '../public')));
        
        // Serve SolidJS build files
        if (process.env.NODE_ENV === 'production') {
            this.app.use('/dist', express.static(path.join(__dirname, '../public/dist')));
        }
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
