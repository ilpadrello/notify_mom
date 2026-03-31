import { GoogleSpreadsheet } from "google-spreadsheet";
import oauth2Manager from "./oauth.js";
import logger from "./logger.js";
import db, { ScheduleEntry } from "./database.js";
import { normalizeString, parseTime } from "./utils.js";
import notificationManager from "./notifications.js";

interface SheetRow {
  [key: string]: string;
}

interface SyncDiff {
  added: ScheduleEntry[];
  removed: ScheduleEntry[];
}

class SyncEngine {
  private doc: GoogleSpreadsheet | null = null;
  private spreadsheetId: string;
  private nonnaColumnIndex: number = -1;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
  }

  /**
   * Initialize Google Sheets connection
   */
  async initialize(): Promise<void> {
    try {
      if (!this.spreadsheetId) {
        throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not set");
      }

      // Use OAuth2 authentication
      if (!oauth2Manager.hasValidToken()) {
        throw new Error(
          "No valid authentication token found. Run 'npm run auth' to authenticate.",
        );
      }

      if (!oauth2Manager.loadTokenFromFile()) {
        throw new Error("Failed to load authentication token");
      }

      this.doc = new GoogleSpreadsheet(
        this.spreadsheetId,
        oauth2Manager.getClient(),
      );

      await this.doc.loadInfo();
      logger.info(`Connected to Google Sheet: ${this.doc.title}`);
    } catch (error) {
      logger.error("Failed to initialize Google Sheets connection:", error);
      throw error;
    }
  }

  /**
   * Check if a sheet has all required columns
   */
  private hasRequiredColumns(row: SheetRow): boolean {
    const hasMese = Object.keys(row).some(
      (key) => normalizeString(key) === "mese",
    );
    const hasDate = Object.keys(row).some(
      (key) => normalizeString(key) === "date",
    );
    const hasNonna = Object.keys(row).some(
      (key) => normalizeString(key) === "nonna",
    );

    // Check for at least one time column
    const hasTimeColumn = Object.keys(row).some((key) => {
      const normalized = normalizeString(key);
      return normalized === "italy time" || normalized === "france time";
    });

    return hasMese && hasDate && hasNonna && hasTimeColumn;
  }

  /**
   * Get all valid sheets (sheets that contain required columns)
   */
  private getValidSheets(): Array<{ name: string; sheet: any }> {
    if (!this.doc) {
      throw new Error("Google Sheets not initialized");
    }

    const validSheets: Array<{ name: string; sheet: any }> = [];

    for (const sheet of this.doc.sheetsByIndex) {
      validSheets.push({ name: sheet.title, sheet });
    }

    logger.info(`Found ${validSheets.length} sheets in document`);
    return validSheets;
  }

  /**
   * Fetch all rows from all valid sheets with sheet names
   */
  private async fetchSheetsData(): Promise<
    Array<{ sheet_name: string; rows: SheetRow[] }>
  > {
    if (!this.doc) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      const validSheets = this.getValidSheets();
      const allSheetData: Array<{ sheet_name: string; rows: SheetRow[] }> = [];

      for (const { name, sheet } of validSheets) {
        try {
          const rows = await sheet.getRows();
          if (rows.length === 0) {
            logger.debug(`Sheet "${name}" is empty, skipping`);
            continue;
          }

          // Check if the first row has required columns
          const firstRowObject = rows[0].toObject();
          if (!this.hasRequiredColumns(firstRowObject)) {
            logger.warn(
              `Sheet "${name}" does not have required columns (Mese, Date, Time), skipping`,
            );
            continue;
          }

          allSheetData.push({
            sheet_name: name,
            rows: rows.map((row: any) => row.toObject()),
          });

          logger.info(`Fetched ${rows.length} rows from sheet "${name}"`);
        } catch (error) {
          logger.error(`Failed to fetch rows from sheet "${name}":`, error);
        }
      }

      return allSheetData;
    } catch (error) {
      logger.error("Failed to fetch sheet data:", error);
      throw error;
    }
  }

  /**
   * Parse sheet rows and extract schedule entries (raw data preservation)
   */
  private parseSheetEntries(
    sheet_name: string,
    rows: SheetRow[],
  ): ScheduleEntry[] {
    const entries: ScheduleEntry[] = [];

    for (const row of rows) {
      try {
        // Find 'Nonna' column (case-insensitive)
        let nonnaValue = "";
        for (const [key, value] of Object.entries(row)) {
          if (normalizeString(key) === "nonna") {
            nonnaValue = value || "";
            break;
          }
        }

        // Filter for 'maria'
        if (!normalizeString(nonnaValue).includes("maria")) {
          continue;
        }

        // Extract month, day, time - preserve raw data as-is
        const mese = row["Mese"] || row["mese"] || "";
        const day = row["Date"] || row["date"] || "";
        const time =
          row["Italy Time"] ||
          row["italy time"] ||
          row["France Time"] ||
          row["france time"] ||
          "";

        if (!mese || !day || !time) {
          logger.warn("Skipping row with missing fields:", row);
          continue;
        }

        // Validate time format (but don't convert mese/day - preserve as-is)
        parseTime(time);

        const entry: ScheduleEntry = {
          sheet_name, // Store sheet name for tracking
          mese, // Store raw Italian month name (e.g., "Marzo" or "mazo")
          day, // Store raw day (as string)
          time, // Store raw time
          name: nonnaValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        entries.push(entry);
      } catch (error) {
        logger.warn("Failed to parse row:", error, row);
        continue;
      }
    }

    return entries;
  }

  /**
   * Create a unique tuple key for (sheet_name, mese, day, time)
   */
  private createEntryKey(entry: ScheduleEntry): string {
    return `${entry.sheet_name}|${entry.mese}|${entry.day}|${entry.time}`;
  }

  /**
   * Calculate differences between sheet and database using composite keys
   * Only considers entries from sheets that currently exist
   */
  private async calculateDiff(
    sheetEntries: ScheduleEntry[],
  ): Promise<SyncDiff> {
    const dbEntries = await db.getAllEntries();

    // Get list of valid sheet names from current sheet data
    const validSheetNames = new Set(sheetEntries.map((e) => e.sheet_name));

    // Filter DB entries to only those from valid sheets
    const dbEntriesFromValidSheets = dbEntries.filter((e) =>
      validSheetNames.has(e.sheet_name),
    );

    const sheetKeys = new Set(sheetEntries.map((e) => this.createEntryKey(e)));
    const dbKeys = new Set(
      dbEntriesFromValidSheets.map((e) => this.createEntryKey(e)),
    );

    const added = sheetEntries.filter(
      (e) => !dbKeys.has(this.createEntryKey(e)),
    );
    const removed = dbEntriesFromValidSheets.filter(
      (e) => !sheetKeys.has(this.createEntryKey(e)),
    );

    return { added, removed };
  }

  /**
   * Apply sync operations
   */
  private async applySyncOperations(diff: SyncDiff): Promise<void> {
    // Insert new entries
    for (const entry of diff.added) {
      await db.insertEntry(entry);
      const entryKey = this.createEntryKey(entry);
      await db.logSync("INSERT", entryKey, JSON.stringify(entry));
      await notificationManager.notifyNew(entryKey, {
        month: entry.mese,
        day: entry.day,
        time: entry.time,
        name: entry.name,
      });
      logger.info(`Added entry: ${entryKey}`);
    }

    // Remove deleted entries
    for (const entry of diff.removed) {
      const entryKey = this.createEntryKey(entry);
      await db.deleteEntry(entry.sheet_name, entry.mese, entry.day, entry.time);
      await db.logSync("DELETE", entryKey, JSON.stringify(entry));
      await notificationManager.notifyAnnulled(entryKey, {
        month: entry.mese,
        day: entry.day,
        time: entry.time,
        name: entry.name,
      });
      logger.info(`Removed entry: ${entryKey}`);
    }
  }

  /**
   * Execute full sync operation - processes all valid sheets
   */
  async sync(): Promise<void> {
    try {
      logger.info("Starting sync operation...");

      // Fetch data from all valid sheets
      const sheetsData = await this.fetchSheetsData();

      if (sheetsData.length === 0) {
        logger.warn("No valid sheets found with required columns");
        return;
      }

      // Parse entries from all sheets
      const allSheetEntries: ScheduleEntry[] = [];
      for (const { sheet_name, rows } of sheetsData) {
        const entries = this.parseSheetEntries(sheet_name, rows);
        allSheetEntries.push(...entries);
      }

      logger.info(
        `Found ${allSheetEntries.length} entries matching criteria across ${sheetsData.length} sheets`,
      );

      // Calculate differences
      const diff = await this.calculateDiff(allSheetEntries);

      logger.info(
        `Sync diff - Added: ${diff.added.length}, Removed: ${diff.removed.length}`,
      );

      // Apply operations
      if (diff.added.length > 0 || diff.removed.length > 0) {
        await this.applySyncOperations(diff);
        await notificationManager.notifySyncCompleted(
          diff.added.length,
          diff.removed.length,
        );
      } else {
        logger.info("No changes detected");
      }

      logger.info("Sync operation completed successfully");
    } catch (error) {
      logger.error("Sync operation failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await notificationManager.notifyError(
        `Sync operation failed: ${errorMessage}`,
        { timestamp: new Date().toISOString() },
      );
      throw error;
    }
  }
}

export default new SyncEngine();
