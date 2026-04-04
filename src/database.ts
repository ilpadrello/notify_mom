import Database from "better-sqlite3";
import logger from "./logger.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScheduleEntry {
  sheet_name: string;
  mese: string;
  day: string;
  time: string;
  name: string;
  event_timestamp: string | null;
  first_notification_sent: number;
  created_at: string;
  updated_at: string;
}

class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DATABASE_PATH || "./data/app.db";
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created database directory: ${dir}`);
      }

      // Open database connection
      this.db = new Database(this.dbPath);

      logger.info(`Connected to database: ${this.dbPath}`);

      // Enable foreign keys
      this.db.exec("PRAGMA foreign_keys = ON");

      // Create tables if they don't exist
      this.createTables();
      logger.info("Database tables initialized");
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Create necessary database tables
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const createScheduleTableSQL = `
      CREATE TABLE IF NOT EXISTS schedule_entries (
        sheet_name TEXT NOT NULL,
        mese TEXT NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        name TEXT NOT NULL,
        event_timestamp TEXT,
        first_notification_sent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (sheet_name, mese, day, time)
      );
    `;

    const createSyncLogTableSQL = `
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        entry_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `;

    const createLogsTableSQL = `
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `;

    try {
      this.db.exec(createScheduleTableSQL);
      this.db.exec(createSyncLogTableSQL);
      this.db.exec(createLogsTableSQL);

      // Try to add new columns if they don't exist (for existing databases)
      try {
        this.db.exec(
          `ALTER TABLE schedule_entries ADD COLUMN event_timestamp TEXT DEFAULT NULL;`,
        );
        this.db.exec(
          `ALTER TABLE schedule_entries ADD COLUMN first_notification_sent INTEGER DEFAULT 0;`,
        );
      } catch (alterError) {
        // Columns might already exist, this is okay
        logger.debug(
          "New columns already exist or error adding them (expected for existing databases)",
        );
      }

      logger.info("Database tables created or already exist");
    } catch (error) {
      logger.error("Failed to create tables:", error);
      throw error;
    }
  }

  /**
   * Get all entries from database
   */
  async getAllEntries(): Promise<ScheduleEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries ORDER BY sheet_name, mese, day, time",
      );
      const entries = stmt.all() as ScheduleEntry[];
      return entries;
    } catch (error) {
      logger.error("Failed to get all entries:", error);
      throw error;
    }
  }

  /**
   * Get entry by sheet_name, mese, day, time composite key
   */
  async getEntryByKey(
    sheet_name: string,
    mese: string,
    day: string,
    time: string,
  ): Promise<ScheduleEntry | undefined> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?",
      );
      const entry = stmt.get(sheet_name, mese, day, time) as
        | ScheduleEntry
        | undefined;
      return entry;
    } catch (error) {
      logger.error(
        `Failed to get entry ${sheet_name}/${mese}/${day}/${time}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get entries for today by event_timestamp
   */
  async getEntriesForToday(): Promise<ScheduleEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayDateString = `${year}-${month}-${day}`;

      // Use SQLite's date() function with datetime() to extract date from timestamp and compare
      // This handles timezone-aware timestamps correctly
      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries WHERE event_timestamp IS NOT NULL AND date(datetime(event_timestamp)) = ?",
      );
      const entries = stmt.all(todayDateString) as ScheduleEntry[];
      return entries;
    } catch (error) {
      logger.error("Failed to get entries for today:", error);
      throw error;
    }
  }

  /**
   * Get entries that start within the next 3 hours and haven't sent first notification
   */
  async getEntriesWithinNextHours(hours: number): Promise<ScheduleEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries WHERE event_timestamp IS NOT NULL AND datetime(event_timestamp) > datetime(?) AND datetime(event_timestamp) <= datetime(?) AND first_notification_sent = 0",
      );
      const entries = stmt.all(
        now.toISOString(),
        futureTime.toISOString(),
      ) as ScheduleEntry[];
      return entries;
    } catch (error) {
      logger.error("Failed to get upcoming entries:", error);
      throw error;
    }
  }

  /**
   * Mark entry's first notification as sent
   */
  async markFirstNotificationSent(
    sheet_name: string,
    mese: string,
    day: string,
    time: string,
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        "UPDATE schedule_entries SET first_notification_sent = 1, updated_at = ? WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?",
      );
      stmt.run(now, sheet_name, mese, day, time);
      logger.debug(
        `Marked first notification sent for ${sheet_name}/${mese}/${day}/${time}`,
      );
    } catch (error) {
      logger.error(
        `Failed to mark first notification sent for ${sheet_name}/${mese}/${day}/${time}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get entries for tomorrow by event_timestamp
   */
  async getEntriesForTomorrow(): Promise<ScheduleEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const day = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowDateString = `${year}-${month}-${day}`;

      // Use SQLite's date() function with datetime() to extract date from timestamp and compare
      // This handles timezone-aware timestamps correctly
      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries WHERE event_timestamp IS NOT NULL AND date(datetime(event_timestamp)) = ?",
      );
      const entries = stmt.all(tomorrowDateString) as ScheduleEntry[];
      return entries;
    } catch (error) {
      logger.error("Failed to get entries for tomorrow:", error);
      throw error;
    }
  }

  /**
   * Get entries by day and month (for daily reminders)
   */
  async getEntriesByDayAndMonth(
    day: string,
    month: string,
  ): Promise<ScheduleEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(
        "SELECT sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at FROM schedule_entries WHERE day = ? AND mese = ?",
      );
      const entries = stmt.all(day, month) as ScheduleEntry[];
      return entries;
    } catch (error) {
      logger.error(
        `Failed to get entries for day ${day} and month ${month}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Insert new entry
   */
  async insertEntry(entry: ScheduleEntry): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        `INSERT INTO schedule_entries (sheet_name, mese, day, time, name, event_timestamp, first_notification_sent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      stmt.run(
        entry.sheet_name,
        entry.mese,
        entry.day,
        entry.time,
        entry.name,
        entry.event_timestamp || null,
        entry.first_notification_sent || 0,
        now,
        now,
      );
      logger.info(
        `Inserted entry: ${entry.sheet_name}/${entry.mese}/${entry.day}/${entry.time}`,
      );
    } catch (error) {
      logger.error(
        `Failed to insert entry ${entry.sheet_name}/${entry.mese}/${entry.day}/${entry.time}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update existing entry
   */
  async updateEntry(entry: ScheduleEntry): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        `UPDATE schedule_entries 
         SET name = ?, updated_at = ?
         WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?`,
      );
      stmt.run(
        entry.name,
        now,
        entry.sheet_name,
        entry.mese,
        entry.day,
        entry.time,
      );
      logger.info(
        `Updated entry: ${entry.sheet_name}/${entry.mese}/${entry.day}/${entry.time}`,
      );
    } catch (error) {
      logger.error(
        `Failed to update entry ${entry.sheet_name}/${entry.mese}/${entry.day}/${entry.time}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete entry by sheet_name, mese, day, time composite key
   */
  async deleteEntry(
    sheet_name: string,
    mese: string,
    day: string,
    time: string,
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(
        "DELETE FROM schedule_entries WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?",
      );
      stmt.run(sheet_name, mese, day, time);
      logger.info(`Deleted entry: ${sheet_name}/${mese}/${day}/${time}`);
    } catch (error) {
      logger.error(
        `Failed to delete entry ${sheet_name}/${mese}/${day}/${time}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Log sync operation
   */
  async logSync(
    action: string,
    entryId?: string,
    details?: string,
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        `INSERT INTO sync_logs (sync_timestamp, action, entry_id, details, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      );
      stmt.run(now, action, entryId || null, details || null, now);
    } catch (error) {
      logger.error("Failed to log sync:", error);
      throw error;
    }
  }

  /**
   * Log message to database
   */
  async log(level: string, message: string, details?: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        `INSERT INTO logs (level, message, details, created_at)
         VALUES (?, ?, ?, ?)`,
      );
      stmt.run(level, message, details || null, now);
    } catch (error) {
      // Silently fail for logging errors to avoid infinite recursion
      console.error("Failed to log to database:", error);
    }
  }

  /**
   * Get logs from database
   */
  async getLogs(limit: number = 100): Promise<
    Array<{
      id: number;
      level: string;
      message: string;
      details: string | null;
      created_at: string;
    }>
  > {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(
        "SELECT id, level, message, details, created_at FROM logs ORDER BY created_at DESC LIMIT ?",
      );
      const logs = stmt.all(limit) as Array<{
        id: number;
        level: string;
        message: string;
        details: string | null;
        created_at: string;
      }>;
      return logs;
    } catch (error) {
      console.error("Failed to get logs from database:", error);
      return [];
    }
  }
  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        logger.info("Database connection closed");
      } catch (error) {
        logger.error("Failed to close database:", error);
        throw error;
      }
    }
  }
}

export default new DatabaseManager();
