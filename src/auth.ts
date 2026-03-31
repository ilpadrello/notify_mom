#!/usr/bin/env ts-node
/**
 * OAuth2 Authentication CLI
 * Helps generate and exchange authorization codes
 */

import oauth2Manager from "./oauth.js";
import logger from "./logger.js";

const args = process.argv.slice(2);

async function main() {
  try {
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
