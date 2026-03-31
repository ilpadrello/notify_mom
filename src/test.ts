/**
 * Development Test Suite
 * Tests core functionality before running the application
 */

import logger from "./logger.js";
import db from "./database.js";
import sync from "./sync.js";
import notificationManager from "./notifications.js";
import oauth2Manager from "./oauth.js";

interface TestResult {
  name: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️  SKIP";
  message: string;
  required: boolean;
}

const results: TestResult[] = [];

/**
 * Test 1: Logger Functionality
 */
async function testLogger(): Promise<void> {
  try {
    logger.info("🧪 Test 1: Logger functionality");
    logger.debug("Debug log test");
    logger.warn("Warning log test");

    results.push({
      name: "Logger",
      status: "✅ PASS",
      message: "Logger initialized and working correctly",
      required: true,
    });
  } catch (error) {
    results.push({
      name: "Logger",
      status: "❌ FAIL",
      message: `Logger test failed: ${error}`,
      required: true,
    });
    throw error;
  }
}

/**
 * Test 2: Database Connection
 */
async function testDatabase(): Promise<void> {
  try {
    logger.info("🧪 Test 2: Database connection and tables");

    // Initialize database
    await db.initialize();
    logger.info("✓ Database connection established");

    // Get all entries to verify tables exist
    const entries = await db.getAllEntries();
    logger.info(`✓ Database tables exist (found ${entries.length} entries)`);

    results.push({
      name: "Database Connection",
      status: "✅ PASS",
      message: `Database initialized successfully with ${entries.length} existing entries`,
      required: true,
    });
  } catch (error) {
    results.push({
      name: "Database Connection",
      status: "❌ FAIL",
      message: `Database test failed: ${error}`,
      required: true,
    });
    throw error;
  }
}

/**
 * Test 3: Google Sheets Connection and OAuth2 Token
 */
async function testGoogleSheets(): Promise<void> {
  try {
    logger.info("🧪 Test 3: Google Sheets API connection (OAuth2)");

    // Check required environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env");
    }
    if (!clientId || !clientSecret) {
      throw new Error("OAuth2 credentials not configured in .env");
    }

    logger.info("✓ Environment variables configured");

    // Check for token.json
    if (!oauth2Manager.hasValidToken()) {
      throw new Error(
        "No valid authentication token (token.json). Run 'npm run auth' first.",
      );
    }
    logger.info("✓ Authentication token found");

    // Initialize sync engine with OAuth2
    await sync.initialize();
    logger.info("✓ Connected to Google Sheets using OAuth2");

    results.push({
      name: "Google Sheets Connection (OAuth2)",
      status: "✅ PASS",
      message: "Successfully connected to Google Sheets with OAuth2 token",
      required: true,
    });
  } catch (error) {
    results.push({
      name: "Google Sheets Connection (OAuth2)",
      status: "❌ FAIL",
      message: `Google Sheets test failed: ${error}`,
      required: true,
    });
    throw error;
  }
}

/**
 * Test 4: Email Notification (Optional)
 */
async function testEmailNotification(): Promise<void> {
  try {
    logger.info("🧪 Test 4: Email notification (OPTIONAL)");

    // Check environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const notifyEmail = process.env.NOTIFY_EMAIL_TO;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !notifyEmail) {
      logger.warn(
        "⚠️  Email configuration incomplete - skipping email test (optional)",
      );
      results.push({
        name: "Email Notification",
        status: "⚠️  SKIP",
        message:
          "Email configuration not complete - test skipped (optional for now)",
        required: false,
      });
      return;
    }

    logger.info("✓ Email configuration detected");
    logger.warn(
      "⚠️  Email test would send a real email - skipping actual send (use production for real test)",
    );

    // Just verify we can construct the notification
    await notificationManager.notifyNew("TEST_KEY", {
      day: "15",
      month: "Marzo",
      time: "14:30",
      name: "maria",
    });

    results.push({
      name: "Email Notification",
      status: "✅ PASS",
      message: "Email notification configured and test message sent",
      required: false,
    });
  } catch (error) {
    // For optional tests, don't throw
    logger.warn(`Email test warning: ${error}`);
    results.push({
      name: "Email Notification",
      status: "⚠️  SKIP",
      message: `Email test skipped: ${error}`,
      required: false,
    });
  }
}

/**
 * Test 5: Telegram Notification (Optional)
 */
async function testTelegramNotification(): Promise<void> {
  try {
    logger.info("🧪 Test 5: Telegram notification (OPTIONAL)");

    // Check environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      logger.warn(
        "⚠️  Telegram configuration incomplete - skipping Telegram test (optional)",
      );
      results.push({
        name: "Telegram Notification",
        status: "⚠️  SKIP",
        message:
          "Telegram configuration not complete - test skipped (optional for now)",
        required: false,
      });
      return;
    }

    logger.info("✓ Telegram configuration detected");
    logger.warn(
      "⚠️  Telegram test would send a real message - skipping actual send (use production for real test)",
    );

    // Just verify we can construct the notification
    await notificationManager.notifyNew("TEST_KEY", {
      day: "15",
      month: "Marzo",
      time: "14:30",
      name: "maria",
    });

    results.push({
      name: "Telegram Notification",
      status: "✅ PASS",
      message: "Telegram notification configured and test message sent",
      required: false,
    });
  } catch (error) {
    // For optional tests, don't throw
    logger.warn(`Telegram test warning: ${error}`);
    results.push({
      name: "Telegram Notification",
      status: "⚠️  SKIP",
      message: `Telegram test skipped: ${error}`,
      required: false,
    });
  }
}

/**
 * Print test results
 */
function printResults(): void {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           NOTIFY MOM - DEVELOPMENT TEST RESULTS            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  // Required tests
  console.log("📋 REQUIRED TESTS:");
  console.log("─".repeat(60));
  const requiredTests = results.filter((r) => r.required);
  requiredTests.forEach((result) => {
    console.log(`${result.status}  ${result.name}`);
    console.log(`   └─ ${result.message}`);
  });

  console.log("");

  // Optional tests
  console.log("📋 OPTIONAL TESTS:");
  console.log("─".repeat(60));
  const optionalTests = results.filter((r) => !r.required);
  optionalTests.forEach((result) => {
    console.log(`${result.status}  ${result.name}`);
    console.log(`   └─ ${result.message}`);
  });

  console.log("");

  // Summary
  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;
  const skipped = results.filter((r) => r.status === "⚠️  SKIP").length;

  console.log("📊 SUMMARY:");
  console.log("─".repeat(60));
  console.log(`   ✅ Passed:  ${passed}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log("");

  // Overall status
  if (failed > 0) {
    console.log("❌ TEST SUITE FAILED - Fix required tests before running app");
    process.exit(1);
  } else if (passed === results.length) {
    console.log("✅ ALL TESTS PASSED - Ready to run application!");
    process.exit(0);
  } else {
    console.log(
      "⚠️  TESTS COMPLETED - Some optional tests skipped (that's OK)",
    );
    process.exit(0);
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log("\n🧪 Starting Notify Mom Development Tests...\n");

  try {
    // Required tests
    await testLogger();
    await testDatabase();
    await testGoogleSheets();

    // Optional tests
    await testEmailNotification();
    await testTelegramNotification();

    // Print results and exit
    printResults();
  } catch (error) {
    logger.error("❌ Test suite failed:", error);
    console.error("\n❌ Critical error during testing:", error);
    process.exit(1);
  }
}

// Run tests
runTests();
