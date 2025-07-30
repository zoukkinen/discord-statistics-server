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
        this.app.use(express.static(path.join(__dirname, '../public')));
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
                    const history = await this.database.getMemberStatsHistoryByDateRange(start, end);
                    res.json(history);
                } else {
                    // Fallback to hours-based query
                    const hours = parseInt(req.query.hours as string) || 24;
                    const history = await this.database.getMemberStatsHistory(hours);
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
                const history = await this.database.getGameStatsHistory(hours);
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
                    const topGames = await this.database.getTopGamesByDateRange(start, end, limit);
                    res.json(topGames);
                } else {
                    // Fallback to hours-based query
                    const hours = parseInt(req.query.hours as string) || 24;
                    const topGames = await this.database.getTopGames(hours, limit);
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
                const activity = await this.database.getRecentGameActivity(limit);
                res.json(activity);
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
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
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
