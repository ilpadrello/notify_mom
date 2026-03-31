# OAuth2 Migration Guide

Switched from Service Account to OAuth2 User Account authentication. Here's what changed:

## What Changed

### Before (Service Account)

```bash
# .env (old)
GOOGLE_SHEETS_SPREADSHEET_ID=sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=app@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----...
```

### Now (OAuth2 User Account)

```bash
# .env (new)
GOOGLE_SHEETS_SPREADSHEET_ID=sheet-id
GOOGLE_OAUTH_CLIENT_ID=client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-secret
# Token saved to: token.json (auto-generated)
```

## Why OAuth2?

✅ **Advantages:**

- Acts as your user account (not a service account)
- Works with sheets you personally have access to
- No need to share JSON credential files
- Token stored locally in `token.json` (keep it safe!)
- More intuitive for personal use

## Migration Steps

### Step 1: Stop the Current App

```bash
# Stop any running instances
Ctrl+C  # In terminal
```

### Step 2: Update .env

Replace your old service account credentials with OAuth2 credentials:

```bash
# Remove these lines:
# GOOGLE_SERVICE_ACCOUNT_EMAIL=...
# GOOGLE_SERVICE_ACCOUNT_KEY=...

# Add these lines:
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
```

Keep:

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id
```

### Step 3: Get OAuth2 Credentials

Follow: [OAUTH2_SETUP.md](OAUTH2_SETUP.md)

Quick version:

1. Go to Google Cloud Console
2. Create OAuth2 Desktop credentials
3. Copy Client ID and Secret to `.env`

### Step 4: Rebuild (if compiled)

```bash
npm run build
```

### Step 5: Authenticate

```bash
npm run auth
```

This creates `token.json` with your authentication token.

### Step 6: Test

```bash
npm test
```

All tests should pass (except optional email/Telegram if not configured).

### Step 7: Run

```bash
npm start
```

## New Files

### Created:

- `src/oauth.ts` - OAuth2 authentication manager
- `src/auth.ts` - CLI tool for authentication
- `OAUTH2_SETUP.md` - Detailed OAuth2 setup guide

### Modified:

- `src/sync.ts` - Now uses OAuth2 instead of JWT
- `src/test.ts` - Tests OAuth2 token instead of service account
- `.env.example` - New OAuth2 configuration
- `package.json` - Added `npm run auth` script
- `.gitignore` - Added `token.json` (secure!)

## Troubleshooting

### Error: "No valid token.json found"

```bash
# Run authentication
npm run auth
```

### Error: "OAuth2 credentials not configured"

- Check `.env` has both `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`
- Follow [OAUTH2_SETUP.md](OAUTH2_SETUP.md)

### Old token.json not working?

OAuth2 tokens expire, you need to re-authenticate:

```bash
npm run auth
```

## Reverting (Not Recommended)

If you need to go back to Service Account:

1. Restore old `.env` with service account credentials
2. Revert `src/sync.ts` to use JWT (see git history)
3. `npm run build && npm start`

However, OAuth2 is recommended for better security and user experience.

## Security

### Keep Safe:

- ✅ `token.json` - Contains your access token
- ✅ `.env` - Contains your secrets

### Don't Share:

- ❌ token.json with others
- ❌ .env files in public
- ❌ Client Secret on public code

### Good Practices:

- Add `token.json` to `.gitignore` ✅ (already done)
- Revoke access if needed via Google Account
- Rotate credentials periodically
- Use environment variables for secrets

## FAQ

**Q: Can I use this with multiple sheets?**
A: Yes! Use the same OAuth2 token. Just change `GOOGLE_SHEETS_SPREADSHEET_ID` in `.env`.

**Q: Will my token expire?**
A: It will refresh automatically when needed. No action required.

**Q: Can I share token.json?**
A: No! It contains your access token. Keep it private.

**Q: How do I revoke access?**
A: Visit https://myaccount.google.com/permissions and remove "Notify Mom".

**Q: Can I use this on multiple machines?**
A: You'd need to authenticate on each machine (creates separate token.json).

## Next Steps

1. [Setup Guide](SETUP.md) - Full setup walkthrough
2. [How to Run](HOW_TO_RUN.md) - Running the application
3. [Testing Guide](TEST.md) - Testing your setup

---

Done! Your app now uses OAuth2. Start with: `npm run auth && npm start`
