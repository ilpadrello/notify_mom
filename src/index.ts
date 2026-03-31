import "dotenv/config";
import logger from "./logger.js";
import db from "./database.js";
import syncEngine from "./sync.js";
import scheduler from "./scheduler.js";

async function main(): Promise<void> {
  try {
    logger.info("Application starting...");
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

    // Initialize database
    await db.initialize();

    // Initialize Google Sheets connection
    await syncEngine.initialize();

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
