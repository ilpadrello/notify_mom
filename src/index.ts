import "dotenv/config";
import logger, { setLoggerDatabase } from "./logger.js";
import db from "./database.js";
import syncEngine from "./sync.js";
import scheduler from "./scheduler.js";

console.log("Working with environment variables:");
console.log(process.env);

async function main(): Promise<void> {
  try {
    // Initialize database first
    await db.initialize();

    // Set up database for logger
    setLoggerDatabase((db as any).db);

    logger.info("Application starting...");
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

    // Check for test mode command-line arguments
    const args = process.argv.slice(2);
    const testCommand = args[0];

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

// Handle uncaught exceptions - don't crash, just log
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
});

// Handle unhandled promise rejections - don't crash, just log
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection:", { reason, promise });
});
