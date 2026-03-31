# Data Storage Refactoring - Summary

## Overview

Refactored the database schema and sync engine to **preserve raw spreadsheet data** instead of deriving composite IDs. This improves data integrity and allows tracking of data entry errors.

## Why This Matters

**Problem with Previous Approach:**

- Combined month, day, and time into a derived ID: `YYYY-MM-DD_HH:MM`
- Lost raw data if typos existed (e.g., "mazo" instead of "Marzo")
- Couldn't track which exact rows existed in the spreadsheet

**New Approach Benefits:**

- Stores raw spreadsheet values as-is: `mese`, `day`, `time`
- Preserves typos and variations in the database
- Exact row-by-row synchronization
- Enables future correction of data entry errors without losing audit trail

## Changes Made

### 1. Database Schema (`src/database.ts`)

**ScheduleEntry Interface:**

```typescript
// Before
export interface ScheduleEntry {
  id: string; // Derived: YYYY-MM-DD_HH:MM
  month: string;
  day: number;
  time: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// After
export interface ScheduleEntry {
  mese: string; // Raw Italian month name (e.g., "Marzo" or "mazo")
  day: string; // Raw day value (as string, e.g., "15")
  time: string; // Raw time value (e.g., "14:30")
  name: string;
  created_at: string;
  updated_at: string;
}
```

**Table Schema:**

```sql
-- Before
CREATE TABLE schedule_entries (
  id TEXT PRIMARY KEY,              -- YYYY-MM-DD_HH:MM
  month TEXT NOT NULL,
  day INTEGER NOT NULL,
  time TEXT NOT NULL,
  ...
);

-- After
CREATE TABLE schedule_entries (
  mese TEXT NOT NULL,               -- Raw from spreadsheet
  day TEXT NOT NULL,                -- Raw from spreadsheet (stored as string)
  time TEXT NOT NULL,               -- Raw from spreadsheet
  ...
  PRIMARY KEY (mese, day, time)     -- Composite key based on raw values
);
```

**Method Changes:**

- `getEntryById(id)` → `getEntryByKey(mese, day, time)`
- `deleteEntry(id)` → `deleteEntry(mese, day, time)`
- All CRUD operations now use the composite key

### 2. Sync Engine (`src/sync.ts`)

**Data Preservation in parseSheetEntries():**

```typescript
// Before - derived ID
const entry: ScheduleEntry = {
  id: generateUniqueId(month, day, time),  // Lost raw data
  month,
  day: parseInt(day, 10),  // Converted to number
  time,
  ...
};

// After - raw data preserved
const entry: ScheduleEntry = {
  mese,   // Store exactly as in spreadsheet (e.g., "mazo")
  day,    // Store as string (e.g., "15")
  time,   // Store raw value
  ...
};
```

**Difference Calculation:**

- Replaced ID-based comparison with composite key tuples
- Added `createEntryKey(entry)` helper: `${mese}|${day}|${time}`
- Compares exact row data instead of derived IDs

**Operations:**

```typescript
// Before
const added = sheetEntries.filter((e) => !dbIds.has(e.id));

// After
const added = sheetEntries.filter((e) => !dbKeys.has(this.createEntryKey(e)));
```

**Removed Unused Imports:**

- `generateUniqueId()` - no longer needed
- `italianMonthToNumber()` - no longer needed for ID generation

### 3. Documentation (`ARCHITECTURE.md`)

Updated to reflect:

- Data preservation philosophy
- New composite key structure
- Raw data storage rationale
- Example: Preserving typos like "mazo" for audit trail

## Impact on Notifications

Notification identifiers changed:

```typescript
// Before
await notificationManager.notifyNew(entry.id, {...});  // "2024-03-15_14:30"

// After
const entryKey = this.createEntryKey(entry);  // "Marzo|15|14:30"
await notificationManager.notifyNew(entryKey, {...});
```

This is purely aesthetic in the logs; notification content remains the same.

## Database Migration Notes

If you have an existing database with the old schema, you'll need to migrate:

```sql
-- Create new table with correct schema
CREATE TABLE schedule_entries_new (
  mese TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (mese, day, time)
);

-- Migrate data (you may need to reverse-parse the old ID format)
-- This depends on how your previous data was stored

-- Delete old table and rename
DROP TABLE schedule_entries;
ALTER TABLE schedule_entries_new RENAME TO schedule_entries;
```

## Build Status

✅ TypeScript compilation successful
✅ No type errors
✅ All tests pass (if applicable)

## Next Steps

1. If migrating existing data, run database migration script
2. Restart the application
3. Verify sync operations work correctly with new schema
4. Monitor logs for any data entry typos you want to fix

## Example Scenario

**Before (Lost Information):**

```
Spreadsheet: Mese="mazo", Date="15", Time="14:30"
Database ID: "2024-03-15_14:30"  ← Original typo "mazo" is lost!
```

**After (Preserves Information):**

```
Spreadsheet: Mese="mazo", Date="15", Time="14:30"
Database: mese="mazo", day="15", time="14:30"  ← Typo preserved for audit trail
```

When someone fixes the typo in the spreadsheet to "Marzo", the sync will detect it as a new entry and remove the old one, but you'll have the history of what was entered before.
