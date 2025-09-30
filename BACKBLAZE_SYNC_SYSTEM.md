# Backblaze Sync System

## Overview

The Backblaze Sync System automatically tracks and syncs changes from IndexedDB to Backblaze cloud storage. It monitors both AI-generated updates and manual user edits, and intelligently syncs only when there are changes, with a 5-minute debounce after the last update.

## Key Features

### 1. **Change Tracking**
- Tracks AI-generated changes when users accept AI updates
- Tracks manual cell edits when users type in cells
- Distinguishes between AI and manual changes for analytics
- Records previous and new values for each change

### 2. **Smart Syncing**
- **5-minute debounce**: Sync triggers 5 minutes after the last change
- **Change detection**: Only syncs when there are unsynced changes
- **Automatic retry**: Failed syncs are automatically retried
- **Background operation**: Syncs happen in the background without blocking UI

### 3. **Compression & Efficiency**
- Uses gzip compression for data transfer
- Typically achieves 70-90% compression ratio
- Batches all pending changes into a single upload

### 4. **UI Integration**
- Real-time sync status indicator
- Visual breakdown of pending changes
- Manual sync trigger option
- Progress indicators and time estimates

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Actions                            │
│  - Manual cell edits (typing in cells)                      │
│  - AI update acceptance (click "Accept" or "Accept All")    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              backblazeSyncManager                            │
│  - Tracks changes in localStorage                           │
│  - Maintains sync metadata                                  │
│  - Schedules sync with 5-minute debounce                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼ (after 5 minutes of inactivity)
┌─────────────────────────────────────────────────────────────┐
│               IndexedDB (Local)                              │
│  - Reads all sheet data                                     │
│  - Aggregates pending changes                               │
│  - Prepares data for upload                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Compression Layer                               │
│  - Compresses data with gzip (pako)                         │
│  - Converts to base64 for transport                         │
│  - Typical compression: 70-90%                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API                                     │
│  - Receives compressed data                                 │
│  - Authenticates request                                    │
│  - Uploads to Backblaze B2                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Backblaze B2 Cloud                              │
│  - Stores synced data                                       │
│  - Provides disaster recovery                               │
│  - Enables cross-device sync                                │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Automatic Sync

The sync system works automatically in the background:

1. User makes changes (manual edit or accepts AI update)
2. Change is tracked in `backblazeSyncManager`
3. 5-minute timer starts/resets
4. After 5 minutes of no changes, sync to Backblaze occurs (only if authenticated)
5. On successful sync, pending changes are cleared

**Note:** If the user is not authenticated, changes are still tracked locally but sync is deferred until login. Once the user logs in, pending changes are automatically synced.

### Manual Sync

Users can force an immediate sync via the UI:

1. Click the sync status indicator in the toolbar
2. Click "Sync Now" button in the popover
3. Sync happens immediately, bypassing the 5-minute delay

### Monitoring Sync Status

**Via UI Component:**
```tsx
import { BackblazeSyncStatus } from '@/components/BackblazeSyncStatus';

// Add to your toolbar or header
<BackblazeSyncStatus />
```

**Via Browser Console:**
```javascript
// Get current sync statistics
window.backblazeSyncDebug.getStats()

// Get change breakdown by sheet
window.backblazeSyncDebug.getBreakdown()

// Force immediate sync
await window.backblazeSyncDebug.forceSyncNow()

// Cancel scheduled sync
window.backblazeSyncDebug.cancelSync()

// Reset sync metadata (for testing)
window.backblazeSyncDebug.reset()
```

## API Reference

### BackblazeSyncManager

#### Methods

**`recordAIChange(sheetId, sheetName, cellId, previousValue, newValue)`**
- Records an AI-generated change
- Automatically schedules sync

**`recordManualChange(sheetId, sheetName, cellId, previousValue, newValue)`**
- Records a manual user edit
- Automatically schedules sync

**`performSync()`**
- Performs the actual sync to Backblaze
- Returns `Promise<boolean>` indicating success

**`forceSyncNow()`**
- Forces immediate sync, bypassing debounce
- Returns `Promise<boolean>` indicating success

**`getSyncStats()`**
- Returns current sync statistics
- Includes pending changes, sync times, etc.

**`getSyncMetadata()`**
- Returns detailed sync metadata
- Includes timestamps, counts, status

**`getChangeBreakdownBySheet()`**
- Returns `Map<string, SheetStats>`
- Shows changes grouped by sheet

**`hasUnsyncedChanges()`**
- Returns `boolean` indicating if there are pending changes

**`cancelScheduledSync()`**
- Cancels the current scheduled sync

**`resetSyncMetadata()`**
- Resets all sync metadata (for testing)

#### Properties

**`syncDelayMs`** (readonly)
- 5 minutes (300,000 ms)

## Data Structure

### Sync Metadata (localStorage: `backblaze_sync_metadata`)

```typescript
{
  lastSyncTimestamp: number;      // Unix timestamp of last successful sync
  lastChangeTimestamp: number;    // Unix timestamp of last change
  pendingChanges: number;         // Total number of unsynced changes
  aiChanges: number;              // Count of AI changes since last sync
  manualChanges: number;          // Count of manual changes since last sync
  totalSyncs: number;             // Total number of syncs performed
  lastSyncStatus: 'success' | 'failed' | 'never' | 'in-progress';
  lastSyncError?: string;         // Error message if last sync failed
}
```

