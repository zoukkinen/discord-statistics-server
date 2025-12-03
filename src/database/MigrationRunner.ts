import { readFileSync } from 'fs';
import { join } from 'path';
import { Client, PoolClient } from 'pg';

export class MigrationRunner {
    private client: Client | PoolClient;
    private guildId: string;

    constructor(client: Client | PoolClient, guildId: string) {
        this.client = client;
        this.guildId = guildId;
    }

    async runMigrations(): Promise<void> {
        console.log('🔄 Running database migrations...');
        
        // Create migrations tracking table
        await this.createMigrationTable();
        
        // Run migration 001 - Add events table
        await this.runMigration001();
        
        // Run migration 002 - Add Discord credentials
        await this.runMigration002();
        
        console.log('✅ All migrations completed successfully');
    }

    private async createMigrationTable(): Promise<void> {
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration_name TEXT NOT NULL UNIQUE,
                executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    private async runMigration001(): Promise<void> {
        const migrationName = '001_add_events_table';
        
        // Check if migration already executed
        const existingMigration = await this.client.query(
            'SELECT id FROM migrations WHERE migration_name = $1',
            [migrationName]
        );

        if (existingMigration.rows.length > 0) {
            console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
            return;
        }

        try {
            console.log(`🔄 Running migration: ${migrationName}`);
            
            // Read and execute the migration file
            const migrationPath = join(__dirname, 'migrations', '001_add_events_table.sql');
            const migrationSQL = readFileSync(migrationPath, 'utf8');
            
            // Execute the migration SQL
            await this.client.query(migrationSQL);
            
            // Now run the data migration function with environment variables
            const eventName = process.env.EVENT_NAME || 'Assembly Summer 2025';
            const startDate = process.env.EVENT_START_DATE || '2025-07-31T07:00:00Z';
            const endDate = process.env.EVENT_END_DATE || '2025-08-03T13:00:00Z';
            const timezone = process.env.EVENT_TIMEZONE || 'Europe/Helsinki';
            const description = process.env.EVENT_DESCRIPTION || 'Discord activity tracking for Assembly Summer 2025';

            console.log(`🔄 Migrating existing data to event: "${eventName}"`);
            
            const result = await this.client.query(`
                SELECT migrate_existing_data_to_events($1, $2, $3, $4, $5, $6) as event_id
            `, [this.guildId, eventName, startDate, endDate, timezone, description]);

            const eventId = result.rows[0]?.event_id;
            
            if (eventId) {
                console.log(`✅ Created/updated event with ID: ${eventId}`);
                console.log(`📊 All existing data now linked to: "${eventName}"`);
            }

            // Record successful migration
            await this.client.query(
                'INSERT INTO migrations (migration_name) VALUES ($1)',
                [migrationName]
            );

            console.log(`✅ Migration ${migrationName} completed successfully`);

        } catch (error) {
            console.error(`❌ Migration ${migrationName} failed:`, error);
            throw error;
        }
    }

    private async runMigration002(): Promise<void> {
        const migrationName = '002_add_discord_credentials';
        
        // Check if migration already executed
        const existingMigration = await this.client.query(
            'SELECT id FROM migrations WHERE migration_name = $1',
            [migrationName]
        );

        if (existingMigration.rows.length > 0) {
            console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
            return;
        }

        try {
            console.log(`🔄 Running migration: ${migrationName}`);
            
            // Read and execute the migration file
            const migrationPath = join(__dirname, 'migrations', '002_add_discord_credentials.sql');
            const migrationSQL = readFileSync(migrationPath, 'utf8');
            
            // Execute the migration SQL
            await this.client.query(migrationSQL);

            // Record successful migration
            await this.client.query(
                'INSERT INTO migrations (migration_name) VALUES ($1)',
                [migrationName]
            );

            console.log(`✅ Migration ${migrationName} completed successfully`);
            console.log(`🔐 Discord credentials fields added to events table`);

        } catch (error) {
            console.error(`❌ Migration ${migrationName} failed:`, error);
            throw error;
        }
    }
}
