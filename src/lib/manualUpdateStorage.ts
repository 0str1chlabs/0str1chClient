/**
 * Manual update storage utility with debouncing
 * Stores user manual edits in localStorage with sheet-specific keys
 * 
 * Usage:
 * - Manual updates are automatically stored when user edits cells
 * - Debounced storage (300ms delay) while typing to avoid excessive writes
 * - Immediate storage when user presses Enter, clicks away, or finishes editing
 * - Debug with F12 or Ctrl+U to see all manual updates in console
 * 
 * Storage format:
 * Key: "manualUpdate_<SheetName>"
 * Value: {
 *   "A1": { cellId: "A1", value: "new value", timestamp: 1234567890, previousValue: "old value" },
 *   "B2": { cellId: "B2", value: 42, timestamp: 1234567891, previousValue: 0 }
 * }
 * 
 * Examples:
 * - "manualUpdate_Budget" -> { "A1": {...}, "B2": {...} }
 * - "manualUpdate_Sales" -> { "C3": {...}, "D4": {...} }
 * - "manualUpdate_Inventory" -> { "E5": {...} }
 */

interface ManualUpdate {
  cellId: string;
  value: string | number;
  timestamp: number;
  previousValue?: string | number;
}

interface ManualUpdates {
  [cellId: string]: ManualUpdate;
}

class ManualUpdateStorage {
  private static instance: ManualUpdateStorage;
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // 300ms debounce delay
  private readonly STORAGE_KEY_PREFIX = 'manualUpdate_';
  private currentSheetName: string = 'default';

  static getInstance(): ManualUpdateStorage {
    if (!ManualUpdateStorage.instance) {
      ManualUpdateStorage.instance = new ManualUpdateStorage();
    }
    return ManualUpdateStorage.instance;
  }

  /**
   * Set the current sheet name for manual updates
   */
  setCurrentSheet(sheetName: string): void {
    this.currentSheetName = sheetName;
    console.log('📋 Current sheet set to:', sheetName);
  }

  /**
   * Get the current sheet name
   */
  getCurrentSheet(): string {
    return this.currentSheetName;
  }

  /**
   * Get the storage key for the current sheet
   */
  private getStorageKey(sheetName?: string): string {
    const sheet = sheetName || this.currentSheetName;
    return `${this.STORAGE_KEY_PREFIX}${this.normalizeName(sheet)}`;
  }

  /**
   * Normalize names consistently with storage (matches IndexedDB cleaning)
   */
  private normalizeName(name: string): string {
    try {
      // Lazy import to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const utils = require('./filenameUtils');
      if (typeof utils.cleanFilename === 'function') {
        return utils.cleanFilename(name, undefined, true);
      }
    } catch {}
    return name.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_');
  }

  /**
   * Public helper to compute the exact storage key used for a sheet name
   */
  getKeyForSheet(sheetName?: string): string {
    return this.getStorageKey(sheetName);
  }

