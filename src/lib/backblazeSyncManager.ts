/**
 * Backblaze Sync Manager
 * 
 * Tracks IndexedDB changes (both AI and manual) and syncs to Backblaze after 5 minutes
 * of inactivity. Only syncs when there are actual changes to upload.
 * 
 * Features:
 * - Tracks AI-generated changes
 * - Tracks manual user edits
 * - Debounces sync by 5 minutes after last update
 * - Only syncs when there are unsynced changes
 * - Provides change statistics and sync status
 */

import { indexedDBService, SheetRecord } from './indexedDBService';
import pako from 'pako';

interface SyncMetadata {
  lastSyncTimestamp: number;
  lastChangeTimestamp: number;
  pendingChanges: number;
  aiChanges: number;
  manualChanges: number;
  totalSyncs: number;
  lastSyncStatus: 'success' | 'failed' | 'never' | 'in-progress';
  lastSyncError?: string;
}

interface ChangeRecord {
  sheetId: string;
  sheetName: string;
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  type: 'ai' | 'manual';
}

class BackblazeSyncManager {
  private syncMetadataKey = 'backblaze_sync_metadata';
  private changeTrackingKey = 'backblaze_pending_changes';
  private syncTimeoutId: NodeJS.Timeout | null = null;
  private syncDelayMs = 8 * 1000; // 8 seconds (for testing, change to 5 * 60 * 1000 for production)
  private isSyncing = false;

  constructor() {
    this.loadSyncMetadata();
    this.startChangeWatcher();
  }

  /**
   * Load sync metadata from localStorage
   */
  private loadSyncMetadata(): SyncMetadata {
    const stored = localStorage.getItem(this.syncMetadataKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse sync metadata:', e);
      }
    }

    // Default metadata
    const defaultMetadata: SyncMetadata = {
      lastSyncTimestamp: 0,
      lastChangeTimestamp: 0,
      pendingChanges: 0,
      aiChanges: 0,
      manualChanges: 0,
      totalSyncs: 0,
      lastSyncStatus: 'never',
    };

