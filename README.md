# Notify Mom

Synchronizes a Google Spreadsheet with SQLite and sends notifications (Email & Telegram) when entries change. Runs on a configurable schedule (default: every 15 minutes).

## Features

✅ **Google Sheets Integration** - Reads data from a Google Spreadsheet using Google Sheets API  
✅ **SQLite Database** - Stores entries locally with sync state tracking  
✅ **Intelligent Sync** - Detects new entries, removed entries, and triggers appropriate notifications  
✅ **Multi-Channel Notifications** - Email and Telegram support  
✅ **Italian Date Parsing** - Converts Italian month names to numeric format  
✅ **Scheduled Sync** - Runs every 15 minutes (configurable) using node-cron  
✅ **Comprehensive Logging** - Pino logger with file and console outputs  
✅ **Docker Support** - Docker & Docker Compose for easy deployment  
✅ **TypeScript** - Fully typed for better developer experience

## Project Structure

```
notify_mom/
├── src/
│   ├── index.ts              # Application entry point
│   ├── logger.ts             # Pino logger configuration
│   ├── database.ts           # SQLite database manager
│   ├── utils.ts              # Utilities (date parsing, ID generation)
│   ├── notifications.ts      # Email & Telegram notifiers
│   ├── sync.ts               # Google Sheets sync engine
│   └── scheduler.ts          # Cron job scheduler
├── build/                    # Compiled TypeScript output
├── logs/                     # Application logs
├── data/                     # SQLite database file
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Container image definition
├── docker-compose.yml        # Container orchestration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Prerequisites

- **Node.js** 20+ (for local development)
- **Docker & Docker Compose** (for containerized deployment)
- **Google Sheets API Key** or Service Account credentials
- **SMTP credentials** (for email notifications, optional)
- **Telegram Bot Token** (for Telegram notifications, optional)

## Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### Required Variables

- `GOOGLE_SHEETS_SPREADSHEET_ID` - Your Google Spreadsheet ID
- `GOOGLE_SHEETS_API_KEY` - Google API Key (OR service account credentials)

### Optional Variables

- `ENABLE_EMAIL_NOTIFICATIONS` - Set to `true` to enable email notifications
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP configuration
- `NOTIFY_EMAIL_TO` - Recipient email address
- `ENABLE_TELEGRAM_NOTIFICATIONS` - Set to `true` for Telegram
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Target chat ID for notifications
- `SYNC_INTERVAL_MINUTES` - Sync interval (default: 15)

## Installation

### Local Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Build TypeScript:**

   ```bash
   npm run build
   ```

4. **Start application:**

   ```bash
   npm start
   ```

5. **Development mode** (with auto-reload):
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Build and start with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

3. **View logs:**

   ```bash
   docker-compose logs -f notify-mom
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Data Mapping

### Column Requirements

Your Google Sheet should have these columns:

| Column                           | Type   | Example | Notes                              |
| -------------------------------- | ------ | ------- | ---------------------------------- |
| **Mese**                         | Text   | Marzo   | Italian month name                 |
| **Date**                         | Number | 15      | Day of month (1-31)                |
| **Italy Time** / **France Time** | Time   | 14:30   | Time in hh:mm format               |
| **Nonna**                        | Text   | Maria   | Person name (filtered for 'maria') |

### Unique ID Generation

Entries are uniquely identified by combining:

- Month (Italian → numeric)
- Day
- Time

Format: `YYYY-MM-DD_HH:MM`

Example: `2026-03-15_14:30`

## Notification System

### Email Notifications

Requires SMTP configuration. Supports:

- Gmail (use app-specific password)
- Office 365
- Custom SMTP servers

**Features:**

- HTML formatted emails
- Detailed entry information
- Timestamp tracking

### Telegram Notifications

Requires Telegram Bot Token and Chat ID.

**To get your Chat ID:**

1. Create a bot with @BotFather
2. Message your bot
3. Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Extract `chat.id` from the response

## Sync Events

### NOTIFY_NEW

Triggered when a new entry is found in the spreadsheet (not in database):

- Inserts entry to database
- Sends email notification
- Sends Telegram notification

### NOTIFY_ANNULLED

Triggered when a database entry is no longer in the spreadsheet:

- Deletes entry from database
- Sends email notification
- Sends Telegram notification

## Logging

Logs are written to:

- **Console** - Real-time output in terminal
- **File** - `logs/app.log` (rotated daily)

Log levels: `debug`, `info`, `warn`, `error`

## Database Schema

### schedule_entries

```sql
CREATE TABLE schedule_entries (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  day INTEGER NOT NULL,
  time TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### sync_logs

```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  entry_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
```

## Google Sheets API Setup

### Option 1: Using API Key (Read-only)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Sheets API**
4. Create an **API Key** credential
5. Share your spreadsheet publicly or grant access to the API key
6. Add `GOOGLE_SHEETS_API_KEY` to `.env`

### Option 2: Using Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Sheets API**
4. Create a **Service Account**
5. Generate a JSON key for the service account
6. Share your spreadsheet with the service account email
7. Add credentials to `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/key.json
   ```

## Development Scripts

```bash
npm run build      # Compile TypeScript
npm start          # Run compiled application
npm run dev        # Run with ts-node (development)
npm run lint       # Run ESLint
npm test           # Run tests (not implemented yet)
```

## Docker Commands

```bash
# Build image
docker build -t notify-mom .

# Run container
docker run -d --name notify-mom \
  -e GOOGLE_SHEETS_SPREADSHEET_ID=... \
  -e GOOGLE_SHEETS_API_KEY=... \
  -v notify-mom-data:/app/data \
  notify-mom

# View logs
docker logs -f notify-mom

# Stop container
docker stop notify-mom
```

## Troubleshooting

### Sync not running

- Check if credentials are valid
- Review logs: `docker-compose logs notify-mom`
- Verify spreadsheet is accessible

### Notifications not sent

- Verify SMTP/Telegram credentials
- Check `ENABLE_*_NOTIFICATIONS` is set to `true`
- Review error logs

### Database locked

- Ensure only one instance is running
- Check file permissions on `data/app.db`

## Performance Tuning

- **Reduce sync interval** for near real-time updates (min: 1 minute)
- **Increase interval** to reduce API calls and cost
- Monitor Google Sheets API quota
- Configure database indices if large datasets

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

ISC - See LICENSE file for details

## Support

For issues and feature requests, please open an issue on GitHub.

---

**Author:** Simone Panebianco  
**Repository:** https://github.com/ilpadrello/notify_mom
