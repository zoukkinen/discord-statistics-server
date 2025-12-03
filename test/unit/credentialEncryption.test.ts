// Unit tests for CredentialEncryption utility
import { CredentialEncryption } from "../../src/utils/credentialEncryption";

describe("CredentialEncryption", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CREDENTIAL_ENCRYPTION_KEY = "test-key-for-testing";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a Discord token successfully", () => {
      const originalToken =
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-random-token-data-here-that-is-long-enough-27chars";

      const encrypted = CredentialEncryption.encrypt(originalToken);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format

      const decrypted = CredentialEncryption.decrypt(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it("should produce different encrypted values for the same input (due to random IV)", () => {
      const token =
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-random-token-data-here-that-is-long-enough-27chars";

      const encrypted1 = CredentialEncryption.encrypt(token);
      const encrypted2 = CredentialEncryption.encrypt(token);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to the same value
      expect(CredentialEncryption.decrypt(encrypted1)).toBe(token);
      expect(CredentialEncryption.decrypt(encrypted2)).toBe(token);
    });

    it("should throw error when encrypting empty token", () => {
      expect(() => CredentialEncryption.encrypt("")).toThrow(
        "Token cannot be empty"
      );
      expect(() => CredentialEncryption.encrypt(null as any)).toThrow(
        "Token cannot be empty"
      );
    });

    it("should throw error when decrypting empty token", () => {
      expect(() => CredentialEncryption.decrypt("")).toThrow(
        "Encrypted token cannot be empty"
      );
      expect(() => CredentialEncryption.decrypt(null as any)).toThrow(
        "Encrypted token cannot be empty"
      );
    });

    it("should throw error when decrypting invalid encrypted data", () => {
      expect(() =>
        CredentialEncryption.decrypt("invalid-encrypted-data")
      ).toThrow();
    });

    it("should handle encryption without environment key (development mode)", () => {
      // Create a new test that doesn't interfere with other tests
      jest.isolateModules(() => {
        delete process.env.CREDENTIAL_ENCRYPTION_KEY;

        // Re-import the module to get fresh instance
        const {
          CredentialEncryption: TestCredentialEncryption,
        } = require("../../src/utils/credentialEncryption");

        const token =
          "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-random-token-data-here-that-is-long-enough-27chars";

        // Should still work with default key (with warning)
        const encrypted = TestCredentialEncryption.encrypt(token);
        const decrypted = TestCredentialEncryption.decrypt(encrypted);

        expect(decrypted).toBe(token);
      });
    });
  });

  describe("validateDiscordToken", () => {
    it("should validate correct Discord token format", () => {
      const validToken =
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-random-token-data-here-that-is-long-enough-27chars";
      expect(CredentialEncryption.validateDiscordToken(validToken)).toBe(true);
    });

    it("should reject invalid Discord token formats", () => {
      const invalidTokens = [
        "", // Empty
        "invalid", // Too short
        "MTQwMDEwNzY0NDExNDU2NzIzOA", // Missing parts
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10", // Missing third part
        "invalid.format.here", // Wrong format
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.short", // Third part too short
      ];

      invalidTokens.forEach((token) => {
        expect(CredentialEncryption.validateDiscordToken(token)).toBe(false);
      });
    });

    it("should handle null/undefined token validation", () => {
      expect(CredentialEncryption.validateDiscordToken(null as any)).toBe(
        false
      );
      expect(CredentialEncryption.validateDiscordToken(undefined as any)).toBe(
        false
      );
    });
  });

  describe("validateDiscordGuildId", () => {
    it("should validate correct Discord Guild ID format", () => {
      const validGuildIds = [
        "1234567890123456789", // 19 digits
        "123456789012345678", // 18 digits
        "12345678901234567", // 17 digits
      ];

      validGuildIds.forEach((guildId) => {
        expect(CredentialEncryption.validateDiscordGuildId(guildId)).toBe(true);
      });
    });

    it("should reject invalid Discord Guild ID formats", () => {
      const invalidGuildIds = [
        "", // Empty
        "123", // Too short
        "12345678901234567890", // Too long (20 digits)
        "abc123456789012345", // Contains letters
        "123-456-789", // Contains hyphens
        "123 456 789", // Contains spaces
      ];

      invalidGuildIds.forEach((guildId) => {
        expect(CredentialEncryption.validateDiscordGuildId(guildId)).toBe(
          false
        );
      });
    });

    it("should handle null/undefined guild ID validation", () => {
      expect(CredentialEncryption.validateDiscordGuildId(null as any)).toBe(
        false
      );
      expect(
        CredentialEncryption.validateDiscordGuildId(undefined as any)
      ).toBe(false);
    });
  });

  describe("sanitizeTokenForLogging", () => {
    it("should sanitize token for safe logging", () => {
      const token =
        "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-random-token-data-here";
      const sanitized = CredentialEncryption.sanitizeTokenForLogging(token);

      expect(sanitized).toBe("MTQwMD...here");
      expect(sanitized).not.toContain("GTOM10"); // Should not contain sensitive parts
    });

    it("should handle short tokens", () => {
      const shortToken = "short";
      const sanitized =
        CredentialEncryption.sanitizeTokenForLogging(shortToken);

      expect(sanitized).toBe("[HIDDEN]");
    });

    it("should handle empty/null tokens", () => {
      expect(CredentialEncryption.sanitizeTokenForLogging("")).toBe("[HIDDEN]");
      expect(CredentialEncryption.sanitizeTokenForLogging(null as any)).toBe(
        "[HIDDEN]"
      );
      expect(
        CredentialEncryption.sanitizeTokenForLogging(undefined as any)
      ).toBe("[HIDDEN]");
    });
  });
});