    this.saveSyncMetadata(defaultMetadata);
    return defaultMetadata;
  }

  /**
   * Save sync metadata to localStorage
   */
  private saveSyncMetadata(metadata: SyncMetadata): void {
    localStorage.setItem(this.syncMetadataKey, JSON.stringify(metadata));
  }

  /**
   * Get current sync metadata
   */
  public getSyncMetadata(): SyncMetadata {
    return this.loadSyncMetadata();
  }

  /**
   * Get all pending changes
   */
  private getPendingChanges(): ChangeRecord[] {
    const stored = localStorage.getItem(this.changeTrackingKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse pending changes:', e);
      }
    }
    return [];
  }

  /**
   * Save pending changes
   */
  private savePendingChanges(changes: ChangeRecord[]): void {
    localStorage.setItem(this.changeTrackingKey, JSON.stringify(changes));
  }

  /**
   * Record an AI change
   */
  public recordAIChange(
    sheetId: string,
    sheetName: string,
    cellId: string,
    previousValue: any,
    newValue: any
  ): void {
    console.log('🤖 Recording AI change:', { sheetId, sheetName, cellId });

    const change: ChangeRecord = {
      sheetId,
      sheetName,
      cellId,
      previousValue,
      newValue,
      timestamp: Date.now(),
      type: 'ai',
    };

    this.addChangeAndScheduleSync(change);
  }

  /**
   * Record a manual change
   */
  public recordManualChange(
    sheetId: string,
    sheetName: string,
    cellId: string,
    previousValue: any,
    newValue: any
  ): void {
    console.log('✏️ Recording manual change:', { sheetId, sheetName, cellId });

    const change: ChangeRecord = {
      sheetId,
      sheetName,
      cellId,
      previousValue,
      newValue,
      timestamp: Date.now(),
      type: 'manual',
    };

    this.addChangeAndScheduleSync(change);
  }

  /**
   * Add a change and schedule sync
   */
  private addChangeAndScheduleSync(change: ChangeRecord): void {
    // Get current changes
    const changes = this.getPendingChanges();
    changes.push(change);
    this.savePendingChanges(changes);

    // Update metadata
    const metadata = this.loadSyncMetadata();
    metadata.lastChangeTimestamp = change.timestamp;
    metadata.pendingChanges = changes.length;
    
    if (change.type === 'ai') {
      metadata.aiChanges++;
    } else {
      metadata.manualChanges++;
    }
    
    this.saveSyncMetadata(metadata);

    // Schedule sync
    this.scheduleSync();
  }

  /**
   * Schedule a sync (with debouncing)
   */
  private scheduleSync(): void {
    // Clear existing timeout
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
    }

    const metadata = this.loadSyncMetadata();
    const pendingChanges = metadata.pendingChanges;
    const delaySeconds = Math.floor(this.syncDelayMs / 1000);

    console.log(`⏱️ Scheduling Backblaze sync in ${delaySeconds} seconds (${pendingChanges} pending changes)`);

    // Schedule new timeout
    this.syncTimeoutId = setTimeout(() => {
      console.log('⏰ Sync timer triggered, attempting sync...');
      this.performSync();
    }, this.syncDelayMs);
  }

  /**
   * Check if there are unsynced changes
   */
  public hasUnsyncedChanges(): boolean {
    const metadata = this.loadSyncMetadata();
    return metadata.pendingChanges > 0;
  }

  /**
   * Get time until next sync (in milliseconds)
   */
  public getTimeUntilSync(): number | null {
    if (!this.syncTimeoutId) return null;
    
    const metadata = this.loadSyncMetadata();
    const timeSinceLastChange = Date.now() - metadata.lastChangeTimestamp;
    const timeRemaining = this.syncDelayMs - timeSinceLastChange;
    
    return Math.max(0, timeRemaining);
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    hasUnsyncedChanges: boolean;
    pendingChanges: number;
    aiChanges: number;
    manualChanges: number;
    lastSyncTime: number;
    lastChangeTime: number;
    timeSinceLastSync: number;
    timeSinceLastChange: number;
    timeUntilNextSync: number | null;
    totalSyncs: number;
    lastSyncStatus: string;
  } {
    const metadata = this.loadSyncMetadata();
    const now = Date.now();

    return {
      hasUnsyncedChanges: this.hasUnsyncedChanges(),
      pendingChanges: metadata.pendingChanges,
      aiChanges: metadata.aiChanges,
      manualChanges: metadata.manualChanges,
      lastSyncTime: metadata.lastSyncTimestamp,
      lastChangeTime: metadata.lastChangeTimestamp,
      timeSinceLastSync: metadata.lastSyncTimestamp > 0 ? now - metadata.lastSyncTimestamp : -1,
      timeSinceLastChange: metadata.lastChangeTimestamp > 0 ? now - metadata.lastChangeTimestamp : -1,
      timeUntilNextSync: this.getTimeUntilSync(),
      totalSyncs: metadata.totalSyncs,
      lastSyncStatus: metadata.lastSyncStatus,
    };
  }

  /**
   * Perform the actual sync to Backblaze
   */
  public async performSync(): Promise<boolean> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping');
      return false;
    }

    const metadata = this.loadSyncMetadata();
    
    // Check if there are changes to sync
    if (metadata.pendingChanges === 0) {
      console.log('ℹ️ No pending changes, skipping sync');
      return false;
    }

    // Check authentication before attempting sync
    // Try both 'token' and 'auth_token' for compatibility
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('userEmail');
    if (!token) {
      console.warn('⚠️ No authentication token found, skipping sync. Changes will be synced after login.');
      console.log('📊 Auth check:', { 
        hasToken: !!localStorage.getItem('token'),
        hasAuthToken: !!localStorage.getItem('auth_token'),
        hasEmail: !!userEmail 
      });
      // Don't mark as failed, just skip this sync attempt
      return false;
    }
    
    console.log('✅ Authentication verified, proceeding with sync');
    console.log('📊 Auth info:', { 
      tokenType: localStorage.getItem('token') ? 'token' : 'auth_token',
      hasEmail: !!userEmail 
    });

    this.isSyncing = true;
    metadata.lastSyncStatus = 'in-progress';
    this.saveSyncMetadata(metadata);

    console.log('🚀 Starting Backblaze sync...', {
      pendingChanges: metadata.pendingChanges,
      aiChanges: metadata.aiChanges,
      manualChanges: metadata.manualChanges,
    });

    try {
      // Get all sheets from IndexedDB
      const sheets = await indexedDBService.getAllSheets();
      
      if (sheets.length === 0) {
        console.log('ℹ️ No sheets to sync');
        this.isSyncing = false;
        return false;
      }

      // Get pending changes
      const pendingChanges = this.getPendingChanges();

      // Group changes by sheet
      const changesBySheet = new Map<string, ChangeRecord[]>();
      pendingChanges.forEach(change => {
        if (!changesBySheet.has(change.sheetId)) {
          changesBySheet.set(change.sheetId, []);
        }
        changesBySheet.get(change.sheetId)!.push(change);
      });

      console.log('📊 Changes grouped by sheet:', {
        totalSheets: changesBySheet.size,
        sheetIds: Array.from(changesBySheet.keys()),
      });

      // Prepare data for upload
      const dataToUpload = {
        sheets: sheets.map(sheet => ({
          id: sheet.id,
          name: sheet.name,
          csvData: sheet.csvData,
          isActive: sheet.isActive,
          lastModified: sheet.lastModified,
          changes: sheet.changes || [],
          metadata: sheet.metadata,
        })),
        syncMetadata: {
          syncTimestamp: Date.now(),
          pendingChanges: metadata.pendingChanges,
          aiChanges: metadata.aiChanges,
          manualChanges: metadata.manualChanges,
          changesBySheet: Array.from(changesBySheet.entries()).map(([sheetId, changes]) => ({
            sheetId,
            changes: changes.map(c => ({
              cellId: c.cellId,
              previousValue: c.previousValue,
              newValue: c.newValue,
              timestamp: c.timestamp,
              type: c.type,
            })),
          })),
        },
      };

      console.log('📦 Prepared data for upload:', {
        sheetsCount: dataToUpload.sheets.length,
        totalChanges: metadata.pendingChanges,
      });

      // Compress data
      const jsonData = JSON.stringify(dataToUpload);
      const compressed = pako.gzip(jsonData);
      
      // Convert Uint8Array to base64 without stack overflow
      // Process in chunks to avoid "Maximum call stack size exceeded"
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < compressed.length; i += chunkSize) {
        const chunk = compressed.subarray(i, Math.min(i + chunkSize, compressed.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
      }
      const compressedBase64 = btoa(binary);

      const originalSize = jsonData.length;
      const compressedSize = compressed.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      console.log('🗜️ Data compressed:', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`,
      });

      // Get auth token (already checked above, but double-check)
      // Try both 'token' and 'auth_token' for compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        console.warn('⚠️ Token was removed during sync, aborting');
        throw new Error('Authentication token was removed during sync');
      }

      // Upload to Backblaze via backend
      const fileName = `sheets_sync_${Date.now()}.json.gz`;
      const uploadMetadata = {
        totalSize: originalSize,
        compressionRatio,
        sheetCount: sheets.length,
        changeCount: metadata.pendingChanges,
        aiChanges: metadata.aiChanges,
        manualChanges: metadata.manualChanges,
        syncTimestamp: Date.now(),
      };

      console.log('🌐 Uploading to Backblaze...', { fileName });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8090'}/api/backblaze/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userEmail: localStorage.getItem('userEmail') || 'anonymous',
          fileName,
          compressedData: compressedBase64,
          metadata: uploadMetadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Backblaze sync successful:', result);

      // Update metadata
      metadata.lastSyncTimestamp = Date.now();
      metadata.lastSyncStatus = 'success';
      metadata.totalSyncs++;
      metadata.pendingChanges = 0;
      metadata.aiChanges = 0;
      metadata.manualChanges = 0;
      delete metadata.lastSyncError;
      this.saveSyncMetadata(metadata);

      // Clear pending changes
      this.savePendingChanges([]);

      this.isSyncing = false;
      return true;
    } catch (error) {
      console.error('❌ Backblaze sync failed:', error);

      // Update metadata
      metadata.lastSyncStatus = 'failed';
      metadata.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
      this.saveSyncMetadata(metadata);

      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Force immediate sync (bypass 5-minute delay)
   */
  public async forceSyncNow(): Promise<boolean> {
    console.log('🔄 Force sync requested');
    
    // Cancel scheduled sync
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }

    return await this.performSync();
  }

  /**
   * Called after successful login to sync pending changes
   */
  public onUserLogin(): void {
    console.log('👤 User logged in, checking for pending changes...');
    const metadata = this.loadSyncMetadata();
    
    if (metadata.pendingChanges > 0) {
      console.log(`📊 Found ${metadata.pendingChanges} pending changes, scheduling sync...`);
      this.scheduleSync();
    } else {
      console.log('✅ No pending changes to sync');
    }
  }

  /**
   * Cancel scheduled sync
   */
  public cancelScheduledSync(): void {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
      console.log('❌ Scheduled sync cancelled');
    }
  }

  /**
   * Start watching for changes (monitors IndexedDB and localStorage)
   */
  private startChangeWatcher(): void {
    console.log('👀 Starting change watcher (will start monitoring in 3 seconds)...');
    
    // Wait a bit before starting the watcher to allow auth to initialize
    setTimeout(() => {
      console.log('👀 Change watcher is now active');
      
      // Check every 10 seconds if there are changes that need syncing (reduced for testing)
      setInterval(() => {
        const metadata = this.loadSyncMetadata();
        // Try both 'token' and 'auth_token' for compatibility
        const hasToken = !!(localStorage.getItem('token') || localStorage.getItem('auth_token'));
        
        // If there are pending changes and no sync is scheduled, schedule one
        if (metadata.pendingChanges > 0 && !this.syncTimeoutId && !this.isSyncing) {
          const timeSinceLastChange = Date.now() - metadata.lastChangeTimestamp;
          
          console.log('👀 Watcher check:', { 
            pendingChanges: metadata.pendingChanges, 
            timeSinceChange: Math.floor(timeSinceLastChange / 1000) + 's',
            hasToken,
            needsSync: timeSinceLastChange >= this.syncDelayMs 
          });
          
          if (timeSinceLastChange >= this.syncDelayMs) {
            // Only auto-trigger if authenticated
            if (hasToken) {
              console.log('🔔 Auto-triggering sync for stale changes');
              this.performSync();
            } else {
              console.log('⏸️ Stale changes found but not authenticated, waiting for login');
            }
          }
        }
      }, 10000); // Check every 10 seconds (for testing, change to 30000 for production)
    }, 3000); // Wait 3 seconds for auth to initialize (reduced for testing)
  }

  /**
   * Get detailed change breakdown by sheet
   */
  public getChangeBreakdownBySheet(): Map<string, {
    sheetName: string;
    totalChanges: number;
    aiChanges: number;
    manualChanges: number;
    lastChangeTime: number;
  }> {
    const changes = this.getPendingChanges();
    const breakdown = new Map();

    changes.forEach(change => {
      if (!breakdown.has(change.sheetId)) {
        breakdown.set(change.sheetId, {
          sheetName: change.sheetName,
          totalChanges: 0,
          aiChanges: 0,
          manualChanges: 0,
          lastChangeTime: 0,
        });
      }

      const stats = breakdown.get(change.sheetId);
      stats.totalChanges++;
      if (change.type === 'ai') {
        stats.aiChanges++;
      } else {
        stats.manualChanges++;
      }
      stats.lastChangeTime = Math.max(stats.lastChangeTime, change.timestamp);
    });

    return breakdown;
  }

  /**
   * Reset sync metadata (for testing/debugging)
   */
  public resetSyncMetadata(): void {
    const defaultMetadata: SyncMetadata = {
      lastSyncTimestamp: 0,
      lastChangeTimestamp: 0,
      pendingChanges: 0,
      aiChanges: 0,
      manualChanges: 0,
      totalSyncs: 0,
      lastSyncStatus: 'never',
    };

    this.saveSyncMetadata(defaultMetadata);
    this.savePendingChanges([]);
    
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }

    console.log('🔄 Sync metadata reset');
  }
}

// Singleton instance
export const backblazeSyncManager = new BackblazeSyncManager();

// Debug helper (accessible via browser console)
if (typeof window !== 'undefined') {
  (window as any).backblazeSyncDebug = {
    getStats: () => backblazeSyncManager.getSyncStats(),
    getBreakdown: () => {
      const breakdown = backblazeSyncManager.getChangeBreakdownBySheet();
      return Object.fromEntries(breakdown);
    },
    forceSyncNow: () => backblazeSyncManager.forceSyncNow(),
    cancelSync: () => backblazeSyncManager.cancelScheduledSync(),
    reset: () => backblazeSyncManager.resetSyncMetadata(),
  };

  console.log('🔧 Backblaze sync debug helpers available:');
  console.log('  - window.backblazeSyncDebug.getStats() - Get sync statistics');
  console.log('  - window.backblazeSyncDebug.getBreakdown() - Get change breakdown by sheet');
  console.log('  - window.backblazeSyncDebug.forceSyncNow() - Force immediate sync');
  console.log('  - window.backblazeSyncDebug.cancelSync() - Cancel scheduled sync');
  console.log('  - window.backblazeSyncDebug.reset() - Reset sync metadata');
}
