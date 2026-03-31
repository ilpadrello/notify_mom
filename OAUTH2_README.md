# OAuth2 Authentication Implementation Summary

## Overview

✅ Successfully migrated from Service Account to OAuth2 User Account authentication for Google Sheets access.

## What This Means

The script now:

- ✅ Uses **your personal Google account** instead of a service account
- ✅ Acts as **you** when accessing your Google Sheets
- ✅ Stores authentication token in **local `token.json`** file (encrypted, never shared)
- ✅ Automatically **refreshes** the token when it expires
- ✅ Works with any sheet **you personally have access to**

## Key Changes

### New Files Created

| File                   | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `src/oauth.ts`         | OAuth2 authentication manager (manages tokens, refresh, etc.) |
| `src/auth.ts`          | CLI tool for user authentication (`npm run auth`)             |
| `OAUTH2_SETUP.md`      | Complete OAuth2 setup guide with Google Cloud Console steps   |
| `OAUTH2_MIGRATION.md`  | Guide for migrating from Service Account to OAuth2            |
| `OAUTH2_QUICKSTART.md` | Quick 5-minute start guide                                    |
| `.gitignore`           | Updated to exclude `token.json` (security)                    |

### Modified Files

| File           | Changes                                                      |
| -------------- | ------------------------------------------------------------ |
| `src/sync.ts`  | Replaced JWT Service Account auth with OAuth2 client auth    |
| `src/test.ts`  | Updated tests to check for token.json and OAuth2 credentials |
| `.env.example` | Replaced service account fields with OAuth2 client fields    |
| `package.json` | Added `npm run auth` script, google-auth-library dependency  |
| `SETUP.md`     | Updated instructions to reference OAuth2 setup               |
| `init.sh`      | Added guidance for OAuth2 authentication                     |

## Authentication Flow

### Initial Setup

```
1. User runs: npm run auth
2. App generates Google login URL
3. User visits URL in browser
4. User signs into Google account
5. User grants app permission
6. Browser redirects with authorization code
7. User copies code and runs: npm run auth -- CODE
8. App exchanges code for access token
9. Token saved to: token.json
10. App ready to run!
```

### Subsequent Runs

```
1. App checks: Does token.json exist?
2. If yes → Load token and use it
3. If expired → Auto-refresh token
4. Access Google Sheets seamlessly
```

## Getting Started

### Quick Path (5 minutes)

```bash
# 1. Setup folders and dependencies
./init.sh

# 2. Configure .env (add OAuth2 credentials)
nano .env

# 3. Authenticate
npm run auth

# 4. Test
npm test

# 5. Run
npm start
```

### Detailed Path

See: [OAUTH2_QUICKSTART.md](OAUTH2_QUICKSTART.md)

## OAuth2 Credentials Setup

### What You Need

1. **Client ID** - From Google Cloud Console
2. **Client Secret** - From Google Cloud Console
3. **Spreadsheet ID** - From your Google Sheet URL

### Where to Get Them

1. Go to: https://console.cloud.google.com/
2. Create/select project
3. Enable "Google Sheets API"
4. Create "OAuth 2.0 Client ID" (Desktop app)
5. Copy Client ID and Secret

### Full Instructions

See: [OAUTH2_SETUP.md](OAUTH2_SETUP.md)

## Security Features

✅ **Implemented:**

