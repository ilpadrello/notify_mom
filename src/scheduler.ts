import cron from "node-cron";
import logger from "./logger.js";
import syncEngine from "./sync.js";

class Scheduler {
  private syncIntervalMinutes: number;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.syncIntervalMinutes = parseInt(
      process.env.SYNC_INTERVAL_MINUTES || "15",
      10,
    );
  }

  /**
   * Start the scheduler with cron expression
   */
  start(): void {
    try {
      // Create cron expression for every N minutes
      // Running at every minute specified by the interval
      const cronExpression = `*/${this.syncIntervalMinutes} * * * *`;

      logger.info(
        `Starting scheduler with interval: ${this.syncIntervalMinutes} minutes`,
      );
      logger.info(`Cron expression: ${cronExpression}`);

      // Schedule the sync task
      this.task = cron.schedule(cronExpression, async () => {
        logger.info("Scheduler triggered sync operation");
        try {
          await syncEngine.sync();
        } catch (error) {
          logger.error("Scheduled sync operation failed:", error);
        }
      });

      // Run sync immediately on startup
      logger.info("Running initial sync...");
      syncEngine.sync().catch((error) => {
        logger.error("Initial sync failed:", error);
      });

      logger.info("Scheduler started successfully");
    } catch (error) {
      logger.error("Failed to start scheduler:", error);
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info("Scheduler stopped");
    }
  }

  /**
   * Get current task status
   */
  isRunning(): boolean {
    return this.task !== null;
  }
}

export default new Scheduler();
