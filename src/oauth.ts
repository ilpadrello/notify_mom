/**
 * OAuth2 Authentication Module
 * Handles user authentication with Google Sheets using OAuth2
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OAuth2 configuration
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
const OAUTH_REDIRECT_URL = "http://localhost:3000/oauth/callback";
const TOKEN_FILE = path.join(process.cwd(), "token.json");

class OAuth2Manager {
  private oauth2Client: OAuth2Client;

  constructor() {
    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
      throw new Error(
        "OAuth2 credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env",
      );
    }

    this.oauth2Client = new OAuth2Client(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      OAUTH_REDIRECT_URL,
    );
  }

  /**
   * Check if token.json exists and is valid
   */
  hasValidToken(): boolean {
    if (!fs.existsSync(TOKEN_FILE)) {
      return false;
    }

    try {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      return tokenData.access_token ? true : false;
    } catch (error) {
      logger.error("Error reading token.json:", error);
      return false;
    }
  }

  /**
   * Load token from file and set it in the OAuth2 client
   */
  loadTokenFromFile(): boolean {
    try {
      if (!fs.existsSync(TOKEN_FILE)) {
        logger.warn(`Token file not found: ${TOKEN_FILE}`);
        return false;
      }

      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      this.oauth2Client.setCredentials(tokenData);
      logger.info("Token loaded from file successfully");
      return true;
    } catch (error) {
      logger.error("Error loading token from file:", error);
      return false;
    }
  }

  /**
   * Generate authentication URL for user to visit
   */
  getAuthUrl(): string {
    const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getAccessToken(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Save token to file
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
      logger.info(`Token saved to ${TOKEN_FILE}`);
    } catch (error) {
      logger.error("Error getting access token:", error);
      throw error;
    }
  }

  /**
   * Get the OAuth2 client (used by google-spreadsheet)
   */
  getClient(): OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * Refresh token if needed
   */
  async refreshToken(): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      // Update token file
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(credentials, null, 2));
      logger.info("Token refreshed successfully");
    } catch (error) {
      logger.error("Error refreshing token:", error);
      throw error;
    }
  }

  /**
   * Print authentication instructions
   */
  printAuthInstructions(): void {
    const authUrl = this.getAuthUrl();
    console.log("\n");
    console.log(
      "╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║         📋 Google Sheets OAuth2 Authentication             ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
    console.log("\n⚠️  No valid token.json found!\n");
    console.log("To authenticate, visit this URL in your browser:\n");
    console.log(`🔗 ${authUrl}\n`);
    console.log("Steps:");
    console.log("  1. Click the link above and authorize the application");
    console.log("  2. You'll be redirected to http://localhost:3000/...");
    console.log('  3. Copy the "code" parameter from the URL');
    console.log("  4. Run: npm run auth -- <authorization_code>");
    console.log("\nExample:");
    console.log("  npm run auth -- 4/0AY0e-g...\n");
  }
}

// Export singleton instance
const oauth2Manager = new OAuth2Manager();
export default oauth2Manager;
