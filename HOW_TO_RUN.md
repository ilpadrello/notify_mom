# How to Run Notify Mom

## 🚀 Quick Start (30 seconds)

### Using Setup Script (Recommended for macOS/Linux)

```bash
./init.sh
npm start
```

### Using Docker (Recommended for any OS)

```bash
docker-compose up
```

---

## 📋 Detailed Setup & Run Instructions

### First Time Setup

#### Option A: Automatic Setup (easiest)

```bash
# Make script executable (already done, but just in case)
chmod +x init.sh

# Run setup script
./init.sh

# This will:
# 1. Check Node.js/npm
# 2. Create data/ and logs/ folders
# 3. Install npm packages
# 4. Compile TypeScript
# 5. Create .env file from template
```

#### Option B: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Create required folders
mkdir -p data logs

# 4. Copy environment template
cp .env.example .env

# 5. Edit .env with your credentials
nano .env   # or use your editor
```

### Configuration (.env file)

After setup, you **must** edit `.env` file:

```bash
nano .env
```

Fill in these required values:

```env
# Google Sheets (REQUIRED)
GOOGLE_SHEETS_SPREADSHEET_ID=1A2B3C...from_your_sheet_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\n...

# Email Notifications (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=mom@example.com

# Telegram Notifications (OPTIONAL)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=987654321
```

See [SETUP.md](SETUP.md) for credential instructions.

---

## ▶️ Running the Application

### Option 1: Direct Node.js (Production)

```bash
npm start
```

**What it does:**

- Runs compiled JavaScript from `build/` folder
- Connects to SQLite database
- Syncs with Google Sheets every 15 minutes
- Sends notifications on changes

**Output:** Application runs in foreground, logs to console and `logs/app.log`

### Option 2: Development Mode

```bash
npm run dev
```

**What it does:**

- Uses `ts-node` for direct TypeScript execution
- No need to compile first
- Better for development with auto-restart features

### Option 3: Docker Container

#### Using Docker Compose (Easiest)

```bash
# Start
docker-compose up

# Stop (Ctrl+C)
# Or in another terminal:
docker-compose down
```

**What it does:**

- Builds Docker image automatically
- Runs app in isolated container
- Mounts `data/` and `logs/` volumes
- Uses `.env` file for configuration

#### Using Docker Manually

```bash
# Build image
docker build -t notify-mom .

# Run container
docker run -d \
  --name notify_mom \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  notify-mom

# View logs
docker logs -f notify_mom

# Stop container
docker stop notify_mom

# Remove container
docker rm notify_mom
```

### Option 4: Background Process (Linux/macOS)

```bash
# Start in background
npm start > logs/output.log 2>&1 &

# Get process ID
ps aux | grep "node build"

# Stop it
kill <PID>
```

---

## 📊 What Happens When You Run It

### Startup Sequence

1. **Load Configuration**
   - Read `.env` file
   - Initialize logger

2. **Database Setup**
   - Create `data/app.db` if not exists
   - Create tables: `schedule_entries`, `sync_logs`

3. **Connect to Google Sheets**
   - Authenticate using service account
   - Validate spreadsheet exists
   - Check for valid sheets

4. **Start Scheduler**
   - First sync runs immediately
   - Then runs every 15 minutes

5. **Ready**
   - Application is ready and waiting for sync times

### Sync Operation (Every 15 Minutes)

1. **Fetch Data**
   - Get all valid sheets from spreadsheet
   - Check for required columns (Mese, Date, Time)
   - Download row data

2. **Process Data**
   - Parse Italian month names
   - Filter for "maria" entries
   - Preserve raw data as-is

3. **Compare with Database**
   - Find new entries (added)
   - Find removed entries (deleted)
   - Only consider valid sheets

4. **Apply Changes**
   - Insert new entries
   - Delete removed entries
   - Log all operations

5. **Send Notifications**
   - Email: New/deleted entries
   - Telegram: Same notifications
   - Summary on completion

6. **Log Results**
   - Record in `sync_logs` table
   - Write to `logs/app.log`

---

## 🛑 Stopping the Application

### If Running in Terminal

Press **Ctrl+C**

### If Running in Docker

```bash
docker-compose down
```

### If Running in Background

```bash
# Find the process
ps aux | grep "node build"

# Kill by PID
kill <PID>

# Or kill all Node processes
killall node
```

---

## 📁 Folder Structure After Setup

```
notify_mom/
├── src/                    # Source TypeScript files
│   ├── index.ts           # Entry point
│   ├── database.ts        # SQLite management
│   ├── sync.ts            # Sheet sync engine
│   ├── scheduler.ts       # 15-min scheduler
│   ├── notifications.ts   # Email & Telegram
│   ├── logger.ts          # Logging
│   └── utils.ts           # Utilities
│
├── build/                  # Compiled JavaScript (auto-generated)
│   ├── index.js
│   ├── database.js
│   └── ...
│
├── data/                   # Application data
│   └── app.db             # SQLite database (auto-created)
│
├── logs/                   # Application logs
│   └── app.log            # Log file (auto-created on first run)
│
├── node_modules/           # Dependencies (after npm install)
│
├── .env                    # Configuration (EDIT THIS!)
├── .env.example            # Template
├── package.json            # Project metadata & scripts
├── tsconfig.json           # TypeScript configuration
├── init.sh                 # Setup script
├── Dockerfile              # Docker image config
├── docker-compose.yml      # Docker Compose config
│
└── Documentation
    ├── README.md           # Project overview
    ├── SETUP.md            # Setup instructions (this file)
    ├── QUICKSTART.md       # Quick examples
    ├── ARCHITECTURE.md     # Technical architecture
    └── IMPLEMENTATION.md   # Implementation details
```

---

## ✅ Verification Checklist

After running the app, verify:

- ✅ `.env` file is configured with your credentials
- ✅ `data/app.db` exists (created automatically)
- ✅ `logs/app.log` exists or creates on first sync
- ✅ Application starts without errors
- ✅ First sync completes successfully
- ✅ Notifications are received (email/Telegram)

---

## 🐛 Common Issues & Solutions

### "Cannot find module 'sqlite3'"

```bash
npm install
npm run build
```

### "GOOGLE_SHEETS_SPREADSHEET_ID not set"

Edit `.env` and add your spreadsheet ID.

### "No sheets found in document"

- Check Google Sheets ID is correct
- Verify Google Sheets API is enabled
- Confirm service account has access

### Database locked

Close any other connections and restart.

### Permissions error on init.sh

```bash
chmod +x init.sh
```

### Docker container exits immediately

Check logs:

```bash
docker-compose logs app
```

---

## 📚 Next Steps

1. **Read [README.md](README.md)** - Project overview
2. **Check [ARCHITECTURE.md](ARCHITECTURE.md)** - How it works
3. **See [SETUP.md](SETUP.md)** - Detailed setup guide
4. **Try [QUICKSTART.md](QUICKSTART.md)** - Quick examples

---

## 💡 Tips

- **Development:** Use `npm run dev` for quick testing
- **Debugging:** Set `LOG_LEVEL=debug` in `.env`
- **Monitoring:** Tail logs with `tail -f logs/app.log`
- **Database:** Use SQLite tools to inspect `data/app.db`
- **Docker:** Use `docker-compose logs -f` for live logs

---

## 🆘 Need Help?

1. Check logs: `logs/app.log`
2. Review [SETUP.md](SETUP.md) for configuration
3. Verify [ARCHITECTURE.md](ARCHITECTURE.md) for understanding flow
4. Check environment variables in `.env`
