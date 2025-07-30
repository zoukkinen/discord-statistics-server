import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { Database } from './database';
import { WebServer } from './webServer';
import dotenv from 'dotenv';

dotenv.config();

export class DiscordActivityBot {
    private client: Client;
    private database: Database;
    private webServer: WebServer;
    private guildId: string;
    private statsInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences
            ]
        });
        
        this.database = new Database();
        this.webServer = new WebServer(this.database);
        this.guildId = process.env.DISCORD_GUILD_ID || '';
        
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.once('ready', () => {
            console.log(`✅ Bot is ready! Logged in as ${this.client.user?.tag}`);
            this.startStatsCollection();
        });

        this.client.on('guildMemberAdd', (member) => {
            console.log(`📈 Member joined: ${member.user.tag}`);
            this.collectCurrentStats();
        });

        this.client.on('guildMemberRemove', (member) => {
            console.log(`📉 Member left: ${member.user.tag}`);
            this.collectCurrentStats();
        });

        this.client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (newPresence?.guild?.id === this.guildId) {
                this.handlePresenceUpdate(oldPresence, newPresence);
            }
        });

        process.on('SIGINT', () => {
            console.log('🔄 Shutting down gracefully...');
            this.shutdown();
        });

        process.on('SIGTERM', () => {
            console.log('🔄 Shutting down gracefully...');
            this.shutdown();
        });
    }

    private handlePresenceUpdate(oldPresence: any, newPresence: any): void {
        const oldGame = oldPresence?.activities?.find((activity: any) => activity.type === ActivityType.Playing);
        const newGame = newPresence?.activities?.find((activity: any) => activity.type === ActivityType.Playing);

        // If user started playing a new game
        if (newGame && (!oldGame || oldGame.name !== newGame.name)) {
            this.database.recordGameSession(newPresence.userId, newGame.name, 'start');
            console.log(`🎮 ${newPresence.user?.tag} started playing ${newGame.name}`);
        }

        // If user stopped playing a game
        if (oldGame && (!newGame || newGame.name !== oldGame.name)) {
            this.database.recordGameSession(newPresence.userId, oldGame.name, 'end');
            console.log(`🎮 ${newPresence.user?.tag} stopped playing ${oldGame.name}`);
        }
    }

    private startStatsCollection(): void {
        // Collect stats immediately
        this.collectCurrentStats();
        
        // Then collect every 5 minutes
        this.statsInterval = setInterval(() => {
            this.collectCurrentStats();
        }, 5 * 60 * 1000);

        console.log('📊 Started automatic stats collection (every 5 minutes)');
    }

    private async collectCurrentStats(): Promise<void> {
        try {
            const guild = this.client.guilds.cache.get(this.guildId);
            if (!guild) {
                console.error('❌ Guild not found!');
                return;
            }

            // Force fetch all members to get accurate count
            await guild.members.fetch();
            
            const totalMembers = guild.memberCount;
            const onlineMembers = guild.members.cache.filter(member => 
                member.presence?.status === 'online' || 
                member.presence?.status === 'idle' || 
                member.presence?.status === 'dnd'
            ).size;

            // Count members playing games
            const playingGames = new Map<string, number>();
            guild.members.cache.forEach(member => {
                const game = member.presence?.activities?.find(activity => activity.type === ActivityType.Playing);
                if (game) {
                    playingGames.set(game.name, (playingGames.get(game.name) || 0) + 1);
                }
            });

            // Save to database
            await this.database.recordMemberCount(totalMembers, onlineMembers);
            
            for (const [gameName, playerCount] of playingGames) {
                await this.database.recordGameActivity(gameName, playerCount);
            }

            console.log(`📊 Stats collected: ${onlineMembers}/${totalMembers} members online, ${playingGames.size} different games being played`);
            
        } catch (error) {
            console.error('❌ Error collecting stats:', error);
        }
    }

    public async start(): Promise<void> {
        try {
            await this.database.initialize();
            await this.webServer.start();
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            process.exit(1);
        }
    }

    private async shutdown(): Promise<void> {
        console.log('🔄 Shutting down Discord Activity Bot...');
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        this.client.destroy();
        await this.webServer.stop();
        await this.database.close();
        
        console.log('✅ Shutdown complete');
        process.exit(0);
    }
}
