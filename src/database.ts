import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
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
  created_at: string;
  updated_at: string;
}

class DatabaseManager {
  private db: Database | null = null;
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
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      logger.info(`Connected to database: ${this.dbPath}`);

      // Enable foreign keys
      await this.db.exec("PRAGMA foreign_keys = ON");

      // Create tables if they don't exist
      await this.createTables();
      logger.info("Database tables initialized");
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Create necessary database tables
   */
  private async createTables(): Promise<void> {
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

    try {
      await this.db.exec(createScheduleTableSQL);
      await this.db.exec(createSyncLogTableSQL);
      logger.debug("Database tables created or already exist");
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
      const entries = await this.db.all(
        "SELECT sheet_name, mese, day, time, name, created_at, updated_at FROM schedule_entries ORDER BY sheet_name, mese, day, time",
      );
      return entries as ScheduleEntry[];
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
      const entry = await this.db.get(
        "SELECT sheet_name, mese, day, time, name, created_at, updated_at FROM schedule_entries WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?",
        [sheet_name, mese, day, time],
      );
      return entry as ScheduleEntry | undefined;
    } catch (error) {
      logger.error(
        `Failed to get entry ${sheet_name}/${mese}/${day}/${time}:`,
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
      await this.db.run(
        `INSERT INTO schedule_entries (sheet_name, mese, day, time, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.sheet_name,
          entry.mese,
          entry.day,
          entry.time,
          entry.name,
          now,
          now,
        ],
      );
      logger.debug(
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
      await this.db.run(
        `UPDATE schedule_entries 
         SET name = ?, updated_at = ?
         WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?`,
        [entry.name, now, entry.sheet_name, entry.mese, entry.day, entry.time],
      );
      logger.debug(
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
      await this.db.run(
        "DELETE FROM schedule_entries WHERE sheet_name = ? AND mese = ? AND day = ? AND time = ?",
        [sheet_name, mese, day, time],
      );
      logger.debug(`Deleted entry: ${sheet_name}/${mese}/${day}/${time}`);
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
      await this.db.run(
        `INSERT INTO sync_logs (sync_timestamp, action, entry_id, details, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [now, action, entryId || null, details || null, now],
      );
    } catch (error) {
      logger.error("Failed to log sync:", error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        logger.info("Database connection closed");
      } catch (error) {
        logger.error("Failed to close database:", error);
        throw error;
      }
    }
  }
}

export default new DatabaseManager();
