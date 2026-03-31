# Quick Reference - Testing Notify Mom

## One-Line Summary

```bash
npm test  # Test your setup before running the app
```

## What Gets Tested

| Component     | Test                       | Required    |
| ------------- | -------------------------- | ----------- |
| Logger        | Logs are working           | ✅ Yes      |
| Database      | SQLite connection & tables | ✅ Yes      |
| Google Sheets | API credentials & access   | ✅ Yes      |
| Email         | SMTP configuration         | ⚠️ Optional |
| Telegram      | Bot token & chat ID        | ⚠️ Optional |

## Usage

```bash
# Run tests in development mode
npm test

# Run tests after production build
npm run test:prod

# Run app (after tests pass)
npm start
```

## Expected Flow

1. ✅ Logger initialized
2. ✅ Database connected (creates `data/app.db` if needed)
3. ✅ Google Sheets connected (uses credentials from `.env`)
4. ⚠️ Email test (skipped if not configured)
5. ⚠️ Telegram test (skipped if not configured)
6. Print results

## Exit Codes

- `0` - All required tests passed ✅
- `1` - Required tests failed ❌

## Before First Run

```bash
# 1. Setup (one-time)
./init.sh

# 2. Configure
cp .env.example .env
nano .env  # Add Google Sheets credentials

# 3. Test
npm test

# 4. Run
npm start
```

## Files Involved

- `src/test.ts` - Test source code
- `build/test.js` - Compiled test
- `TEST.md` - Detailed test documentation
- `package.json` - npm scripts

## What's NOT Tested

- Application doesn't send real emails/messages (skips when optional)
- Doesn't actually sync data (just verifies connection)
- Doesn't modify database (just reads)
- Safe to run anytime!

## When Tests Fail

Required tests:

1. Check `.env` configuration
2. Verify Google Sheets credentials
3. Ensure `data/` and `logs/` folders exist
4. Run `npm test` again

Optional tests:

- You can ignore these for now
- They'll auto-skip if config incomplete
- Add them later if needed

## Next Steps

```bash
npm test        # Verify setup
npm start       # Run application
tail -f logs/app.log  # Monitor
```

That's it! 🚀
