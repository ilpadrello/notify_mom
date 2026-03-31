# Implementation & Deployment Guide

## Project Summary

**notify_mom** is a production-ready Node.js TypeScript application that:

- Synchronizes Google Spreadsheet data with a local SQLite database
- Runs on a 15-minute schedule (configurable)
- Detects changes and sends notifications via Email and/or Telegram
- Includes comprehensive logging, error handling, and Docker support

## Statistics

- **TypeScript Code**: 982 lines across 7 modules
- **Dependencies**: 20+ npm packages with full type support
- **Configuration Files**: package.json, tsconfig.json, docker-compose.yml, .env.example
- **Documentation**: README.md, QUICKSTART.md, ARCHITECTURE.md, this guide
- **Database**: SQLite with 2 tables (schedule_entries, sync_logs)

## Installation Steps

### Step 1: Clone/Setup Project

```bash
cd /home/padrello/Desktop/Personal/notify_mom
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:

- **Core**: typescript, ts-node, dotenv
- **Google Sheets**: google-spreadsheet, google-auth-library
- **Database**: sqlite, sqlite3
- **Scheduler**: node-cron
- **Notifications**: nodemailer, telegraf
- **Logging**: pino, pino-transport
- **Utilities**: luxon
- **Development**: @types/node, @typescript-eslint/\*

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials (see below)
```

### Step 4: Build TypeScript

```bash
npm run build
```

Creates `build/` directory with compiled JavaScript.

### Step 5: Run Application

