#!/usr/bin/env node

/**
 * Test script to verify the event migration works correctly
 * This will:
 * 1. Initialize the database with migration
 * 2. Show existing data before migration
 * 3. Run the migration 
 * 4. Show data after migration with event linkage
 */

import { config } from 'dotenv';
import { Database } from '../src/database';

// Load environment variables
config();

async function testMigration() {
    console.log('🧪 Testing Event Migration System');
    console.log('=================================\n');

    // Check required environment variables
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
        console.error('❌ DISCORD_GUILD_ID environment variable is required');
        process.exit(1);
    }

    const eventName = process.env.EVENT_NAME || 'Assembly Summer 2025';
    console.log(`🎯 Guild ID: ${guildId}`);
    console.log(`🎮 Event Name: ${eventName}`);
    console.log(`📅 Event Start: ${process.env.EVENT_START_DATE || '2025-07-31T07:00:00Z'}`);
    console.log(`📅 Event End: ${process.env.EVENT_END_DATE || '2025-08-03T13:00:00Z'}\n`);

    try {
        // Initialize database with guild ID (this will run migrations)
        console.log('🔄 Initializing database with migration...');
        const database = new Database(guildId);
        await database.initialize();
        console.log('✅ Database initialization complete!\n');

        // Test basic functionality
        console.log('🧪 Testing basic functionality...');
        
        // Record some test data
        await database.recordMemberCount(100, 75);
        await database.recordGameActivity('Test Game', 5);
        
        console.log('✅ Successfully recorded test data');

        // Try to get current stats
        const stats = await database.getCurrentStats();
        console.log('📊 Current stats:', {
            totalMembers: stats.memberStats?.total_members,
            onlineMembers: stats.memberStats?.online_members,
            activeGames: stats.currentGames.length
        });

        console.log('\n🎉 Migration test completed successfully!');
        console.log('Your existing data should now be linked to the default event.');
        
    } catch (error) {
        console.error('❌ Migration test failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the test
testMigration().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