- Token stored locally in `token.json` (only on your machine)
- `token.json` in `.gitignore` (won't be committed to git)
- Token automatically refreshes (no manual intervention)
- Tokens can be revoked via Google Account settings
- Read-only access to Google Sheets (app can't modify data)

⚠️ **Important:**

- Keep `token.json` private (contains your access token)
- Keep `.env` private (contains Client Secret)
- Don't share these files with others
- Revoke access if app is compromised: https://myaccount.google.com/permissions

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│       Notify Mom Application            │
├─────────────────────────────────────────┤
│  OAuth2 Manager (src/oauth.ts)          │
│  ├─ Check token exists                  │
│  ├─ Load token from file                │
│  ├─ Generate auth URL                   │
│  └─ Handle token refresh                │
├─────────────────────────────────────────┤
│  Auth CLI (src/auth.ts)                 │
│  └─ npm run auth                        │
├─────────────────────────────────────────┤
│  Google Sheets Sync (src/sync.ts)       │
│  └─ Uses OAuth2 client for access       │
└─────────────────────────────────────────┘
         │
         ├──→ token.json (local, secure)
         ├──→ .env (credentials)
         └──→ Google Sheets API
```

### Token Lifecycle

```
1. User authenticates (npm run auth)
2. Token saved to token.json
3. App loads token on startup
4. Token used for all Google Sheets requests
5. Token auto-refreshes before expiry
6. Process repeats each run
```

## Commands Reference

### Authentication

```bash
npm run auth              # Start authentication flow
npm run auth -- CODE     # Complete auth with code from URL
```

### Running

```bash
npm start                 # Production (compiled)
npm run dev              # Development (watch mode)
npm run build            # Compile TypeScript
```

### Testing

```bash
npm test                 # Test setup in development
npm run test:prod        # Test setup (production compiled)
```

### Maintenance

```bash
npm run lint             # Check code style
npm install              # Install dependencies
npm run build            # Rebuild
```

## File Structure

```
notify_mom/
├── src/
│   ├── index.ts              # Main app entry
│   ├── sync.ts               # Google Sheets sync (OAuth2)
│   ├── oauth.ts              # OAuth2 manager (NEW)
│   ├── auth.ts               # Auth CLI tool (NEW)
│   ├── database.ts           # SQLite operations
│   ├── notifications.ts      # Email/Telegram
│   ├── logger.ts             # Logging
│   └── utils.ts              # Utilities
├── build/                    # Compiled JavaScript
├── data/                     # SQLite database (auto-created)
├── logs/                     # Application logs (auto-created)
├── .env                      # Your configuration (secret!)
├── .env.example              # Template (OAuth2)
├── token.json                # OAuth2 token (secret!)
├── .gitignore                # Git exclusions (includes token.json)
├── package.json              # Dependencies + scripts
├── OAUTH2_SETUP.md           # OAuth2 setup guide (NEW)
├── OAUTH2_MIGRATION.md       # Migration guide (NEW)
├── OAUTH2_QUICKSTART.md      # Quick start (NEW)
├── SETUP.md                  # Setup guide (updated)
├── HOW_TO_RUN.md             # Run instructions
├── TEST.md                   # Testing guide
├── ARCHITECTURE.md           # Architecture docs
├── README.md                 # Project overview
└── init.sh                   # Setup script (updated)
```

## Comparison: Before vs After

### Before (Service Account)

```
Pros:
- Works anywhere
- No interactive auth needed

Cons:
- Requires JSON credential file
- Service account approach
- More complex to manage
```

### After (OAuth2)

```
Pros:
- ✅ Uses your personal account
- ✅ Token stored locally
- ✅ More secure for personal use
- ✅ Automatically refreshes
- ✅ Easier to understand

Cons:
- Requires initial authentication
- Need to authenticate per machine
```

## Troubleshooting

### Error: "No valid token.json found"

```bash
npm run auth
```

### Error: "OAuth2 credentials not configured"

- Check `.env` has `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`
- Run through [OAUTH2_SETUP.md](OAUTH2_SETUP.md) again

### Tests Failing

```bash
npm run build  # Recompile
npm test       # Test again
```

### Old credentials not working

- Service Account auth is no longer supported
- Migrate to OAuth2: [OAUTH2_MIGRATION.md](OAUTH2_MIGRATION.md)

## FAQs

**Q: What if I lose token.json?**
A: Just run `npm run auth` again to get a new token.

**Q: Can I use this on multiple machines?**
A: Yes, but you need to authenticate on each machine separately.

**Q: How long does the token last?**
A: The app refreshes it automatically. You don't need to worry about expiry.

**Q: Is my data being sent to Google?**
A: No, only your read requests. You're not uploading anything.

**Q: Can I revoke access?**
A: Yes! Visit https://myaccount.google.com/permissions and remove "Notify Mom".

**Q: What if the app crashes?**
A: Token is still valid. Just restart with `npm start`.

## Documentation

| Guide                                        | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| [OAUTH2_SETUP.md](OAUTH2_SETUP.md)           | Step-by-step OAuth2 configuration   |
| [OAUTH2_MIGRATION.md](OAUTH2_MIGRATION.md)   | How to migrate from Service Account |
| [OAUTH2_QUICKSTART.md](OAUTH2_QUICKSTART.md) | 5-minute quick start                |
| [SETUP.md](SETUP.md)                         | Complete setup guide                |
| [HOW_TO_RUN.md](HOW_TO_RUN.md)               | Ways to run the application         |
| [TEST.md](TEST.md)                           | Testing guide                       |
| [ARCHITECTURE.md](ARCHITECTURE.md)           | Technical architecture              |
| [README.md](README.md)                       | Project overview                    |

## Next Steps

1. **Setup OAuth2:** Follow [OAUTH2_SETUP.md](OAUTH2_SETUP.md)
2. **Quick Start:** Follow [OAUTH2_QUICKSTART.md](OAUTH2_QUICKSTART.md)
3. **Test Setup:** Run `npm test`
4. **Start App:** Run `npm start`

---

**Summary:** Your app now uses OAuth2 for secure, user-friendly Google Sheets access! 🎉
