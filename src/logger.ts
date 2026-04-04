import pino from "pino";
import type Database from "better-sqlite3";

const logLevel = process.env.LOG_LEVEL || "info";

// Create base pino logger (console output only)
const pinoLogger = pino(
  {
    level: logLevel,
  },
  pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: false,
      translateTime: "SYS:standard",
    },
  }),
);

// Store database reference (will be set by caller)
let dbInstance: Database.Database | null = null;

/**
 * Set the database instance for logging
 * Call this from index.ts after database is initialized
 */
export function setLoggerDatabase(db: Database.Database): void {
  dbInstance = db;
}

/**
 * Write log to database asynchronously (non-blocking)
 */
function writeToDatabase(
  level: string,
  message: string,
  details?: string,
): void {
  if (!dbInstance) return; // Silently skip if DB not ready

  // Use setImmediate to avoid blocking the main thread
  setImmediate(() => {
    try {
      const now = new Date().toISOString();
      const stmt = dbInstance!.prepare(
        `INSERT INTO logs (level, message, details, created_at)
         VALUES (?, ?, ?, ?)`,
      );
      stmt.run(level, message, details || null, now);
    } catch (error) {
      // Silently fail - don't let logging errors crash the app
      console.error("Failed to write log to database:", error);
    }
  });
}

/**
 * Custom logger that writes to both console and database
 */
const logger = {
  debug: (message: string, details?: any) => {
    writeToDatabase(
      "debug",
      message,
      details ? JSON.stringify(details) : undefined,
    );
    pinoLogger.debug(details ? { details } : {}, message);
  },
  info: (message: string, details?: any) => {
    writeToDatabase(
      "info",
      message,
      details ? JSON.stringify(details) : undefined,
    );
    pinoLogger.info(details ? { details } : {}, message);
  },
  warn: (message: string, details?: any) => {
    writeToDatabase(
      "warn",
      message,
      details ? JSON.stringify(details) : undefined,
    );
    pinoLogger.warn(details ? { details } : {}, message);
  },
  error: (message: string, error?: any) => {
    const details = error instanceof Error ? error.message : String(error);
    writeToDatabase("error", message, details);
    pinoLogger.error(error ? { error } : {}, message);
  },
};

export default logger;
