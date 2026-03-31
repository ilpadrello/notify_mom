# Setup Guide - Notify Mom

This guide will help you set up and run the Notify Mom application.

## Quick Start (Automated)

If you're on macOS or Linux, the easiest way is to use the setup script:

```bash
./init.sh
```

This will:

- ✅ Check Node.js installation
- ✅ Create required folders (`data/`, `logs/`)
- ✅ Install npm dependencies
- ✅ Build TypeScript to JavaScript
- ✅ Copy `.env.example` to `.env`

## Manual Setup

If you prefer manual setup or the script doesn't work:

### 1. Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/))
- **npm 10+** (comes with Node.js)
- **Google Cloud Project** with Sheets API enabled
- **SMTP Email Account** (for email notifications)
- **Telegram Bot Token** (for Telegram notifications)

### 2. Folder Structure

Create these folders:

```bash
mkdir -p data        # For SQLite database
mkdir -p logs        # For application logs
```

The app will auto-create:

- `data/app.db` - SQLite database
- `logs/app.log` - Application logs

### 3. Install Dependencies

```bash
npm install
```

This installs all required packages from `package.json`.

### 4. Build TypeScript

```bash
npm run build
```

This compiles TypeScript from `src/` to JavaScript in `build/`.

### 5. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your OAuth2 credentials:

```env
# Google Sheets (OAuth2)
GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id_here
GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
# Token will be auto-saved to token.json after authentication

# Email (SMTP) - Optional
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFY_EMAIL_TO=recipient@example.com

# Telegram - Optional
ENABLE_TELEGRAM_NOTIFICATIONS=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Scheduler
SYNC_INTERVAL_MINUTES=15

# Database & Logging
DATABASE_PATH=./data/app.db
LOG_FILE_PATH=./logs/app.log
```

### 5a. Get OAuth2 Credentials

See detailed instructions: [OAUTH2_SETUP.md](OAUTH2_SETUP.md)

Quick summary:

1. Create project in Google Cloud Console
2. Enable Google Sheets API
3. Create OAuth2 Desktop credentials
4. Copy Client ID and Client Secret to `.env`

### 5b. Authenticate with Google

After setting up `.env`, run:

```bash
npm run auth
```

This will:

1. Show you a Google login URL
2. Ask you to authorize the app
3. Save your token to `token.json` (auto-created, don't share!)
4. You're ready to run the app!

### 5c. Verify Configuration

Test your setup:

```bash
npm test
```

Should show all tests passing.

## Running the Application

### Option 1: Direct Node.js

```bash
npm start
```

This runs: `node build/index.js`

### Option 2: Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `ts-node` to run TypeScript directly without compiling first.

### Option 3: Docker

```bash
docker-compose up
```

This builds and runs the app in a container. Edit `docker-compose.yml` to set environment variables.

### Option 4: Docker Build & Run Manually

```bash
# Build image
docker build -t notify-mom .

# Run container
docker run -d \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  notify-mom
```

## Database Initialization

The database is **automatically initialized** on first run:

1. App checks if `data/` folder exists (creates it if not)
2. Opens SQLite connection to `data/app.db` (creates file if not exists)
3. Creates tables:
   - `schedule_entries` - Stores synced data
   - `sync_logs` - Audit trail of all operations

**No manual SQL needed!** Just run the app.

## Folder Structure

```
notify_mom/
├── src/                  # TypeScript source files
│   ├── index.ts         # Application entry point
│   ├── database.ts      # SQLite database manager
│   ├── sync.ts          # Google Sheets sync engine
│   ├── scheduler.ts     # 15-minute scheduler
│   ├── notifications.ts # Email & Telegram notifier
│   ├── logger.ts        # Logging configuration
│   └── utils.ts         # Utility functions
├── build/               # Compiled JavaScript (auto-generated)
├── data/                # SQLite database & app data
│   └── app.db          # Main database (auto-created)
├── logs/                # Application logs
│   └── app.log         # Application log file
├── .env                 # Configuration (created from .env.example)
├── .env.example         # Template configuration
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
├── init.sh              # Setup script
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── README.md            # Project overview
├── QUICKSTART.md        # Quick start guide
├── SETUP.md             # This file
├── ARCHITECTURE.md      # Technical architecture
└── IMPLEMENTATION.md    # Implementation details
```

## Troubleshooting

### Error: "GOOGLE_SHEETS_SPREADSHEET_ID not set"

**Solution:** Set environment variables in `.env` file:

```bash
echo "GOOGLE_SHEETS_SPREADSHEET_ID=1A2B3C..." >> .env
```

### Error: "No sheets found in document"

**Solution:**

- Check that spreadsheet ID is correct
- Verify Google Sheets API is enabled in your project
- Check service account has access to the spreadsheet

### Database locked

**Solution:**

- Close any other connections to `data/app.db`
- Restart the application

### Permission denied on init.sh

**Solution:**

```bash
chmod +x init.sh
./init.sh
```

## Environment Variables Reference

| Variable                       | Required | Description                                         |
| ------------------------------ | -------- | --------------------------------------------------- |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Yes      | Google Sheets ID (from URL)                         |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes      | Service account email                               |
| `GOOGLE_SERVICE_ACCOUNT_KEY`   | Yes      | Private key from JSON file                          |
| `SMTP_HOST`                    | Yes      | SMTP server (e.g., smtp.gmail.com)                  |
| `SMTP_PORT`                    | Yes      | SMTP port (usually 587 or 465)                      |
| `SMTP_USER`                    | Yes      | Email address for SMTP                              |
| `SMTP_PASS`                    | Yes      | Email password or app password                      |
| `NOTIFICATION_EMAIL`           | Yes      | Where to send alerts                                |
| `TELEGRAM_BOT_TOKEN`           | No       | Telegram bot token                                  |
| `TELEGRAM_CHAT_ID`             | No       | Telegram chat ID                                    |
| `SYNC_INTERVAL`                | No       | Minutes between syncs (default: 15)                 |
| `DATABASE_PATH`                | No       | Path to SQLite DB (default: ./data/app.db)          |
| `LOG_PATH`                     | No       | Path to log file (default: ./logs/app.log)          |
| `LOG_LEVEL`                    | No       | Log level: debug, info, warn, error (default: info) |

## Getting Google Sheets Credentials

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google Sheets API

### Step 2: Create Service Account

1. Go to "Service Accounts" in Google Cloud Console
2. Create new service account
3. Grant "Editor" role

### Step 3: Create JSON Key

1. Select service account
2. Go to "Keys" tab
3. Create new JSON key
4. Copy the key content to `.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` field
   - `GOOGLE_SERVICE_ACCOUNT_KEY` = `private_key` field

### Step 4: Share Spreadsheet

Share your Google Sheet with the service account email address.

## Getting Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to create bot
4. Copy the bot token to `.env` as `TELEGRAM_BOT_TOKEN`
5. Get your chat ID:
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Copy your `chat_id`
   - Set `TELEGRAM_CHAT_ID` in `.env`

## Next Steps

- Read [README.md](README.md) for project overview
- Check [QUICKSTART.md](QUICKSTART.md) for quick examples
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
