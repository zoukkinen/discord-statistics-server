// Global setup for Jest test suite
import { Client } from "pg";

export default async function globalSetup() {
  console.log("🔧 Setting up test environment...");

  // Create test database if it doesn't exist
  // Use DATABASE_URL if available, otherwise construct from individual vars
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    const dbUser = process.env.DB_USER || "postgres";
    const dbPassword = process.env.DB_PASSWORD || "postgres";
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`;
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const dbName = process.env.DB_NAME || "discord_stats_test";

    // Check if test database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📊 Creating test database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
    }

    console.log("✅ Test environment setup complete");
  } catch (error) {
    console.warn(
      "⚠️  Could not set up test database:",
      error instanceof Error ? error.message : String(error)
    );
    console.log("Tests will attempt to use existing database configuration");
  } finally {
    await client.end();
  }
}