  /**
   * Debounced function to store manual updates
   */
  private debouncedStore = (cellId: string, value: string | number, previousValue?: string | number, sheetName?: string) => {
    // Clear existing timeout for this cell
    const existingTimeout = this.debounceTimeouts.get(cellId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.storeManualUpdate(cellId, value, previousValue, sheetName);
      this.debounceTimeouts.delete(cellId);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimeouts.set(cellId, timeout);
  };

  /**
   * Store manual update in localStorage
   */
  private storeManualUpdate(cellId: string, value: string | number, previousValue?: string | number, sheetName?: string): void {
    try {
      const storageKey = this.getStorageKey(sheetName);
      const currentSheet = sheetName || this.currentSheetName;
      
      // Get existing manual updates for this sheet
      const existingUpdates = this.getManualUpdates(currentSheet);
      
      // Create new update
      const update: ManualUpdate = {
        cellId,
        value,
        timestamp: Date.now(),
        previousValue
      };

      // Update the storage
      existingUpdates[cellId] = update;
      
      // Store in localStorage with sheet-specific key
      localStorage.setItem(storageKey, JSON.stringify(existingUpdates));
      
      console.log('💾 Manual update stored:', {
        sheetName: currentSheet,
        cellId,
        value,
        previousValue,
        timestamp: update.timestamp
      });
    } catch (error) {
      console.error('❌ Error storing manual update:', error);
    }
  }

  /**
   * Get all manual updates from localStorage for a specific sheet
   */
  getManualUpdates(sheetName?: string): ManualUpdates {
    try {
      const storageKey = this.getStorageKey(sheetName);
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error reading manual updates from localStorage:', error);
      return {};
    }
  }

  /**
   * Get manual updates for a specific cell
   */
  getManualUpdateForCell(cellId: string, sheetName?: string): ManualUpdate | null {
    const updates = this.getManualUpdates(sheetName);
    return updates[cellId] || null;
  }

  /**
   * Clear manual updates for a specific cell
   */
  clearManualUpdateForCell(cellId: string, sheetName?: string): void {
    try {
      const storageKey = this.getStorageKey(sheetName);
      const updates = this.getManualUpdates(sheetName);
      delete updates[cellId];
      localStorage.setItem(storageKey, JSON.stringify(updates));
      console.log('🗑️ Manual update cleared for cell:', cellId, 'in sheet:', sheetName || this.currentSheetName);
    } catch (error) {
      console.error('❌ Error clearing manual update:', error);
    }
  }

  /**
   * Clear all manual updates for a specific sheet
   */
  clearAllManualUpdates(sheetName?: string): void {
    try {
      const storageKey = this.getStorageKey(sheetName);
      localStorage.removeItem(storageKey);
      console.log('🗑️ All manual updates cleared for sheet:', sheetName || this.currentSheetName);
    } catch (error) {
      console.error('❌ Error clearing all manual updates:', error);
    }
  }

  /**
   * Clear manual updates for all sheets
   */
  clearAllSheetsManualUpdates(): void {
    try {
      // Get all localStorage keys that start with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all manual update keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ All manual updates cleared for all sheets:', keysToRemove);
    } catch (error) {
      console.error('❌ Error clearing all sheets manual updates:', error);
    }
  }

  /**
   * Store manual update with debouncing
   * This is the main method to call when user edits a cell
   */
  storeManualUpdateDebounced(cellId: string, value: string | number, previousValue?: string | number, sheetName?: string): void {
    console.log('⏱️ Debouncing manual update for cell:', cellId, 'value:', value, 'sheet:', sheetName || this.currentSheetName);
    this.debouncedStore(cellId, value, previousValue, sheetName);
  }

  /**
   * Force immediate storage (bypass debouncing)
   * Useful when user presses Enter or clicks away
   */
  storeManualUpdateImmediate(cellId: string, value: string | number, previousValue?: string | number, sheetName?: string): void {
    // Clear any pending debounced update for this cell
    const existingTimeout = this.debounceTimeouts.get(cellId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.debounceTimeouts.delete(cellId);
    }

    // Store immediately
    this.storeManualUpdate(cellId, value, previousValue, sheetName);
  }

  /**
   * Get count of manual updates for a specific sheet
   */
  getManualUpdateCount(sheetName?: string): number {
    const updates = this.getManualUpdates(sheetName);
    return Object.keys(updates).length;
  }

  /**
   * Check if there are any manual updates for a specific sheet
   */
  hasManualUpdates(sheetName?: string): boolean {
    return this.getManualUpdateCount(sheetName) > 0;
  }

  /**
   * Get all manual updates as an array (for debugging/display)
   */
  getAllManualUpdatesArray(sheetName?: string): ManualUpdate[] {
    const updates = this.getManualUpdates(sheetName);
    return Object.values(updates);
  }

  /**
   * Get all manual updates for all sheets
   */
  getAllSheetsManualUpdates(): { [sheetName: string]: ManualUpdates } {
    const allSheetsUpdates: { [sheetName: string]: ManualUpdates } = {};
    
    try {
      // Get all localStorage keys that start with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const sheetName = key.replace(this.STORAGE_KEY_PREFIX, '');
          const updates = this.getManualUpdates(sheetName);
          if (Object.keys(updates).length > 0) {
            allSheetsUpdates[sheetName] = updates;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error getting all sheets manual updates:', error);
    }
    
    return allSheetsUpdates;
  }

  /**
   * Log all manual updates to console (for debugging)
   */
  logAllManualUpdates(sheetName?: string): void {
    if (sheetName) {
      const updates = this.getAllManualUpdatesArray(sheetName);
      console.log(`📋 Manual updates for sheet "${sheetName}":`, updates);
      console.log(`📊 Total manual updates for "${sheetName}":`, updates.length);
    } else {
      const allSheetsUpdates = this.getAllSheetsManualUpdates();
      console.log('📋 All manual updates for all sheets:', allSheetsUpdates);
      
      let totalUpdates = 0;
      Object.keys(allSheetsUpdates).forEach(sheet => {
        const count = Object.keys(allSheetsUpdates[sheet]).length;
        totalUpdates += count;
        console.log(`📊 Sheet "${sheet}": ${count} updates`);
      });
      console.log(`📊 Total manual updates across all sheets: ${totalUpdates}`);
    }
  }

  /**
   * Get a summary of all manual updates across all sheets
   */
  getManualUpdatesSummary(): { [sheetName: string]: { count: number; cells: string[] } } {
    const allSheetsUpdates = this.getAllSheetsManualUpdates();
    const summary: { [sheetName: string]: { count: number; cells: string[] } } = {};
    
    Object.keys(allSheetsUpdates).forEach(sheetName => {
      const updates = allSheetsUpdates[sheetName];
      const cells = Object.keys(updates);
      summary[sheetName] = {
        count: cells.length,
        cells: cells
      };
    });
    
    return summary;
  }

  /**
   * Check if a specific cell has manual updates in any sheet
   */
  findCellInAllSheets(cellId: string): { sheetName: string; update: ManualUpdate }[] {
    const results: { sheetName: string; update: ManualUpdate }[] = [];
    const allSheetsUpdates = this.getAllSheetsManualUpdates();
    
    Object.keys(allSheetsUpdates).forEach(sheetName => {
      const updates = allSheetsUpdates[sheetName];
      if (updates[cellId]) {
        results.push({
          sheetName,
          update: updates[cellId]
        });
      }
    });
    
    return results;
  }
}

// Export singleton instance
export const manualUpdateStorage = ManualUpdateStorage.getInstance();
export type { ManualUpdate, ManualUpdates };
