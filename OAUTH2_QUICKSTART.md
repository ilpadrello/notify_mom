# Quick Start - OAuth2 Authentication

Get up and running in 5 minutes! 🚀

## Step 1: Initial Setup (One Time)

```bash
./init.sh
```

This prepares your environment.

## Step 2: Get Google OAuth2 Credentials (5 minutes)

### Quick Steps:

1. Go to: https://console.cloud.google.com/
2. Create new project (name: "Notify Mom")
3. Search: "Google Sheets API" → Enable it
4. Create → OAuth client ID
   - Type: Desktop application
   - Name: notify-mom-cli
5. Copy the **Client ID** and **Client Secret**

**Detailed guide:** See [OAUTH2_SETUP.md](OAUTH2_SETUP.md)

## Step 3: Configure .env

```bash
nano .env
```

Add your credentials:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id_here
GOOGLE_OAUTH_CLIENT_ID=paste_here
GOOGLE_OAUTH_CLIENT_SECRET=paste_here
```

Save (Ctrl+X, Y, Enter)

## Step 4: Authenticate

```bash
npm run auth
```

You'll see:

1. A Google login URL → Click it
2. Sign in with your Google account
3. Grant permission
4. Get redirected with a `code=...` in the URL
5. Copy the code and run:
   ```bash
   npm run auth -- YOUR_CODE_HERE
   ```

## Step 5: Verify Setup

```bash
npm test
```

Should show:

```
✅ Logger
✅ Database Connection
✅ Google Sheets Connection (OAuth2)
```

## Step 6: Run!

```bash
npm start
```

Your app is now syncing! 🎉

## Development Mode (With Auto-Reload)

```bash
npm run dev
```

## Production Mode (Compiled)

```bash
npm run build
npm start
```

## Troubleshooting

**No token.json?**

```bash
npm run auth
```

**Can't find spreadsheet ID?**

- Open your Google Sheets
- Copy from URL: `docs.google.com/spreadsheets/d/[ID]/edit`

**Tests failing?**

```bash
npm run build  # Recompile
npm test       # Try again
```

## What Gets Synced?

The app syncs data from your Google Sheet to local SQLite database:

- ✅ Every 15 minutes (configurable)
- ✅ Tracks additions and deletions
- ✅ Sends notifications on changes
- ✅ Logs all activity

## Command Reference

| Command         | Purpose                   |
| --------------- | ------------------------- |
| `npm install`   | Install dependencies      |
| `npm run build` | Compile TypeScript        |
| `npm run auth`  | Authenticate with Google  |
| `npm test`      | Test your setup           |
| `npm start`     | Run the app (production)  |
| `npm run dev`   | Run the app (development) |
| `npm run lint`  | Check code style          |

## File Locations

```
.env               ← Your configuration (don't commit!)
token.json         ← Your auth token (don't commit!)
data/app.db        ← Your database (auto-created)
logs/app.log       ← Your logs (auto-created)
src/               ← Source code (TypeScript)
build/             ← Compiled code (JavaScript)
```

## Security Notes

🔒 Keep these files private:

- `token.json` - Your access token
- `.env` - Your credentials

✅ Already in `.gitignore` so won't be committed to git

## Full Guides

- **[OAUTH2_SETUP.md](OAUTH2_SETUP.md)** - Detailed OAuth2 configuration
- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** - All ways to run the app
- **[TEST.md](TEST.md)** - Testing guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - How the app works

## Need Help?

1. Check relevant guide above
2. Run `npm test` to diagnose issues
3. Check `logs/app.log` for detailed error messages

---

**You're all set!** Run `npm start` to begin syncing. 🚀
