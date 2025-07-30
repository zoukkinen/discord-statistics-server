import { DiscordActivityBot } from './bot';

console.log('🚀 Starting Discord Activity Tracker for Assembly Summer 2025...');
console.log('📅 July 30, 2025');

const bot = new DiscordActivityBot();

bot.start().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
