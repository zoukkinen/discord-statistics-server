// Global test setup for Jest (backend tests)
import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

// Override some environment variables for testing
process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.DB_NAME || "discord_stats_test";
process.env.DISCORD_GUILD_ID =
  process.env.DISCORD_GUILD_ID || "1234567890123456789";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test123";
process.env.CREDENTIAL_ENCRYPTION_KEY =
  process.env.CREDENTIAL_ENCRYPTION_KEY || "test-key-for-testing";

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});
