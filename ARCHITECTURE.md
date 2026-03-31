# Architecture & Technical Design

## System Overview

```
┌─────────────────────┐
│  Google Spreadsheet │
│  (Data Source)      │
└──────────┬──────────┘
           │
           │ (Read every 15 min)
           ↓
┌─────────────────────────────────────┐
│         Scheduler (node-cron)       │
│     (/*/15 * * * * cron expr)       │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│      Sync Engine                    │
│  - Fetch Sheet data                 │
│  - Parse entries                    │
│  - Compare with DB                  │
│  - Detect changes                   │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ↓           ↓
┌────────┐  ┌────────┐
│ Added  │  │Removed │
│Entries │  │Entries │
└───┬────┘  └───┬────┘
    │          │
    ↓          ↓
┌────────────────────────┐
│   Database (SQLite)    │
│  - Insert new entries  │
│  - Delete old entries  │
│  - Log all operations  │
└──────────┬─────────────┘
           │
     ┌─────┴─────┐
     │           │
     ↓           ↓
┌─────────────────────┐  ┌──────────────┐
│ Email Notifier      │  │ Telegram Bot │
│ (nodemailer)        │  │ (telegraf)   │
└─────────────────────┘  └──────────────┘
           │                    │
           └────────┬───────────┘
                    ↓
              [Users Notified]
```

## Module Breakdown

### 1. **Scheduler** (`scheduler.ts`)

- Uses `node-cron` for time-based execution
- Runs sync operation every 15 minutes (configurable)
- Executes initial sync on startup
- Graceful shutdown support

### 2. **Sync Engine** (`sync.ts`)

- Connects to Google Sheets API
- Fetches all rows from first sheet
- Parses and filters data:
  - Extracts: Mese (month), Date (day), Time
  - Filters: Only rows where "Nonna" contains "maria" (case-insensitive)
  - **Preserves raw data as-is** to maintain data integrity (e.g., typos like "mazo" are preserved)
- Compares entries using composite key (mese, day, time)
- Calculates diff (added/removed entries)
- Triggers notifications via NotificationManager

### 3. **Database** (`database.ts`)

- SQLite connection pool management
- Tables:
  - `schedule_entries`: Stores synced entries
  - `sync_logs`: Audit trail of all operations
- Operations:
  - CRUD operations on entries
  - Transaction support
  - Logging of sync operations

### 4. **Notifications** (`notifications.ts`)

- **EmailNotifier**: Uses `nodemailer` with SMTP
  - HTML formatted emails
  - Configurable SMTP server
  - Subject/body templating
- **TelegramNotifier**: Uses `telegraf`
  - Markdown formatted messages
  - Bot token authentication
  - Direct chat messaging
- **NotificationManager**: Orchestrates both channels
  - `notifyNew()`: Entry added
  - `notifyAnnulled()`: Entry removed
  - `notifyError()`: Sync failures
  - `notifySyncCompleted()`: Operation summary

### 5. **Utilities** (`utils.ts`)

- Italian month name mapping (gennaio → 1, etc.)
- Time validation (hh:mm format)
- String normalization (case-insensitive matching)

### 6. **Logger** (`logger.ts`)

- Pino logger configuration
- Dual output:
  - Console (formatted JSON + human-readable)
  - File (logs/app.log with rotation)
- Log levels: debug, info, warn, error
- Async file writes for performance

### 7. **Application** (`index.ts`)

- Initialization sequence:
  1. Load .env variables (dotenv)
  2. Initialize database connection
  3. Initialize Google Sheets connection
  4. Start scheduler
  5. Register shutdown handlers (SIGTERM, SIGINT)

## Data Flow

### Sync Operation

```
1. Scheduler triggers sync()
2. SyncEngine.fetchSheetRows()
   - Call Google Sheets API
   - Deserialize rows to objects
3. SyncEngine.parseSheetEntries()
   - Extract Mese, Date, Time, Nonna columns
   - Preserve raw data as-is (no conversion or validation)
   - Filter for "maria" entries (case-insensitive)
   - Create ScheduleEntry objects with raw values
4. SyncEngine.calculateDiff()
   - Fetch all DB entries
   - Create composite keys (mese|day|time) for comparison
   - Compare Sets of keys
   - Identify added/removed entries
5. SyncEngine.applySyncOperations()
   FOR each added entry:
     - db.insertEntry()
     - db.logSync(INSERT, ...)
     - notificationManager.notifyNew()
   FOR each removed entry:
     - db.deleteEntry(mese, day, time)
     - db.logSync(DELETE, ...)
     - notificationManager.notifyAnnulled()
6. notificationManager.notifySyncCompleted()
   - Send summary to all channels

**Data Preservation Philosophy:**
- Spreadsheet data (Mese, Date, Time) is stored exactly as entered
- Typos and variations are preserved in the database
- This allows tracking the exact row state and enables future correction of data entry errors
- Example: If someone types "mazo" instead of "Marzo", we preserve "mazo" and can identify the typo later
```

### Notification Flow

