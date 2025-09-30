/**
 * Universal Change Detection System
 * Detects and logs both manual and AI changes to localStorage
 */

interface ChangeEntry {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  source: 'manual' | 'ai';
}

interface SheetChanges {
  [sheetFileName: string]: ChangeEntry[];
}

class ChangeDetector {
  private static instance: ChangeDetector;
  private readonly STORAGE_KEY = 'sheet_changes_by_filename';
  private cellValueCache: Map<string, any> = new Map();
  private currentSheetFileName: string = '';

  private constructor() {
    // Initialize from localStorage
    this.loadChangesFromStorage();
  }

  public static getInstance(): ChangeDetector {
    if (!ChangeDetector.instance) {
      ChangeDetector.instance = new ChangeDetector();
    }
    return ChangeDetector.instance;
  }

  // Set the current sheet filename for tracking
  setCurrentSheet(fileName: string): void {
    this.currentSheetFileName = fileName;
    console.log('📋 ChangeDetector: Current sheet set to:', fileName);
  }

  // Initialize cell values cache for change detection
  initializeCellCache(cells: Record<string, { value: any }>): void {
    this.cellValueCache.clear();
    Object.entries(cells).forEach(([cellId, cell]) => {
      this.cellValueCache.set(cellId, cell.value);
    });
    console.log('🔄 ChangeDetector: Initialized cache with', this.cellValueCache.size, 'cells');
  }

  // Detect and log manual cell changes
  detectManualChange(cellId: string, newValue: any): void {
    console.log('🔍 ChangeDetector.detectManualChange called:', {
      cellId,
      newValue,
      currentSheetFileName: this.currentSheetFileName,
      cacheSize: this.cellValueCache.size
    });

    if (!this.currentSheetFileName) {
      console.warn('⚠️ ChangeDetector: No current sheet filename set');
      return;
    }

    const previousValue = this.cellValueCache.get(cellId);
    console.log('🔍 Previous value from cache:', previousValue);
    
    // Only log if value actually changed
    if (previousValue !== newValue) {
      const change: ChangeEntry = {
        cellId,
        previousValue,
        newValue,
        timestamp: Date.now(),
        source: 'manual'
      };

      console.log('📝 Logging manual change:', change);
      this.logChange(change);
      
      // Update cache
      this.cellValueCache.set(cellId, newValue);
      
      console.log('✅ Manual change logged successfully');
    } else {
      console.log('🚫 No change - values are identical:', { previousValue, newValue });
    }
  }

  // Log AI changes (called from existing AI systems)
  logAIChange(cellId: string, previousValue: any, newValue: any): void {
    if (!this.currentSheetFileName) {
      console.warn('⚠️ ChangeDetector: No current sheet filename set');
      return;
    }

    const change: ChangeEntry = {
      cellId,
      previousValue,
      newValue,
      timestamp: Date.now(),
      source: 'ai'
    };

    this.logChange(change);
    console.log('🤖 AI change logged:', change);
  }

