import cron from "node-cron";
import logger from "./logger.js";
import syncEngine from "./sync.js";
import db from "./database.js";
import notificationManager from "./notifications.js";

class Scheduler {
  private syncIntervalMinutes: number;
  private syncTask: cron.ScheduledTask | null = null;
  private dailyReminderTask: cron.ScheduledTask | null = null;
  private upcomingEventTask: cron.ScheduledTask | null = null;

  constructor() {
    this.syncIntervalMinutes = parseInt(
      process.env.SYNC_INTERVAL_MINUTES || "15",
      10,
    );
  }

  /**
   * Start the scheduler with cron expression
   */
  async start(): Promise<void> {
    try {
      // Create cron expression for every N minutes
      // Running at every minute specified by the interval
      const cronExpression = `*/${this.syncIntervalMinutes} * * * *`;

      logger.info(
        `Starting scheduler with interval: ${this.syncIntervalMinutes} minutes`,
      );
      logger.info(`Cron expression: ${cronExpression}`);

      // Schedule the sync task
      this.syncTask = cron.schedule(cronExpression, async () => {
        logger.info("Scheduler triggered sync operation");
        try {
          await syncEngine.sync();
        } catch (error) {
          logger.error("Scheduled sync operation failed:", error);
        }
      });

      // Schedule upcoming events check (every N minutes)
      this.upcomingEventTask = cron.schedule(cronExpression, async () => {
        logger.info("Scheduler checking for upcoming events (within 3 hours)");
        try {
          await this.checkUpcomingEvents();
        } catch (error) {
          logger.error("Upcoming events check failed:", error);
        }
      });

      // Schedule daily reminder at 9 AM
      const dailyReminderCron = "0 9 * * *"; // 9 AM every day
      logger.info(`Starting daily reminder scheduler at 9 AM`);
      logger.info(`Daily reminder cron expression: ${dailyReminderCron}`);

      this.dailyReminderTask = cron.schedule(dailyReminderCron, async () => {
        logger.info("Scheduler triggered daily reminder operation");
        try {
          await this.sendDailyReminders();
        } catch (error) {
          logger.error("Daily reminder operation failed:", error);
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
   * Check for events starting within the next 3 hours and send notifications
   */
  private async checkUpcomingEvents(): Promise<void> {
    try {
      // Get entries starting within the next 3 hours that haven't sent notification
      const upcomingEntries = await db.getEntriesWithinNextHours(3);

      if (upcomingEntries.length > 0) {
        logger.info(
          `Found ${upcomingEntries.length} events starting within 3 hours`,
        );
        db.log(
          "info",
          `Found ${upcomingEntries.length} upcoming events within 3 hours`,
        );

        const upcomingList = upcomingEntries.map((entry) => ({
          name: entry.name,
          time: entry.time,
          sheet_name: entry.sheet_name,
          mese: entry.mese,
          day: entry.day,
        }));

        // Send notifications
        for (const entry of upcomingList) {
          await notificationManager.notifyUpcomingEvents([
            { name: entry.name, time: entry.time },
          ]);

          // Mark notification as sent
          await db.markFirstNotificationSent(
            entry.sheet_name,
            entry.mese,
            entry.day,
            entry.time,
          );
          logger.info(
            `Marked notification sent for ${entry.sheet_name}/${entry.mese}/${entry.day}`,
          );
          db.log(
            "info",
            `Notification sent for event at ${entry.time}`,
            entry.name,
          );
        }
      } else {
        logger.info("No upcoming events within 3 hours");
      }
    } catch (error) {
      logger.error("Error checking upcoming events:", error);
      db.log(
        "error",
        "Error checking upcoming events",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Send daily reminders for today's entries
   */
  private async sendDailyReminders(): Promise<void> {
    try {
      logger.info("Checking for entries today for daily reminder");

      // Get entries for today using event_timestamp
      const todayEntries = await db.getEntriesForToday();

      if (todayEntries.length > 0) {
        logger.info(
          `Found ${todayEntries.length} entries for today. Sending reminders...`,
        );

        const reminderEntries = todayEntries.map((entry) => ({
          name: entry.name,
          time: entry.time,
        }));

        await notificationManager.notifyDailyReminders(reminderEntries);
        logger.info("Daily reminder notification sent successfully");
      } else {
        logger.info("No entries found for today. No reminders to send.");
      }

      // Also check for day-before entries and send notification
      logger.info("Checking for entries tomorrow (day-before reminder)");
      const tomorrowEntries = await db.getEntriesForTomorrow();

      if (tomorrowEntries.length > 0) {
        logger.info(
          `Found ${tomorrowEntries.length} entries for tomorrow. Sending day-before reminders...`,
        );

        const dayBeforeEntries = tomorrowEntries.map((entry) => ({
          name: entry.name,
          time: entry.time,
        }));

        await notificationManager.notifyDayBeforeReminders(dayBeforeEntries);
        logger.info("Day-before reminder notification sent successfully");
      } else {
        logger.info("No entries found for tomorrow. No day-before reminders to send.");
      }
    } catch (error) {
      logger.error("Error in sendDailyReminders:", error);
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      logger.info("Sync scheduler stopped");
    }
    if (this.dailyReminderTask) {
      this.dailyReminderTask.stop();
      logger.info("Daily reminder scheduler stopped");
    }
    if (this.upcomingEventTask) {
      this.upcomingEventTask.stop();
      logger.info("Upcoming events scheduler stopped");
    }
  }

  /**
   * Get current task status
   */
  isRunning(): boolean {
    return (
      this.syncTask !== null ||
      this.dailyReminderTask !== null ||
      this.upcomingEventTask !== null
    );
  }

  /**
   * Test the 9am daily reminder
   */
  async testDailyReminder(): Promise<void> {
    logger.info("=== TESTING 9AM DAILY REMINDER ===");
    await this.sendDailyReminders();
    logger.info("=== 9AM DAILY REMINDER TEST COMPLETE ===");
  }

  /**
   * Test the 3-hour upcoming event reminder
   */
  async testUpcomingReminder(): Promise<void> {
    logger.info("=== TESTING 3-HOUR UPCOMING EVENT REMINDER ===");
    await this.checkUpcomingEvents();
    logger.info("=== 3-HOUR UPCOMING EVENT REMINDER TEST COMPLETE ===");
  }
}

export default new Scheduler();
