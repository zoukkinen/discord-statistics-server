import { DiscordActivityBot } from './bot';
import { Config } from './config';

const eventConfig = Config.getEventConfig();
console.log(`🚀 Starting Discord Activity Tracker for ${eventConfig.name}...`);
console.log(`📅 ${new Date().toLocaleDateString()}`);

const bot = new DiscordActivityBot();

bot.start().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
