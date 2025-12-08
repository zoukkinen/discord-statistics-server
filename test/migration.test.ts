/**
 * Comprehensive migration test for the multi-event system
 * This test verifies that database migrations work correctly and
 * that the new Discord credentials functionality is properly integrated
 */

import { config } from "dotenv";
import { PostgreSQLAdapter } from "../src/database/PostgreSQLAdapter";
import { CredentialEncryption } from "../src/utils/credentialEncryption";

// Load environment variables
// Try .env.test first (local development), fall back to .env (CI)
config({ path: ".env.test" });
config({ path: ".env" });

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

class MigrationTester {
  private adapter: PostgreSQLAdapter;
  private testGuildId: string;
  private results: TestResult[] = [];

  constructor() {
    this.testGuildId =
      process.env.DISCORD_GUILD_ID || "migration-test-guild-123";
    this.adapter = new PostgreSQLAdapter(this.testGuildId);
  }

  private addResult(passed: boolean, message: string, details?: any) {
    this.results.push({ passed, message, details });
    const status = passed ? "✅" : "❌";
    console.log(`${status} ${message}`);
    if (details && process.env.VERBOSE_TESTS) {
      console.log("   Details:", details);
    }
  }

  async runAllTests(): Promise<boolean> {
    console.log("🚀 Starting comprehensive migration tests...\n");

    try {
      await this.testDatabaseConnection();
      await this.testMigrationExecution();
      await this.testDiscordCredentials();
      await this.testDataOperations();
      await this.testBackwardCompatibility();
      await this.testEventManagement();
      await this.testErrorHandling();

      const passedCount = this.results.filter((r) => r.passed).length;
      const totalCount = this.results.length;

      console.log(`\n📊 Test Results: ${passedCount}/${totalCount} passed`);

      if (passedCount === totalCount) {
        console.log("🎉 All migration tests passed successfully!");
        return true;
      } else {
        console.log("❌ Some tests failed. Check the output above.");
        return false;
      }
    } catch (error) {
      console.error("💥 Critical test failure:", error);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log("🔌 Testing database connection...");

    try {
      await this.adapter.initialize();
      this.addResult(true, "Database connection established");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Database connection failed", errorMessage);
      throw error;
    }
  }

  private async testMigrationExecution(): Promise<void> {
    console.log("\n🔄 Testing migration execution...");

    try {
      // Check if migrations table exists
      const migrationResult = await this.adapter.query(
        "SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 5"
      );

      this.addResult(true, "Migrations table accessible");
      this.addResult(
        migrationResult.rows.length > 0,
        `Found ${migrationResult.rows.length} executed migrations`,
        migrationResult.rows.map((r: any) => r.migration_name)
      );

      // Check if events table exists with new columns
      const eventsTableInfo = await this.adapter.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        ORDER BY ordinal_position
      `);

      const columns = eventsTableInfo.rows.map((r: any) => r.column_name);
      const hasDiscordColumns =
        columns.includes("discord_token") &&
        columns.includes("discord_guild_id");

      this.addResult(
        hasDiscordColumns,
        "Events table has Discord credential columns",
        columns
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Migration verification failed", errorMessage);
    }
  }

  private async testDiscordCredentials(): Promise<void> {
    console.log("\n🔐 Testing Discord credentials functionality...");

    try {
      const testToken =
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.test-token-for-migration-testing-purposes-only";
      const testGuildId = "1234567890123456789";

      // Test credential validation
      const tokenValid = CredentialEncryption.validateDiscordToken(testToken);
      const guildIdValid =
        CredentialEncryption.validateDiscordGuildId(testGuildId);

      this.addResult(tokenValid, "Discord token validation working");
      this.addResult(guildIdValid, "Discord Guild ID validation working");

      // Test encryption/decryption
      const encrypted = CredentialEncryption.encrypt(testToken);
      const decrypted = CredentialEncryption.decrypt(encrypted);

      this.addResult(
        encrypted !== testToken && decrypted === testToken,
        "Discord token encryption/decryption working"
      );

      // Test event creation with Discord credentials
      const eventWithCredentials = await this.adapter.createEvent({
        name: "Event with Discord Credentials",
        startDate: "2025-02-01T00:00:00Z",
        endDate: "2025-02-02T00:00:00Z",
        timezone: "UTC",
        description: "Test event with Discord bot credentials",
        guildId: this.testGuildId,
        discordToken: testToken,
        discordGuildId: testGuildId,
        isActive: false,
      });

      this.addResult(
        eventWithCredentials.discordToken === testToken,
        "Event creation with Discord credentials successful"
      );

      // Test credential retrieval
      const retrievedEventWithCreds = await this.adapter.getEvent(
        eventWithCredentials.id
      );
      this.addResult(
        retrievedEventWithCreds.discordToken === testToken,
        "Discord credentials properly decrypted on retrieval"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Discord credentials test failed", errorMessage);
    }
  }

  private async testDataOperations(): Promise<void> {
    console.log("\n📊 Testing data recording operations...");

    try {
      // Get the active event
      const activeEvent = await this.adapter.getActiveEvent(this.testGuildId);
      if (!activeEvent) {
        this.addResult(false, "No active event found for data operations");
        return;
      }

      // Test member count recording
      await this.adapter.recordMemberCount(100, 75, activeEvent.id);
      this.addResult(true, "Member count recording successful");

      // Test game activity recording
      await this.adapter.recordGameActivity(
        "Migration Test Game",
        15,
        activeEvent.id
      );
      this.addResult(true, "Game activity recording successful");

      // Test game session recording
      await this.adapter.recordGameSession(
        "test-user-123",
        "Session Test Game",
        "start",
        activeEvent.id
      );
      await this.adapter.recordGameSession(
        "test-user-123",
        "Session Test Game",
        "end",
        activeEvent.id
      );
      this.addResult(true, "Game session recording successful");

      // Test data retrieval
      const currentStats = await this.adapter.getCurrentStats(activeEvent.id);
      const memberStats = currentStats.memberStats;
      this.addResult(
        !!memberStats && memberStats.total_members === 100,
        "Current statistics retrieval successful",
        {
          totalMembers: memberStats?.total_members,
          activeGames: currentStats.currentGames.length,
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Data operations test failed", errorMessage);
    }
  }

  private async testBackwardCompatibility(): Promise<void> {
    console.log("\n🔄 Testing backward compatibility...");

    try {
      // Test methods without explicit event ID (should use active event)
      await this.adapter.recordMemberCount(110, 85);
      this.addResult(true, "Backward compatible member count recording");

      await this.adapter.recordGameActivity("Backward Compat Game", 20);
      this.addResult(true, "Backward compatible game activity recording");

      const stats = await this.adapter.getCurrentStats();
      const memberStatsBc = stats.memberStats;
      this.addResult(
        !!memberStatsBc && memberStatsBc.total_members === 110,
        "Backward compatible statistics retrieval"
      );

      // Test date range queries without event ID
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      const memberStats = await this.adapter.getMemberStatsInRange(
        startDate,
        endDate
      );
      this.addResult(
        memberStats.length >= 1,
        `Backward compatible member stats range query (${memberStats.length} records)`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Backward compatibility test failed", errorMessage);
    }
  }

  private async testEventManagement(): Promise<void> {
    console.log("\n🎪 Testing event management functionality...");

    try {
      // Test event activation switching
      const newEvent = await this.adapter.createEvent({
        name: "New Active Event",
        startDate: "2025-03-01T00:00:00Z",
        endDate: "2025-03-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for activation testing",
        guildId: this.testGuildId,
        isActive: false,
      });

      await this.adapter.setActiveEvent(this.testGuildId, newEvent.id);
      const newActiveEvent = await this.adapter.getActiveEvent(
        this.testGuildId
      );

      this.addResult(
        newActiveEvent.id === newEvent.id,
        "Event activation switching successful"
      );

      // Test event statistics
      const eventStats = await this.adapter.getEventStats(newEvent.id);
      this.addResult(
        typeof eventStats.totalUniqueGames === "number",
        "Event statistics generation successful",
        {
          eventId: eventStats.eventId,
          totalGames: eventStats.totalUniqueGames,
        }
      );

      // Test event summaries
      const summaries = await this.adapter.getEventSummaries(this.testGuildId);
      this.addResult(
        summaries.length >= 2,
        `Event summaries generation successful (${summaries.length} events)`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Event management test failed", errorMessage);
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log("\n🚨 Testing error handling...");

    try {
      // Test invalid Discord token format
      try {
        await this.adapter.createEvent({
          name: "Invalid Credentials Event",
          startDate: "2025-04-01T00:00:00Z",
          endDate: "2025-04-02T00:00:00Z",
          timezone: "UTC",
          description: "Should fail",
          guildId: this.testGuildId,
          discordToken: "invalid-token-format",
          discordGuildId: "1234567890123456789",
          isActive: false,
        });
        this.addResult(false, "Should have rejected invalid Discord token");
      } catch (error: unknown) {
        this.addResult(true, "Properly rejected invalid Discord token format");
      }

      // Test invalid Guild ID format
      try {
        await this.adapter.createEvent({
          name: "Invalid Guild ID Event",
          startDate: "2025-04-01T00:00:00Z",
          endDate: "2025-04-02T00:00:00Z",
          timezone: "UTC",
          description: "Should fail",
          guildId: this.testGuildId,
          discordToken:
            "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.valid-token-format-for-error-testing",
          discordGuildId: "invalid-guild-id",
          isActive: false,
        });
        this.addResult(false, "Should have rejected invalid Guild ID");
      } catch (error: unknown) {
        this.addResult(
          true,
          "Properly rejected invalid Discord Guild ID format"
        );
      }

      // Test non-existent event retrieval
      const nonExistentEvent = await this.adapter.getEvent(99999);
      this.addResult(
        nonExistentEvent === null,
        "Properly handles non-existent event queries"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addResult(false, "Error handling test failed", errorMessage);
    }
  }

  private async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up test data...");

    try {
      if (this.adapter) {
        // Clean up test data
        await this.adapter.query(
          "DELETE FROM member_stats WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
          [this.testGuildId]
        );
        await this.adapter.query(
          "DELETE FROM game_stats WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
          [this.testGuildId]
        );
        await this.adapter.query(
          "DELETE FROM game_sessions WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
          [this.testGuildId]
        );
        await this.adapter.query("DELETE FROM events WHERE guild_id = $1", [
          this.testGuildId,
        ]);

        await this.adapter.cleanup();
        console.log("✅ Cleanup completed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn("⚠️  Cleanup failed:", errorMessage);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new MigrationTester();
  tester
    .runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test execution failed:", error);
      process.exit(1);
    });
}

export { MigrationTester };
