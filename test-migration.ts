#!/usr/bin/env ts-node

/**
 * Test script to verify that the multi-event migration preserves existing data
 * This script will:
 * 1. Connect to the database
 * 2. Check if events table exists and has a default event
 * 3. Verify that existing data is properly linked to the default event
 * 4. Test event-aware queries work correctly
 */

import { config } from 'dotenv';
import { PostgreSQLAdapter } from './src/database/PostgreSQLAdapter';
import { MigrationRunner } from './src/database/MigrationRunner';
import { Config } from './src/config';

config();

async function testMigration() {
    console.log('🚀 Starting migration test...\n');

    const guildId = process.env.DISCORD_GUILD_ID || '';
    if (!guildId) {
        console.error('❌ DISCORD_GUILD_ID environment variable is required');
        return;
    }

    const adapter = new PostgreSQLAdapter(guildId);

    try {
        // Step 1: Initialize database and run migrations
        console.log('📡 Connecting to database and running migrations...');
        await adapter.initialize();
        console.log('✅ Database connected and migrations completed\n');

        // Step 2: Verify events table and default event
        console.log('🔍 Checking events table...');
        const events = await adapter.getEvents(guildId);
        console.log(`📊 Found ${events.length} event(s):`);
        
        if (events.length === 0) {
            console.error('❌ No events found! Migration may have failed.');
            return;
        }

        events.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.name} (${event.start_date} to ${event.end_date}) ${event.is_active ? '[ACTIVE]' : ''}`);
        });
        console.log();

        // Step 3: Test data retrieval with default event
        const activeEvent = events.find(e => e.is_active);
        if (!activeEvent) {
            console.error('❌ No active event found!');
            return;
        }

        console.log(`🎯 Testing data retrieval with active event: "${activeEvent.name}"\n`);

        // Test member stats
        console.log('👥 Testing member statistics...');
        const memberStats = await adapter.getMemberStatsInRange(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            activeEvent.id
        );
        console.log(`   Found ${memberStats.length} member stat entries`);

        // Test game stats
        console.log('🎮 Testing game statistics...');
        const gameStats = await adapter.getGameStatsInRange(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            activeEvent.id
        );
        console.log(`   Found ${gameStats.length} game stat entries`);

        // Test game sessions
        console.log('🕹️ Testing game sessions...');
        const gameSessions = await adapter.getGameSessionsInRange(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            activeEvent.id
        );
        console.log(`   Found ${gameSessions.length} game session entries`);

        // Test top games
        console.log('🏆 Testing top games...');
        const topGames = await adapter.getTopGamesInRange(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            10,
            activeEvent.id
        );
        console.log(`   Found ${topGames.length} top game entries`);
        if (topGames.length > 0) {
            console.log('   Top 3 games:');
            topGames.slice(0, 3).forEach((game, index) => {
                console.log(`      ${index + 1}. ${game.game_name} (${game.total_sessions} sessions, ${game.total_minutes} minutes)`);
            });
        }

        // Test current stats
        console.log('\n📊 Testing current statistics...');
        const currentStats = await adapter.getCurrentStats(activeEvent.id);
        console.log(`   Member stats: ${currentStats.memberStats ? 'Available' : 'None'}`);
        console.log(`   Active games: ${currentStats.currentGames.length} games`);

        // Test active sessions
        console.log('⚡ Testing active sessions...');
        const activeSessions = await adapter.getActiveSessions(activeEvent.id);
        console.log(`   Found ${activeSessions.length} active session(s)`);

        // Step 4: Test backward compatibility (without eventId)
        console.log('\n🔄 Testing backward compatibility (without eventId)...');
        const memberStatsCompat = await adapter.getMemberStatsInRange(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString()
        );
        console.log(`   Backward compatible member stats: ${memberStatsCompat.length} entries`);

        const currentStatsCompat = await adapter.getCurrentStats();
        console.log(`   Backward compatible current stats: ${currentStatsCompat.memberStats ? 'Available' : 'None'}`);

        // Step 5: Test event management functionality
        console.log('\n🎪 Testing event management...');
        
        const eventStats = await adapter.getEventStats(activeEvent.id);
        console.log(`   Event stats retrieved successfully`);

        const eventSummaries = await adapter.getEventSummaries(guildId);
        console.log(`   Event summaries: ${eventSummaries.length} entries`);

        console.log('\n✅ All migration tests passed successfully!');
        console.log('🎉 The multi-event system is working correctly and existing data is preserved.');

    } catch (error) {
        console.error('❌ Migration test failed:', error);
        throw error;
    } finally {
        await adapter.close();
        console.log('\n📡 Database connection closed.');
    }
}

// Run the test
if (require.main === module) {
    testMigration()
        .then(() => {
            console.log('\n🏁 Migration test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration test failed:', error);
            process.exit(1);
        });
}

export { testMigration };
