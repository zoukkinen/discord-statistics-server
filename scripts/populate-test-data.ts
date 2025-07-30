#!/usr/bin/env ts-node

import { Database } from '../src/database';

// Sample game data for Assembly Summer 2025
const SAMPLE_GAMES = [
    'Counter-Strike 2',
    'League of Legends',
    'Valorant',
    'Rocket League',
    'Overwatch 2',
    'Apex Legends',
    'Dota 2',
    'Call of Duty: Modern Warfare III',
    'Fortnite',
    'Minecraft'
];

// Generate random user IDs
const generateUserId = () => Math.random().toString(36).substring(2, 20);

// Generate timestamps within Assembly event period
const generateEventTimestamp = () => {
    const eventStart = new Date('2025-07-30T00:00:00Z').getTime();
    const eventEnd = new Date('2025-08-03T23:59:59Z').getTime();
    const randomTime = eventStart + Math.random() * (eventEnd - eventStart);
    return new Date(randomTime).toISOString();
};

async function populateTestData() {
    console.log('🎮 Populating test data for Assembly Summer 2025...');
    
    const db = new Database();
    await db.initialize();

    try {
        // 1. Add member statistics over time
        console.log('📊 Adding member statistics...');
        for (let i = 0; i < 50; i++) {
            const timestamp = generateEventTimestamp();
            const totalMembers = 150 + Math.floor(Math.random() * 100); // 150-250 members
            const onlineMembers = Math.floor(totalMembers * (0.3 + Math.random() * 0.4)); // 30-70% online
            
            await db.recordMemberCount(totalMembers, onlineMembers);
        }

        // 2. Add game statistics
        console.log('🎯 Adding game statistics...');
        for (let i = 0; i < 200; i++) {
            const timestamp = generateEventTimestamp();
            const gameName = SAMPLE_GAMES[Math.floor(Math.random() * SAMPLE_GAMES.length)];
            const playerCount = Math.floor(Math.random() * 15) + 1; // 1-15 players per game
            
            await db.recordGameActivity(gameName, playerCount);
        }

        // 3. Add game sessions
        console.log('🎮 Adding game sessions...');
        for (let i = 0; i < 100; i++) {
            const userId = generateUserId();
            const gameName = SAMPLE_GAMES[Math.floor(Math.random() * SAMPLE_GAMES.length)];
            const startTime = generateEventTimestamp();
            
            // Some sessions are completed, some are ongoing
            if (Math.random() > 0.3) {
                // Completed session
                await db.recordGameSession(userId, gameName, 'start');
                await db.recordGameSession(userId, gameName, 'end');
            } else {
                // Ongoing session
                await db.recordGameSession(userId, gameName, 'start');
            }
        }

        console.log('✅ Test data populated successfully!');
        console.log('📈 Added:');
        console.log('  - 50 member statistics entries');
        console.log('  - 200 game activity records');
        console.log('  - 100 game sessions (70% completed, 30% ongoing)');
        console.log('🎮 Games included:');
        SAMPLE_GAMES.forEach(game => console.log(`  - ${game}`));
        
    } catch (error) {
        console.error('❌ Error populating test data:', error);
    } finally {
        await db.close();
    }
}

// Run the script
populateTestData().catch(console.error);