**Local Development** (with auto-reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

## Configuration Details

### Google Sheets Setup

**Prerequisite**: You need a Google Spreadsheet with columns:

- `Mese`: Italian month name (gennaio, febbraio, marzo, etc.)
- `Date`: Day of month (1-31)
- `Italy Time` or `France Time`: Time in hh:mm format
- `Nonna`: Name field (filtered for "maria")

**Example Row**:

```
Mese     | Date | Italy Time | Nonna
---------|------|------------|-------
Marzo    | 15   | 14:30      | Maria
Aprile   | 10   | 09:00      | Maria
Maggio   | 20   | 16:45      | Lucia  (skipped - not maria)
```

### Option A: API Key (Simple, Read-only)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google Sheets API
3. Create API Key credential
4. Share spreadsheet publicly or via API key
5. In `.env`:
   ```
   GOOGLE_SHEETS_SPREADSHEET_ID=1ABC...XYZ
   GOOGLE_SHEETS_API_KEY=AIzaSyD...ABC
   ```

### Option B: Service Account (Recommended, Secure)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google Sheets API
3. Create Service Account → Generate JSON key
4. Download JSON key file
5. Share spreadsheet with service account email
6. In `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=notify-mom@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/key.json
   ```

### Email Notifications

**Gmail** (recommended):

1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. In `.env`:
   ```
   ENABLE_EMAIL_NOTIFICATIONS=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   NOTIFY_EMAIL_TO=recipient@example.com
   ```

**Custom SMTP**:

```
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### Telegram Notifications

1. Create bot: Message [@BotFather](https://t.me/botfather) on Telegram
2. Get your Chat ID: Message your bot, then visit:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. In `.env`:
   ```
   ENABLE_TELEGRAM_NOTIFICATIONS=true
   TELEGRAM_BOT_TOKEN=123456789:ABCD...XYZ
   TELEGRAM_CHAT_ID=987654321
   ```

## Docker Deployment

### Local Docker (Without Compose)

```bash
# Build image
docker build -t notify-mom:latest .

# Create volumes
docker volume create notify-mom-data
docker volume create notify-mom-logs

# Run container
docker run -d \
  --name notify-mom \
  -e GOOGLE_SHEETS_SPREADSHEET_ID=xxx \
  -e GOOGLE_SHEETS_API_KEY=yyy \
  -e ENABLE_EMAIL_NOTIFICATIONS=true \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e SMTP_USER=email@gmail.com \
  -e SMTP_PASS=apppass \
  -e NOTIFY_EMAIL_TO=mom@example.com \
  -v notify-mom-data:/app/data \
  -v notify-mom-logs:/app/logs \
  --restart unless-stopped \
  notify-mom:latest

# Check logs
docker logs -f notify-mom

# Stop container
docker stop notify-mom
docker rm notify-mom
```

### Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View real-time logs
docker-compose logs -f notify-mom

# Check service status
docker-compose ps

# Restart service
docker-compose restart notify-mom

# Stop services
docker-compose down

# Remove volumes (caution: deletes data)
docker-compose down -v
```

## Development Workflow

### Code Structure

```
src/
├── index.ts              # App entry point
├── logger.ts             # Logging setup
├── database.ts           # SQLite manager
├── sync.ts               # Google Sheets sync
├── notifications.ts      # Email & Telegram
├── scheduler.ts          # Cron scheduling
└── utils.ts              # Utilities
```

### Making Changes

1. **Edit TypeScript**:

   ```bash
   # Development mode watches for changes
   npm run dev
   ```

2. **Compile**:

   ```bash
   npm run build
   ```

3. **Test Run**:

   ```bash
   npm start
   ```

4. **Lint**:
   ```bash
   npm run lint
   ```

### Adding Features

**Example: Add SMS Notification Channel**

1. Edit `src/notifications.ts`:

   ```typescript
   class SMSNotifier {
     async send(payload: NotificationPayload): Promise<boolean> {
       // Use AWS SNS or Twilio API
     }
   }
   ```

2. Update `NotificationManager`:

   ```typescript
   private smsNotifier: SMSNotifier;

   async notifyNew(entryId: string, details: Record<string, unknown>): Promise<void> {
     await Promise.all([
       this.emailNotifier.send(payload),
       this.telegramNotifier.send(payload),
       this.smsNotifier.send(payload),  // New!
     ]);
   }
   ```

3. Add environment variables to `.env.example`:
   ```
   ENABLE_SMS_NOTIFICATIONS=true
   SMS_API_KEY=xxx
   SMS_PHONE_NUMBER=+1234567890
   ```

## Troubleshooting

### Issue: "Cannot find module 'google-spreadsheet'"

**Solution**: Run `npm install` again

```bash
npm install
npm run build
```

### Issue: Database "file is locked"

**Solution**: Only one instance should run. Kill previous:

```bash
# Local
pkill -f "node build/src/index.js"

# Docker
docker stop notify-mom
docker rm notify-mom
```

### Issue: No notifications sent

**Solutions**:

1. Verify `ENABLE_*_NOTIFICATIONS=true`
2. Check credentials in `.env`
3. Review logs:
   ```bash
   tail -100 logs/app.log | grep -i "notif"
   ```

### Issue: Sync not running

**Solutions**:

1. Verify Google Sheets credentials are correct
2. Check spreadsheet is accessible
3. Review logs:
   ```bash
   tail -100 logs/app.log | grep -i "sync\|error"
   ```

### Issue: Credentials file not found

**Solution**: Ensure path is absolute:

```env
GOOGLE_SERVICE_ACCOUNT_KEY=/home/user/notify-mom/keys/service-account.json
```

## Monitoring

### Log Files

```bash
# View recent logs
tail -50 logs/app.log

# Search for errors
grep ERROR logs/app.log

# Search for specific events
grep "NOTIFY_NEW\|NOTIFY_ANNULLED" logs/app.log
```

### Database Inspection

```bash
# Connect to database
sqlite3 data/app.db

# Query entries
SELECT * FROM schedule_entries;

# View sync history (last 10)
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;

# Count entries
SELECT COUNT(*) FROM schedule_entries;

# Exit SQLite
.quit
```

### System Monitoring

```bash
# Check disk usage
du -sh logs/ data/

# Check process memory (Docker)
docker stats notify-mom

# Check process resource usage (Local)
ps aux | grep "node build"
```

## Performance Optimization

### For Large Datasets

- **Add database indices**:

  ```bash
  sqlite3 data/app.db
  CREATE INDEX idx_nonna ON schedule_entries(name);
  .quit
  ```

- **Adjust sync interval**:
  ```env
  SYNC_INTERVAL_MINUTES=30  # Reduce API calls
  ```

### For Reliability

- **Increase retry logic**: Implement exponential backoff
- **Add health checks**: Monitor CPU/memory/disk
- **Log rotation**: Use `logrotate` or Docker volume management

## Backup & Recovery

### Backup Database

```bash
# Copy database file
cp data/app.db data/app.db.backup.$(date +%Y%m%d_%H%M%S)

# Or with Docker
docker cp notify-mom:/app/data/app.db ./backup/app.db.backup
```

### Restore from Backup

```bash
# Stop service
docker-compose down

# Restore file
cp backup/app.db.backup data/app.db

# Restart
docker-compose up -d
```

## Production Checklist

- [ ] Google Sheets credentials configured
- [ ] Spreadsheet shared with service account email
- [ ] Email SMTP credentials tested
- [ ] Telegram bot token verified
- [ ] .env file created (not committed)
- [ ] TypeScript compiled successfully
- [ ] Application starts without errors
- [ ] Scheduler running (logs show "Scheduler started")
- [ ] Database created (data/app.db exists)
- [ ] Logs writing to file (logs/app.log)
- [ ] Notifications configured and tested
- [ ] Docker image builds successfully
- [ ] Docker Compose services start
- [ ] Volume persistence verified (data survives container restart)
- [ ] Backup strategy in place
- [ ] Monitoring/alerting configured

## Support & Resources

- **GitHub**: https://github.com/ilpadrello/notify_mom
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **Google Sheets API**: https://developers.google.com/sheets/api
- **Telegram Bot API**: https://core.telegram.org/bots
- **Node.js**: https://nodejs.org/docs/

## License

ISC License - See LICENSE file for details
