/**
 * Session tracking service to monitor IndexedDB changes and determine if Backblaze sync is needed
 */

interface SessionState {
  sessionId: string;
  startTime: number;
  endTime?: number;
  hasIndexedDBChanges: boolean;
  sheetsModified: string[];
  lastIndexedDBUpdate: number;
  lastBackblazeSync: number;
}

interface IndexedDBChange {
  sheetId: string;
  changeType: 'create' | 'update' | 'delete';
  timestamp: number;
  description: string;
}

class SessionTrackerService {
  private readonly SESSION_KEY = 'ai_sheets_session_state';
  private readonly CHANGES_KEY = 'ai_sheets_indexeddb_changes';
  private currentSession: SessionState | null = null;
  private indexedDBChanges: IndexedDBChange[] = [];

  constructor() {
    this.loadSessionState();
    this.loadIndexedDBChanges();
  }

  // Initialize a new session
  startSession(): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      hasIndexedDBChanges: false,
      sheetsModified: [],
      lastIndexedDBUpdate: 0,
      lastBackblazeSync: this.getLastBackblazeSyncTime()
    };
    
    this.saveSessionState();
    console.log('🔄 Started new session:', sessionId);
  }

  // End the current session
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.saveSessionState();
      console.log('🔄 Ended session:', this.currentSession.sessionId);
    }
  }

  // Track an IndexedDB change
  trackIndexedDBChange(sheetId: string, changeType: 'create' | 'update' | 'delete', description: string): void {
    if (!this.currentSession) {
      this.startSession();
    }

    // Check if this is a duplicate change within the last 5 seconds
    const recentChange = this.indexedDBChanges.find(change => 
      change.sheetId === sheetId && 
      change.changeType === changeType && 
      (Date.now() - change.timestamp) < 5000
    );

    if (recentChange) {
      console.log('⏭️ Skipping duplicate IndexedDB change:', {
        sheetId,
        changeType,
        description,
        reason: 'Duplicate within 5 seconds'
      });
      return;
    }

    const change: IndexedDBChange = {
      sheetId,
      changeType,
      timestamp: Date.now(),
      description
    };

    this.indexedDBChanges.push(change);
    this.currentSession.hasIndexedDBChanges = true;
    this.currentSession.lastIndexedDBUpdate = Date.now();
    
    if (!this.currentSession.sheetsModified.includes(sheetId)) {
      this.currentSession.sheetsModified.push(sheetId);
    }

    this.saveSessionState();
    this.saveIndexedDBChanges();
    
    console.log('📝 Tracked IndexedDB change:', {
      sheetId,
      changeType,
      description,
      totalChanges: this.indexedDBChanges.length
    });
  }

  // Check if IndexedDB was updated in the last session
  hasIndexedDBChanges(): boolean {
    return this.currentSession?.hasIndexedDBChanges || false;
  }

  // Clear all IndexedDB changes (useful for cleanup)
  clearIndexedDBChanges(): void {
    this.indexedDBChanges = [];
    if (this.currentSession) {
      this.currentSession.hasIndexedDBChanges = false;
      this.currentSession.sheetsModified = [];
    }
    this.saveSessionState();
    this.saveIndexedDBChanges();
    console.log('🧹 Cleared all IndexedDB changes');
  }

  // Get sheets that were modified in the current session
  getModifiedSheets(): string[] {
    return this.currentSession?.sheetsModified || [];
  }

  // Get all IndexedDB changes
  getIndexedDBChanges(): IndexedDBChange[] {
    return this.indexedDBChanges;
  }

  // Get the last IndexedDB update time
  getLastIndexedDBUpdate(): number {
    return this.currentSession?.lastIndexedDBUpdate || 0;
  }

  // Get the last Backblaze sync time
  getLastBackblazeSyncTime(): number {
    try {
      const stored = localStorage.getItem('ai_sheets_last_backblaze_sync');
      return stored ? parseInt(stored) : 0;
    } catch (error) {
      console.error('❌ Error getting last Backblaze sync time:', error);
      return 0;
    }
  }

  // Set the last Backblaze sync time
  setLastBackblazeSyncTime(): void {
    try {
      const now = Date.now();
      localStorage.setItem('ai_sheets_last_backblaze_sync', now.toString());
      if (this.currentSession) {
        this.currentSession.lastBackblazeSync = now;
        this.saveSessionState();
      }
      console.log('💾 Updated last Backblaze sync time:', new Date(now).toISOString());
    } catch (error) {
      console.error('❌ Error setting last Backblaze sync time:', error);
    }
  }

  // Check if Backblaze sync is needed
  needsBackblazeSync(): boolean {
    if (!this.currentSession) return false;
    
    const hasChanges = this.currentSession.hasIndexedDBChanges;
    const lastSync = this.currentSession.lastBackblazeSync;
    const lastUpdate = this.currentSession.lastIndexedDBUpdate;
    
    // Sync needed if:
    // 1. IndexedDB was updated in this session, AND
    // 2. Last update was after last sync
    const needsSync = hasChanges && lastUpdate > lastSync;
    
    console.log('🔍 Backblaze sync check:', {
      hasChanges,
      lastSync: new Date(lastSync).toISOString(),
      lastUpdate: new Date(lastUpdate).toISOString(),
      needsSync
    });
    
    return needsSync;
  }

  // Get session summary
  getSessionSummary(): {
    sessionId: string;
    duration: number;
    hasChanges: boolean;
    modifiedSheets: string[];
    changeCount: number;
    needsSync: boolean;
  } {
    if (!this.currentSession) {
      return {
        sessionId: 'no-session',
        duration: 0,
        hasChanges: false,
        modifiedSheets: [],
        changeCount: 0,
        needsSync: false
      };
    }

    const duration = (this.currentSession.endTime || Date.now()) - this.currentSession.startTime;
    
    return {
      sessionId: this.currentSession.sessionId,
      duration,
      hasChanges: this.currentSession.hasIndexedDBChanges,
      modifiedSheets: this.currentSession.sheetsModified,
      changeCount: this.indexedDBChanges.length,
      needsSync: this.needsBackblazeSync()
    };
  }

  // Clear session data
  clearSessionData(): void {
    this.currentSession = null;
    this.indexedDBChanges = [];
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.CHANGES_KEY);
    console.log('🧹 Cleared all session data');
  }

  // Load session state from localStorage
  private loadSessionState(): void {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        console.log('📖 Loaded session state:', this.currentSession?.sessionId);
      }
    } catch (error) {
      console.error('❌ Error loading session state:', error);
      this.currentSession = null;
    }
  }

  // Save session state to localStorage
  private saveSessionState(): void {
    try {
      if (this.currentSession) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
      }
    } catch (error) {
      console.error('❌ Error saving session state:', error);
    }
  }

  // Load IndexedDB changes from localStorage
  private loadIndexedDBChanges(): void {
    try {
      const stored = localStorage.getItem(this.CHANGES_KEY);
      if (stored) {
        this.indexedDBChanges = JSON.parse(stored);
        console.log('📖 Loaded IndexedDB changes:', this.indexedDBChanges.length);
      }
    } catch (error) {
      console.error('❌ Error loading IndexedDB changes:', error);
      this.indexedDBChanges = [];
    }
  }

  // Save IndexedDB changes to localStorage
  private saveIndexedDBChanges(): void {
    try {
      localStorage.setItem(this.CHANGES_KEY, JSON.stringify(this.indexedDBChanges));
    } catch (error) {
      console.error('❌ Error saving IndexedDB changes:', error);
    }
  }
}

export const sessionTracker = new SessionTrackerService();
export type { SessionState, IndexedDBChange };

