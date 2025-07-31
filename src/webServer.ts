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
                    // Fallback to hours-based query
                    const hours = parseInt(req.query.hours as string) || 24;
                    const endDate = new Date().toISOString();
                    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
                    const topGames = await this.database.getTopGamesInRange(startDate, endDate, limit);
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

        // Config endpoint for frontend
        this.app.get('/api/config', async (req, res) => {
            try {
                const config = {
                    name: process.env.EVENT_NAME || 'Assembly Summer 2025',
                    start_date: process.env.EVENT_START_DATE || '2025-07-31T00:00:00+03:00',
                    end_date: process.env.EVENT_END_DATE || '2025-08-03T23:59:59+03:00',
                    timezone: process.env.EVENT_TIMEZONE || 'Europe/Helsinki',
                    description: process.env.EVENT_DESCRIPTION || 'Finland\'s biggest computer festival and digital culture event'
                };
                res.json(config);
            } catch (error) {
                console.error('Error fetching config:', error);
                res.status(500).json({ error: 'Failed to fetch configuration' });
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

        // Catch-all handler for SPA routing
        this.app.get('*', (req, res) => {
            // Don't intercept API routes
            if (req.path.startsWith('/api/')) {
                res.status(404).json({ error: 'API endpoint not found' });
                return;
            }
            
            // Serve the main app for all other routes (SPA routing)
            if (process.env.NODE_ENV === 'production') {
                res.sendFile(path.join(__dirname, '../public/dist/index.html'));
            } else {
                res.sendFile(path.join(__dirname, '../frontend/index.html'));
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
