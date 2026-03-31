# Quick Start Guide

## 1. Installation (Choose One)

### Local Development

```bash
npm install
npm run build
npm start
```

### Docker

```bash
docker-compose up -d
```

## 2. Setup Credentials

### Create .env file:

```bash
cp .env.example .env
```

### Minimal Configuration:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_API_KEY=your_api_key
```

### With Notifications:

```env
# Email
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFY_EMAIL_TO=recipient@example.com

# Telegram
ENABLE_TELEGRAM_NOTIFICATIONS=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 3. Google Sheets Format

Your spreadsheet should have:

| Mese  | Date | Italy Time | Nonna |
| ----- | ---- | ---------- | ----- |
| Marzo | 15   | 14:30      | Maria |

## 4. Monitoring

### Local Logs:

```bash
tail -f logs/app.log
```

### Docker Logs:

```bash
docker-compose logs -f notify-mom
```

## 5. Architecture Overview

```
Google Sheets (source)
    ↓
    Scheduler (every 15 min)
    ↓
    Sync Engine (detects changes)
    ↓
    Database (SQLite)
    ↓
    Notifications (Email + Telegram)
```

## 6. Key Features

- **Unique ID**: YYYY-MM-DD_HH:MM (Italian month → numeric)
- **Filtering**: Only rows where "Nonna" column contains "maria"
- **Events**:
  - NOTIFY_NEW: Entry added to sheet
  - NOTIFY_ANNULLED: Entry removed from sheet
- **Interval**: 15 minutes (configurable)

## 7. Troubleshooting

| Issue            | Solution                              |
| ---------------- | ------------------------------------- |
| No sync          | Check Google credentials in .env      |
| No notifications | Verify ENABLE\_\*\_NOTIFICATIONS=true |
| DB locked        | Kill old instances                    |
| API limit        | Increase SYNC_INTERVAL_MINUTES        |

## 8. File Reference

- **src/index.ts** - Entry point
- **src/sync.ts** - Google Sheets integration
- **src/database.ts** - SQLite operations
- **src/notifications.ts** - Email & Telegram
- **src/scheduler.ts** - Cron scheduling
- **src/utils.ts** - Date/ID utilities
- **src/logger.ts** - Logging setup

## 9. Commands

```bash
npm run dev       # Development with auto-reload
npm run build     # Compile TypeScript
npm start         # Run production build
npm run lint      # Check code quality
docker-compose logs -f  # Real-time logs
docker-compose down     # Stop services
```

## 10. Next Steps

1. Get Google Sheets API credentials
2. Set up email/Telegram (optional)
3. Create .env file
4. Run: `npm install && npm run build`
5. Test: `npm start`
6. Deploy: `docker-compose up -d`
