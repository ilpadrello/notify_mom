#!/usr/bin/env ts-node
/**
 * OAuth2 Authentication CLI
 * Helps generate and exchange authorization codes
 */

import logger from "./logger.js";
import "dotenv/config";

const args = process.argv.slice(2);

async function main() {
  try {
    // Dynamically import OAuth2Manager only when needed
    // This allows checking .env before throwing errors
    let oauth2Manager;
    try {
      oauth2Manager = (await import("./oauth.js")).default;
    } catch (error: any) {
      if (error.message?.includes("OAuth2 credentials not configured")) {
        console.log("\n❌ OAuth2 credentials not configured in .env\n");
        console.log("Please add the following to your .env file:\n");
        console.log("  GOOGLE_OAUTH_CLIENT_ID=your_client_id");
        console.log("  GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret");
        console.log(
          "\nFor detailed setup instructions, see: OAUTH2_SETUP.md\n",
        );
        process.exit(1);
      }
      throw error;
    }

    if (args.length === 0) {
      // No arguments - print auth URL
      console.log("\n📋 Starting OAuth2 authentication process...\n");
      oauth2Manager.printAuthInstructions();
      process.exit(0);
    }

    const authCode = args[0];

    console.log("\n⏳ Exchanging authorization code for tokens...\n");
    await oauth2Manager.getAccessToken(authCode);

    console.log("✅ Authentication successful!\n");
    console.log("token.json has been created.");
    console.log("You can now run: npm start\n");
    process.exit(0);
  } catch (error) {
    logger.error("Authentication failed:", error);
    console.error("❌ Authentication failed. Please try again.\n");
    process.exit(1);
  }
}

main();