  // Internal method to log changes to localStorage
  private logChange(change: ChangeEntry): void {
    console.log('🔍 logChange called:', {
      change,
      currentSheetFileName: this.currentSheetFileName,
      storageKey: this.STORAGE_KEY
    });

    try {
      const allChanges = this.getAllChanges();
      console.log('🔍 Current all changes:', allChanges);
      
      if (!allChanges[this.currentSheetFileName]) {
        allChanges[this.currentSheetFileName] = [];
        console.log('🔍 Created new array for sheet:', this.currentSheetFileName);
      }

      // Remove any existing change for this cell (keep only latest)
      const beforeFilter = allChanges[this.currentSheetFileName].length;
      allChanges[this.currentSheetFileName] = allChanges[this.currentSheetFileName].filter(
        existing => existing.cellId !== change.cellId
      );
      const afterFilter = allChanges[this.currentSheetFileName].length;
      console.log('🔍 Filtered changes:', { beforeFilter, afterFilter });

      // Add the new change
      allChanges[this.currentSheetFileName].push(change);
      console.log('🔍 Added change, new count:', allChanges[this.currentSheetFileName].length);

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      console.log('💾 Saved to localStorage with key:', this.STORAGE_KEY);
      
      // Verify it was saved
      const verification = localStorage.getItem(this.STORAGE_KEY);
      console.log('✅ Verification - localStorage now contains:', verification ? JSON.parse(verification) : null);
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('sheetChangesUpdated', {
        detail: { sheetFileName: this.currentSheetFileName, changes: allChanges[this.currentSheetFileName] }
      }));
      console.log('📡 Dispatched sheetChangesUpdated event');

    } catch (error) {
      console.error('❌ Error logging change:', error);
    }
  }

  // Get changes for current sheet
  getCurrentSheetChanges(): ChangeEntry[] {
    if (!this.currentSheetFileName) return [];
    
    const allChanges = this.getAllChanges();
    return allChanges[this.currentSheetFileName] || [];
  }

  // Get changes for specific sheet
  getSheetChanges(sheetFileName: string): ChangeEntry[] {
    const allChanges = this.getAllChanges();
    
    console.log('🔍 getSheetChanges called for:', sheetFileName);
    console.log('🔍 All changes in localStorage:', allChanges);
    console.log('🔍 Available keys:', Object.keys(allChanges));
    
    // First try by sheet filename
    let changes = allChanges[sheetFileName] || [];
    console.log(`🔍 Changes found by filename "${sheetFileName}":`, changes.length);
    
    // If no changes found, also try by sheet ID patterns
    if (changes.length === 0) {
      console.log('🔍 No changes found for filename, checking sheet ID patterns...');
      
      // Check all keys to see if any match sheet ID patterns
      Object.keys(allChanges).forEach(key => {
        if (key.startsWith('sheet-') && allChanges[key].length > 0) {
          console.log(`📋 Found changes under sheet ID: ${key}`, allChanges[key]);
          changes = [...changes, ...allChanges[key]];
        }
      });
    }
    
    console.log(`📊 Total changes found for ${sheetFileName}:`, changes.length);
    return changes;
  }

  // Get all changes from localStorage
  private getAllChanges(): SheetChanges {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error loading changes from localStorage:', error);
      return {};
    }
  }

  // Load changes from localStorage on initialization
  private loadChangesFromStorage(): void {
    try {
      const allChanges = this.getAllChanges();
      console.log('📂 ChangeDetector: Loaded changes for', Object.keys(allChanges).length, 'sheets');
    } catch (error) {
      console.error('❌ Error loading changes from storage:', error);
    }
  }

  // Clear changes for current sheet
  clearCurrentSheetChanges(): void {
    if (!this.currentSheetFileName) return;
    
    try {
      const allChanges = this.getAllChanges();
      delete allChanges[this.currentSheetFileName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      
      console.log('🗑️ Cleared changes for sheet:', this.currentSheetFileName);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('sheetChangesCleared', {
        detail: { sheetFileName: this.currentSheetFileName }
      }));
      
    } catch (error) {
      console.error('❌ Error clearing changes:', error);
    }
  }

  // Clear changes for specific sheet
  clearSheetChanges(sheetFileName: string): void {
    try {
      const allChanges = this.getAllChanges();
      delete allChanges[sheetFileName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      
      console.log('🗑️ Cleared changes for sheet:', sheetFileName);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('sheetChangesCleared', {
        detail: { sheetFileName }
      }));
      
    } catch (error) {
      console.error('❌ Error clearing changes:', error);
    }
  }

  // Get summary of all changes
  getChangesSummary(): { 
    totalSheets: number; 
    totalChanges: number; 
    sheets: Array<{ fileName: string; changeCount: number; hasManual: boolean; hasAI: boolean }> 
  } {
    const allChanges = this.getAllChanges();
    const sheets = Object.entries(allChanges).map(([fileName, changes]) => ({
      fileName,
      changeCount: changes.length,
      hasManual: changes.some(c => c.source === 'manual'),
      hasAI: changes.some(c => c.source === 'ai')
    }));

    return {
      totalSheets: sheets.length,
      totalChanges: sheets.reduce((sum, sheet) => sum + sheet.changeCount, 0),
      sheets
    };
  }
}

export const changeDetector = ChangeDetector.getInstance();
export type { ChangeEntry, SheetChanges };
