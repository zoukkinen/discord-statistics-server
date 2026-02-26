import { readFileSync } from "fs";
import { join } from "path";
import { Client, PoolClient } from "pg";

export class MigrationRunner {
  private client: Client | PoolClient;
  private guildId: string;

  constructor(client: Client | PoolClient, guildId: string) {
    this.client = client;
    this.guildId = guildId;
  }

  async runMigrations(): Promise<void> {
    console.log("🔄 Running database migrations...");

    // Create migrations tracking table
    await this.createMigrationTable();

    // Run migration 001 - Add events table
    await this.runMigration001();

    // Run migration 002 - Add Discord credentials
    await this.runMigration002();

    // Run migration 003 - Add is_hidden field
    await this.runMigration003();

    // Run migration 004 - Add session management fields
    await this.runMigration004();

    // Always ensure at least one event exists for the guild (idempotent)
    await this.ensureEventExists();

    console.log("✅ All migrations completed successfully");
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
    const migrationName = "001_add_events_table";

    // Check if migration already executed
    const existingMigration = await this.client.query(
      "SELECT id FROM migrations WHERE migration_name = $1",
      [migrationName],
    );

    if (existingMigration.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
      return;
    }

    try {
      console.log(`🔄 Running migration: ${migrationName}`);

      // Read and execute the migration file
      const migrationPath = join(
        __dirname,
        "migrations",
        "001_add_events_table.sql",
      );
      const migrationSQL = readFileSync(migrationPath, "utf8");

      // Execute the migration SQL
      await this.client.query(migrationSQL);

      // Now run the data migration function with environment variables
      const eventName = process.env.EVENT_NAME || "Assembly Summer 2025";
      const startDate = process.env.EVENT_START_DATE || "2025-07-31T07:00:00Z";
      const endDate = process.env.EVENT_END_DATE || "2025-08-03T13:00:00Z";
      const timezone = process.env.EVENT_TIMEZONE || "Europe/Helsinki";
      const description =
        process.env.EVENT_DESCRIPTION ||
        "Discord activity tracking for Assembly Summer 2025";

      console.log(`🔄 Migrating existing data to event: "${eventName}"`);

      const result = await this.client.query(
        `
                SELECT migrate_existing_data_to_events($1, $2, $3, $4, $5, $6) as event_id
            `,
        [this.guildId, eventName, startDate, endDate, timezone, description],
      );

      const eventId = result.rows[0]?.event_id;

      if (eventId) {
        console.log(`✅ Created/updated event with ID: ${eventId}`);
        console.log(`📊 All existing data now linked to: "${eventName}"`);
      }

      // Record successful migration
      await this.client.query(
        "INSERT INTO migrations (migration_name) VALUES ($1)",
        [migrationName],
      );

      console.log(`✅ Migration ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async runMigration002(): Promise<void> {
    const migrationName = "002_add_discord_credentials";

    // Check if migration already executed
    const existingMigration = await this.client.query(
      "SELECT id FROM migrations WHERE migration_name = $1",
      [migrationName],
    );

    if (existingMigration.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
      return;
    }

    try {
      console.log(`🔄 Running migration: ${migrationName}`);

      // Read and execute the migration file
      const migrationPath = join(
        __dirname,
        "migrations",
        "002_add_discord_credentials.sql",
      );
      const migrationSQL = readFileSync(migrationPath, "utf8");

      // Execute the migration SQL
      await this.client.query(migrationSQL);

      // Record successful migration
      await this.client.query(
        "INSERT INTO migrations (migration_name) VALUES ($1)",
        [migrationName],
      );

      console.log(`✅ Migration ${migrationName} completed successfully`);
      console.log(`🔐 Discord credentials fields added to events table`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async runMigration003(): Promise<void> {
    const migrationName = "003_add_is_hidden_field";

    // Check if migration already executed
    const existingMigration = await this.client.query(
      "SELECT id FROM migrations WHERE migration_name = $1",
      [migrationName],
    );

    if (existingMigration.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
      return;
    }

    try {
      console.log(`🔄 Running migration: ${migrationName}`);

      // Read and execute the migration file
      const migrationPath = join(
        __dirname,
        "migrations",
        "003_add_is_hidden_field.sql",
      );
      const migrationSQL = readFileSync(migrationPath, "utf8");

      // Execute the migration SQL
      await this.client.query(migrationSQL);

      // Record successful migration
      await this.client.query(
        "INSERT INTO migrations (migration_name) VALUES ($1)",
        [migrationName],
      );

      console.log(`✅ Migration ${migrationName} completed successfully`);
      console.log(`👁️  is_hidden field added to events table`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async runMigration004(): Promise<void> {
    const migrationName = "004_add_session_management_fields";

    const existingMigration = await this.client.query(
      "SELECT id FROM migrations WHERE migration_name = $1",
      [migrationName],
    );

    if (existingMigration.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already executed, skipping`);
      return;
    }

    try {
      console.log(`🔄 Running migration: ${migrationName}`);

      const migrationPath = join(
        __dirname,
        "migrations",
        "004_add_session_management_fields.sql",
      );
      const migrationSQL = readFileSync(migrationPath, "utf8");

      await this.client.query(migrationSQL);

      await this.client.query(
        "INSERT INTO migrations (migration_name) VALUES ($1)",
        [migrationName],
      );

      console.log(`✅ Migration ${migrationName} completed successfully`);
      console.log(
        `🗂️  game_name_alias and is_removed fields added to game_sessions`,
      );
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  /**
   * Ensures at least one event exists for the guild.
   * Runs on every startup after migrations so the bot always has an event to record to,
   * even if the DB was partially reset or the guild ID changed.
   */
  private async ensureEventExists(): Promise<void> {
    const guildId = this.guildId;

    const existing = await this.client.query(
      "SELECT id FROM events WHERE guild_id = $1 LIMIT 1",
      [guildId],
    );

    if (existing.rows.length > 0) {
      const active = await this.client.query(
        "SELECT id FROM events WHERE guild_id = $1 AND is_active = true LIMIT 1",
        [guildId],
      );
      if (active.rows.length === 0) {
        // Events exist but none active — activate the most recent one
        await this.client.query(
          `UPDATE events SET is_active = true
           WHERE id = (SELECT id FROM events WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1)`,
          [guildId],
        );
        console.log(`⚡ Activated most recent event for guild ${guildId}`);
      }
      return;
    }

    // No events at all — create a default one from env vars
    const eventName = process.env.EVENT_NAME || "Local Dev Event";
    const startDate = process.env.EVENT_START_DATE || new Date().toISOString();
    const endDate =
      process.env.EVENT_END_DATE ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const timezone = process.env.EVENT_TIMEZONE || "UTC";
    const description =
      process.env.EVENT_DESCRIPTION || "Auto-created default event";

    await this.client.query(
      `INSERT INTO events (name, start_date, end_date, timezone, description, guild_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [eventName, startDate, endDate, timezone, description, guildId],
    );

    console.log(`✅ Created default event "${eventName}" for guild ${guildId}`);
  }
}
