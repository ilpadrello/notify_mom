# OAuth2 Authentication Setup Guide

This guide explains how to set up OAuth2 authentication for Notify Mom to access your Google Sheets.

## Why OAuth2?

OAuth2 allows the script to act as **your user account** instead of requiring a service account. This means:

- ✅ You're using your own credentials
- ✅ Works with shared sheets you have access to
- ✅ More natural user experience
- ✅ No service account JSON file needed
- ✅ Token is stored locally in `token.json`

## Step 1: Create OAuth2 Credentials in Google Cloud

### 1.1 Go to Google Cloud Console

- Visit: https://console.cloud.google.com/

### 1.2 Create a new project (or select existing)

- Click the project dropdown at the top
- Click "NEW PROJECT"
- Enter name: "Notify Mom" (or your preferred name)
- Click "CREATE"
- Wait for the project to be created

### 1.3 Enable Google Sheets API

- In the search bar, type: "Google Sheets API"
- Click "Google Sheets API" from results
- Click "ENABLE"

### 1.4 Create OAuth2 Credentials

- Go to: https://console.cloud.google.com/apis/credentials
- Click "CREATE CREDENTIALS" button
- Choose: "OAuth client ID"
- If prompted, click "CONFIGURE CONSENT SCREEN" first:
  - Choose "External" user type
  - Fill in required fields:
    - App name: "Notify Mom"
    - User support email: your email
    - Developer contact: your email
  - Click "SAVE AND CONTINUE"
  - Add scope: `https://www.googleapis.com/auth/spreadsheets.readonly`
  - Click "SAVE AND CONTINUE"
  - Click "BACK TO DASHBOARD"

### 1.5 Create OAuth2 Client ID

- Go back to: https://console.cloud.google.com/apis/credentials
- Click "CREATE CREDENTIALS"
- Choose: "OAuth client ID"
- Application type: "Desktop application"
- Name: "notify-mom-cli"
- Click "CREATE"

### 1.6 Copy Your Credentials

- A dialog will appear with:
  - **Client ID** (copy this)
  - **Client Secret** (copy this)
- Click "DOWNLOAD JSON" to save a backup

## Step 2: Configure Your Environment

### 2.1 Edit `.env` file

```bash
nano .env
```

### 2.2 Add your OAuth2 credentials

```dotenv
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_OAUTH_CLIENT_ID=paste_your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=paste_your_client_secret_here
```

Save and exit (Ctrl+X, Y, Enter)

### 2.3 Find Your Spreadsheet ID

- Open your Google Sheets in browser
- The URL looks like:
  ```
  https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  ```
- Copy the `SPREADSHEET_ID` part and paste in `.env`

## Step 3: Authenticate

### 3.1 Run the authentication command

```bash
npm run auth
```

Output will show:

```
📋 Starting OAuth2 authentication process...

╔════════════════════════════════════════════════════════════╗
║         📋 Google Sheets OAuth2 Authentication             ║
╚════════════════════════════════════════════════════════════╝

⚠️  No valid token.json found!

To authenticate, visit this URL in your browser:

🔗 https://accounts.google.com/o/oauth2/v2/auth?...

Steps:
  1. Click the link above and authorize the application
  2. You'll be redirected to http://localhost:3000/...
  3. Copy the "code" parameter from the URL
  4. Run: npm run auth -- <authorization_code>

Example:
  npm run auth -- 4/0AY0e-g...
```

### 3.2 Follow the Authentication Flow

1. **Click the URL** provided in the terminal
2. **Sign in** with your Google account (the one with access to your spreadsheet)
3. **Grant Permission** when asked
4. **You'll be redirected** to `http://localhost:3000/...?code=...`
5. **Copy the `code`** parameter from the URL (the long string starting with `4/0AY0e-`)
6. **Run the command** with the code:
   ```bash
   npm run auth -- YOUR_CODE_HERE
   ```

### 3.3 Success!

You should see:

```
✅ Authentication successful!

token.json has been created.
You can now run: npm start
```

## Step 4: Verify Setup

Test that everything works:

```bash
npm test
```

Expected output:

```
✅ Logger - Logger initialized and working correctly
✅ Database Connection - Database initialized successfully
✅ Google Sheets Connection (OAuth2) - Successfully connected to Google Sheets
⚠️  Email Notification - Email config incomplete - skipped (optional)
⚠️  Telegram Notification - Telegram config incomplete - skipped (optional)

═══════════════════════════════════════════════════════════════
✅ All required tests PASSED! Ready to run the application.
═══════════════════════════════════════════════════════════════
```

## Step 5: Run the Application

```bash
npm start
```

The application will now:

- ✅ Connect to your Google Sheets using OAuth2
- ✅ Sync data to SQLite every 15 minutes
- ✅ Send notifications when data changes

## Troubleshooting

### Problem: "No valid token.json found"

**Solution**: Run `npm run auth` to authenticate again

### Problem: "OAuth2 credentials not configured"

**Solution**: Check that `.env` has both `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`

### Problem: "Authorization failed" or "Invalid code"

**Solution**:

- Make sure you copied the full code from the URL
- Code expires after 10 minutes, try authentication again
- Check that you're signed into Google with the correct account

### Problem: "Cannot find token.json" when running `npm start`

**Solution**: You need to authenticate first with `npm run auth`

### Problem: "Cannot read property 'loadInfo' of null"

**Solution**: Token is invalid or missing. Run `npm run auth` again

## Token Management

### Where is the token stored?

- Location: `token.json` in your project root
- **⚠️ KEEP THIS SAFE** - It contains your access token!

### Add to .gitignore (if using git)

```bash
echo "token.json" >> .gitignore
```

### Token Refresh

- Tokens automatically refresh when needed
- No action required from you
- The script handles refresh automatically

### Revoke Access (if needed)

Visit: https://myaccount.google.com/permissions

Find "Notify Mom" and click "REMOVE ACCESS"

## Security Notes

✅ **Good practices**:

- Token stored locally only (not in code)
- Uses read-only access (can't modify sheets)
- Token automatically refreshes
- Can be revoked anytime

⚠️ **Important**:

- Don't share `token.json` with others
- Don't commit `token.json` to git
- Don't paste your Client Secret in public places

## Next Steps

1. [Setup Guide](SETUP.md) - Complete setup walkthrough
2. [How to Run](HOW_TO_RUN.md) - Running the application
3. [Architecture](ARCHITECTURE.md) - How the app works
4. [Testing Guide](TEST.md) - Testing your setup

---

**Questions?** See [README.md](README.md) for more information.
