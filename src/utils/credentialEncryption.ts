import * as crypto from "crypto";

/**
 * Secure credential encryption utility for Discord tokens
 * Uses AES-256-GCM encryption with environment-based keys
 */
export class CredentialEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;

  /**
   * Get encryption key from environment variables
   * Falls back to a default key for development (NOT FOR PRODUCTION)
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (!key) {
      console.warn(
        "⚠️  CREDENTIAL_ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)"
      );
      // Default key for development - should be replaced in production
      return crypto.scryptSync(
        "default-dev-key-change-in-production",
        "salt",
        32
      );
    }

    // Derive key from provided key using scrypt
    return crypto.scryptSync(key, "discord-credentials-salt", 32);
  }

  /**
   * Encrypt a Discord token for secure database storage
   */
  public static encrypt(token: string): string {
    if (!token) {
      throw new Error("Token cannot be empty");
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from("discord-token", "utf8"));

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Combine IV + encrypted + tag for storage
    const combined = Buffer.concat([iv, Buffer.from(encrypted, "hex"), tag]);

    return combined.toString("base64");
  }

  /**
   * Decrypt a Discord token from database storage
   */
  public static decrypt(encryptedToken: string): string {
    if (!encryptedToken) {
      throw new Error("Encrypted token cannot be empty");
    }

    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedToken, "base64");

      // Extract IV, encrypted data, and auth tag
      const iv = combined.subarray(0, this.IV_LENGTH);
      const tag = combined.subarray(combined.length - this.TAG_LENGTH);
      const encrypted = combined.subarray(
        this.IV_LENGTH,
        combined.length - this.TAG_LENGTH
      );

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from("discord-token", "utf8"));

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString("utf8");
    } catch (error) {
      console.error("❌ Failed to decrypt Discord token:", error);
      throw new Error(
        "Failed to decrypt Discord token. Token may be corrupted or encryption key changed."
      );
    }
  }

  /**
   * Validate Discord token format (basic validation)
   */
  public static validateDiscordToken(token: string): boolean {
    if (!token) return false;

    // Discord bot tokens follow the pattern: base64.base64.base64
    // This is a basic format check, not a full validation
    // Part 1: 24-28 characters, Part 2: 6 characters, Part 3: 27+ characters
    const tokenRegex =
      /^[A-Za-z0-9+/_-]{24,28}\.[A-Za-z0-9+/_-]{6}\.[A-Za-z0-9+/_=-]{27,}$/;
    return tokenRegex.test(token);
  }

  /**
   * Validate Discord Guild ID format
   */
  public static validateDiscordGuildId(guildId: string): boolean {
    if (!guildId) return false;

    // Discord guild IDs are snowflakes (17-19 digit numbers)
    const guildIdRegex = /^\d{17,19}$/;
    return guildIdRegex.test(guildId);
  }

  /**
   * Sanitize token for logging (shows only first/last few characters)
   */
  public static sanitizeTokenForLogging(token: string): string {
    if (!token || token.length < 10) return "[HIDDEN]";
    return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
  }
}
