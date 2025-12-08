// Global teardown for Jest test suite
export default async function globalTeardown() {
  console.log("🧹 Cleaning up test environment...");
  // Add any cleanup logic here if needed
  console.log("✅ Test environment cleanup complete");
}