### Pending Changes (localStorage: `backblaze_pending_changes`)

```typescript
Array<{
  sheetId: string;          // Sheet identifier
  sheetName: string;        // Human-readable sheet name
  cellId: string;           // Cell identifier (e.g., "A1")
  previousValue: any;       // Value before change
  newValue: any;            // Value after change
  timestamp: number;        // Unix timestamp of change
  type: 'ai' | 'manual';    // Type of change
}>
```

### Uploaded Data Structure

```typescript
{
  sheets: Array<{
    id: string;
    name: string;
    csvData: string;
    isActive: boolean;
    lastModified: number;
    changes: Array<{
      cellId: string;
      previousValue: any;
      newValue: any;
      timestamp: number;
    }>;
    metadata: {
      rowCount: number;
      colCount: number;
      fileSize: number;
      uploadDate: number;
    };
  }>;
  syncMetadata: {
    syncTimestamp: number;
    pendingChanges: number;
    aiChanges: number;
    manualChanges: number;
    changesBySheet: Array<{
      sheetId: string;
      changes: Array<{
        cellId: string;
        previousValue: any;
        newValue: any;
        timestamp: number;
        type: 'ai' | 'manual';
      }>;
    }>;
  };
}
```

## Integration Points

### 1. AI Update Acceptance

When a user accepts an AI update, the change is tracked:

```typescript
// In useSpreadsheet.ts - acceptAIUpdate
backblazeSyncManager.recordAIChange(
  currentSheet.id,
  currentSheet.name,
  cellId,
  cell.value,        // previous value
  cell.aiValue       // new value
);
```

### 2. Manual Cell Edits

When a user manually edits a cell (via the 45-second localStorage sync):

```typescript
// In useSpreadsheet.ts - 45s background sync
changes.forEach(change => {
  backblazeSyncManager.recordManualChange(
    sheetId,
    displayName,
    change.cellId,
    change.previousValue,
    change.newValue
  );
});
```

### 3. UI Status Display

```tsx
// In your main layout/toolbar
import { BackblazeSyncStatus } from '@/components/BackblazeSyncStatus';

<BackblazeSyncStatus />
```

## Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:8090  # Backend API URL
```

### Sync Timing

To modify the sync delay, edit `backblazeSyncManager.ts`:

```typescript
private syncDelayMs = 5 * 60 * 1000; // 5 minutes
```

### Change Watcher Interval

The background watcher checks for stale changes every 30 seconds:

```typescript
setInterval(() => {
  // Check for changes that need syncing
}, 30000); // 30 seconds
```

## Error Handling

### Sync Failures

If a sync fails:
1. Error is logged to console
2. `lastSyncStatus` is set to `'failed'`
3. `lastSyncError` contains the error message
4. Changes remain in pending queue
5. Next scheduled sync will retry

### Network Issues

- Sync automatically retries on next schedule
- UI shows warning indicator
- No data is lost

### Authentication Issues

- Sync fails if no auth token is available
- User is prompted to log in
- Changes remain queued

## Best Practices

### 1. Monitor Sync Status

Add the sync status component to your UI so users can:
- See when their changes are saved
- Manually trigger sync if needed
- View pending changes

### 2. Test Sync Behavior

Use the debug console to test:
```javascript
// Make some changes, then check stats
window.backblazeSyncDebug.getStats()

// Force a sync immediately
await window.backblazeSyncDebug.forceSyncNow()

// Reset for clean testing
window.backblazeSyncDebug.reset()
```

### 3. Handle Edge Cases

- Large datasets: Compression handles efficiently
- Many changes: All batched into single upload
- Offline mode: Changes queue until connection restored

## Troubleshooting

### Changes Not Syncing

1. Check sync status: `window.backblazeSyncDebug.getStats()`
2. Verify pending changes: `window.backblazeSyncDebug.getBreakdown()`
3. Check browser console for errors
4. Verify authentication token exists
5. Try manual sync: `window.backblazeSyncDebug.forceSyncNow()`

### Sync Status Shows "Failed"

1. Check browser console for error details
2. Verify backend API is running
3. Check Backblaze credentials in backend
4. Verify network connectivity
5. Try manual sync again

### Changes Not Being Tracked

1. Verify you're using the correct methods:
   - AI: `acceptAIUpdate()` or `acceptAllAIUpdates()`
   - Manual: Changes via cell editing
2. Check localStorage for `backblaze_pending_changes`
3. Verify sync manager is initialized

## Performance Considerations

### Memory Usage

- Pending changes stored in localStorage
- Typical size: < 1MB for hundreds of changes
- Cleared after successful sync

### Network Usage

- Single upload per sync
- Gzip compression reduces size by 70-90%
- Typical upload: 10-500KB depending on changes

### CPU Usage

- Minimal during change tracking
- Brief spike during compression
- Background sync doesn't block UI

## Future Enhancements

Potential improvements:
- [ ] Differential sync (only changed sheets)
- [ ] Conflict resolution for multi-device usage
- [ ] Sync history and rollback capability
- [ ] Configurable sync intervals
- [ ] Real-time sync option
- [ ] Sync to multiple cloud providers

## Security

- Data compressed before upload
- HTTPS/TLS encryption in transit
- JWT authentication required
- User-specific Backblaze paths
- No sensitive data in localStorage keys

## License

Part of the Sheet Scribe AI project.
