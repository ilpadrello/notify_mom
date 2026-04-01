import "dotenv/config";
import logger from "./logger.js";
import db from "./database.js";
import syncEngine from "./sync.js";
import scheduler from "./scheduler.js";

async function main(): Promise<void> {
  try {
    logger.info("Application starting...");
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

    // Check for test mode command-line arguments
    const args = process.argv.slice(2);
    const testCommand = args[0];

    // Initialize database
    await db.initialize();

    // Initialize Google Sheets connection (skip for test-only commands)
    if (testCommand !== "test:9am" && testCommand !== "test:upcoming") {
      await syncEngine.initialize();
    }

    if (testCommand === "test:9am") {
      // Test 9am reminder
      logger.info("Testing 9am reminder notification...");
      await scheduler.testDailyReminder();
      logger.info("9am reminder test completed");
      process.exit(0);
    }

    if (testCommand === "test:upcoming") {
      // Test 3-hour before reminder
      logger.info("Testing upcoming event notification...");
      await scheduler.testUpcomingReminder();
      logger.info("Upcoming reminder test completed");
      process.exit(0);
    }

    // Start normal operation
    // Start the scheduler
    scheduler.start();

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      scheduler.stop();
      await db.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      scheduler.stop();
      await db.close();
      process.exit(0);
    });

    logger.info("Application is running");
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

main();