```
1. Notifier receives notification request
2. EmailNotifier.send() (async)
   - Format HTML message
   - Connect to SMTP server
   - Send email
3. TelegramNotifier.send() (async)
   - Format Markdown message
   - Call Telegram API
   - Receive confirmation
4. Both run in parallel (Promise.all)
```

## Database Schema

### schedule_entries

```sql
CREATE TABLE schedule_entries (
  mese TEXT NOT NULL,               -- Italian month name (raw from spreadsheet)
  day TEXT NOT NULL,                -- Day value (raw from spreadsheet, as string)
  time TEXT NOT NULL,               -- HH:MM format (raw from spreadsheet)
  name TEXT NOT NULL,               -- "maria" or other names
  created_at TEXT NOT NULL,         -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,         -- ISO 8601 timestamp
  PRIMARY KEY (mese, day, time)     -- Composite key ensures uniqueness by exact row data
);

CREATE INDEX idx_mese_day ON schedule_entries(mese, day);
CREATE INDEX idx_time ON schedule_entries(time);
```

**Design Rationale:**

- Uses composite primary key `(mese, day, time)` instead of derived ID
- Stores raw spreadsheet values without transformation or validation
- Preserves data entry errors (e.g., "mazo" vs "Marzo") for audit trail
- Allows future correction of typos without losing track of what was entered
- Enables precise row-by-row synchronization

### sync_logs

```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_timestamp TEXT NOT NULL,     -- Operation timestamp
  action TEXT NOT NULL,             -- INSERT, UPDATE, DELETE
  entry_id TEXT,                    -- Composite key identifier (mese|day|time)
  details TEXT,                     -- JSON serialized entry
  created_at TEXT NOT NULL          -- ISO 8601 timestamp
);

CREATE INDEX idx_sync_timestamp ON sync_logs(sync_timestamp);
CREATE INDEX idx_action ON sync_logs(action);
```

## Error Handling

### Connection Errors

```typescript
try {
  await syncEngine.sync()
} catch (error) {
  logger.error('Sync failed', error)
  await notificationManager.notifyError(...)
  // Retry on next scheduled interval
}
```

### Validation Errors

```typescript
// Invalid time format → Skip row with warning
// Invalid month name → Skip row with warning
// Missing columns → Skip row with warning
```

### Notification Failures

```typescript
// Email SMTP error → Log and continue with Telegram
// Telegram API error → Log and continue with Email
// Both fail → Log error, notify on next sync
```

## Performance Considerations

### Query Optimization

- Use indexed columns for common queries
- Batch database operations within transactions
- Limit date range queries if large datasets

### API Calls

- Single Google Sheets read per sync interval
- Avoid repeated authentication (reuse session)
- Monitor API quota limits

### Notification Delivery

- Parallel email & Telegram sends (Promise.all)
- Implement exponential backoff for failures
- Consider batching notifications

### Memory Management

- Stream large responses when possible
- Limit row processing batch sizes
- Clear parsed objects after processing

## Security Considerations

1. **Credentials**
   - Store in .env file (excluded from git)
   - Never log sensitive data
   - Rotate tokens regularly

2. **Database**
   - SQLite file permissions (0600)
   - Validate all inputs before queries
   - Use parameterized queries (sqlite lib handles this)

3. **API Access**
   - Use service account for Google Sheets (preferred over API key)
   - Limit Telegram bot permissions
   - Restrict SMTP user permissions

4. **Logging**
   - Never log sensitive data (tokens, passwords)
   - Sanitize entry data before logging
   - Implement log rotation to prevent disk fill

## Deployment Patterns

### Local Development

```bash
npm install
npm run dev  # ts-node with auto-reload
```

### Production (Bare Metal)

```bash
npm ci --only=production
npm run build
npm start
# Use systemd/supervisor for process management
```

### Docker Container

```bash
docker-compose up -d
# Volumes persist: data/, logs/
# Restart policy: unless-stopped
```

### Kubernetes (Future)

- Dockerfile compatible with K8s
- StatefulSet for persistent storage
- ConfigMap for environment variables
- Secrets for credentials

## Monitoring & Debugging

### Log Analysis

```bash
# Recent errors
tail -100 logs/app.log | grep ERROR

# Sync operations
grep "Starting sync\|Sync diff" logs/app.log

# Database queries
grep -i "SELECT\|INSERT\|UPDATE\|DELETE" logs/app.log
```

### Database Inspection

```bash
# SQLite CLI
sqlite3 data/app.db

# Query all entries
SELECT * FROM schedule_entries;

# View sync history
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
```

### Health Checks

- Verify DB file exists and is readable
- Test Google Sheets API connection
- Check email/Telegram credentials
- Monitor log file size and rotation

## Extensibility

### Adding New Notification Channel

1. Create new notifier class in `notifications.ts`
2. Implement `send(payload: NotificationPayload)` method
3. Register in `NotificationManager`
4. Add environment variables

### Adding New Data Source

1. Create new sync adapter class
2. Implement same interface as `SyncEngine`
3. Update scheduler to support multiple sources
4. Add strategy pattern for multi-source sync

### Database Backend Switch

1. Create adapter interface matching `DatabaseManager`
2. Implement for PostgreSQL, MySQL, etc.
3. Update imports in `index.ts`
4. Minimal changes to business logic
