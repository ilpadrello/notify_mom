# Testing Guide - Notify Mom

## Quick Test

Run the development test suite to verify your setup:

```bash
npm test
```

## What the Test Checks

### ✅ Required Tests (Must Pass)

1. **Logger** - Verifies logging system works
2. **Database Connection** - Checks SQLite database and tables
3. **Google Sheets Connection** - Validates API credentials and sheet access

### ⚠️ Optional Tests (Nice to Have)

4. **Email Notification** - Tests SMTP configuration (not required now)
5. **Telegram Notification** - Tests Telegram bot (not required now)

## Running Tests

### Development Mode (TypeScript)

```bash
npm test
```

Uses `ts-node` to run TypeScript directly. Best for development.

### Production Mode (Compiled JavaScript)

First compile:

```bash
npm run build
```

Then run:

```bash
npm run test:prod
```

## Expected Output

### ✅ All Tests Pass

```
╔════════════════════════════════════════════════════════════╗
║           NOTIFY MOM - DEVELOPMENT TEST RESULTS            ║
╚════════════════════════════════════════════════════════════╝

📋 REQUIRED TESTS:
────────────────────────────────────────────────────────────
✅ PASS  Logger
   └─ Logger initialized and working correctly
✅ PASS  Database Connection
   └─ Database initialized successfully with 0 existing entries
✅ PASS  Google Sheets Connection
   └─ Successfully connected to Google Sheets API

📋 OPTIONAL TESTS:
────────────────────────────────────────────────────────────
⚠️  SKIP  Email Notification
   └─ Email configuration not complete - test skipped (optional for now)
⚠️  SKIP  Telegram Notification
   └─ Telegram configuration not complete - test skipped (optional for now)

📊 SUMMARY:
────────────────────────────────────────────────────────────
   ✅ Passed:  3
   ❌ Failed:  0
   ⚠️  Skipped: 2

✅ ALL TESTS PASSED - Ready to run application!
```

### ❌ Test Fails

If required tests fail, the output will show:

```
❌ FAIL  Google Sheets Connection
   └─ Google Sheets test failed: GOOGLE_SHEETS_SPREADSHEET_ID not set

❌ TEST SUITE FAILED - Fix required tests before running app
```

## Troubleshooting

### "GOOGLE_SHEETS_SPREADSHEET_ID not set"

Edit `.env` and add your spreadsheet ID:

```bash
nano .env
```

Add:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1A2B3C...from_your_sheet_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\n...
```

### "Database test failed"

Ensure `data/` folder exists:

```bash
mkdir -p data logs
```

The database will be created automatically.

### "Logger test failed"

Check that `logs/` folder exists:

```bash
mkdir -p logs
```

## Test Flow

```
1. Start Logger
   ↓
2. Connect to Database
   ├─ Create data/ folder if needed
   ├─ Open/create app.db
   ├─ Create tables if needed
   └─ Query entries to verify
   ↓
3. Connect to Google Sheets
   ├─ Check environment variables
   ├─ Initialize API connection
   └─ Verify spreadsheet access
   ↓
4. Test Email (Optional)
   ├─ Check SMTP configuration
   ├─ Construct test notification
   └─ Skip actual send (optional)
   ↓
5. Test Telegram (Optional)
   ├─ Check bot token & chat ID
   ├─ Construct test message
   └─ Skip actual send (optional)
   ↓
6. Print Results & Exit
```

## When to Run Tests

| Scenario            | Command             |
| ------------------- | ------------------- |
| First setup         | `npm test`          |
| After config change | `npm test`          |
| Before running app  | `npm test`          |
| After env changes   | `npm test`          |
| Production build    | `npm run test:prod` |

## After Tests Pass

Once all required tests pass, you can run:

```bash
npm start
```

Application will start syncing with Google Sheets every 15 minutes.

## Notes

- **Tests don't modify data** - Safe to run anytime
- **Optional tests skip** if config incomplete - That's OK!
- **Required tests fail fast** - Catch issues early
- **No emails/messages sent** - Test just verifies config
