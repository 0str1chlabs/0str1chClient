/**
 * Sheet-specific storage management for localStorage and IndexedDB
 * This ensures that changes are tracked per sheet rather than globally
 */

interface SheetSpecificChange {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
}

interface SheetSpecificChanges {
  [fileName: string]: SheetSpecificChange[];
}

class SheetSpecificStorageService {
  private readonly STORAGE_KEY = 'sheet_changes_by_filename';
  private readonly AI_DIFF_KEY = 'sheet_ai_diff_by_filename';

  // Clean filename for localStorage key (remove special characters, make safe)
  private cleanFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase();
  }

  // Save changes for a specific sheet by filename
  saveSheetChanges(fileName: string, changes: SheetSpecificChange[]): void {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allChanges = this.getAllSheetChanges();
      allChanges[cleanName] = changes;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      console.log(`💾 Saved ${changes.length} changes for sheet "${fileName}" (key: ${cleanName})`);
    } catch (error) {
      console.error('❌ Error saving sheet changes:', error);
    }
  }

  // Get changes for a specific sheet by filename
  getSheetChanges(fileName: string): SheetSpecificChange[] {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allChanges = this.getAllSheetChanges();
      return allChanges[cleanName] || [];
    } catch (error) {
      console.error('❌ Error getting sheet changes:', error);
      return [];
    }
  }

  // Get all changes for all sheets
  getAllSheetChanges(): SheetSpecificChanges {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error getting all sheet changes:', error);
      return {};
    }
  }

  // Add a single change for a specific sheet by filename
  addSheetChange(fileName: string, change: SheetSpecificChange): void {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allChanges = this.getAllSheetChanges();
      if (!allChanges[cleanName]) {
        allChanges[cleanName] = [];
      }
      allChanges[cleanName].push(change);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      console.log(`💾 Added change for sheet "${fileName}" (key: ${cleanName}):`, change);
    } catch (error) {
      console.error('❌ Error adding sheet change:', error);
    }
  }

  // Clear changes for a specific sheet by filename
  clearSheetChanges(fileName: string): void {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allChanges = this.getAllSheetChanges();
      delete allChanges[cleanName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allChanges));
      console.log(`🗑️ Cleared changes for sheet "${fileName}" (key: ${cleanName})`);
    } catch (error) {
      console.error('❌ Error clearing sheet changes:', error);
    }
  }

  // Clear all changes for all sheets
  clearAllSheetChanges(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared all sheet changes');
    } catch (error) {
      console.error('❌ Error clearing all sheet changes:', error);
    }
  }

  // Save AI diff for a specific sheet by filename
  saveSheetAIDiff(fileName: string, diff: any): void {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allDiffs = this.getAllSheetAIDiffs();
      allDiffs[cleanName] = diff;
      localStorage.setItem(this.AI_DIFF_KEY, JSON.stringify(allDiffs));
      console.log(`💾 Saved AI diff for sheet "${fileName}" (key: ${cleanName})`);
    } catch (error) {
      console.error('❌ Error saving sheet AI diff:', error);
    }
  }

  // Get AI diff for a specific sheet by filename
  getSheetAIDiff(fileName: string): any {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allDiffs = this.getAllSheetAIDiffs();
      return allDiffs[cleanName] || null;
    } catch (error) {
      console.error('❌ Error getting sheet AI diff:', error);
      return null;
    }
  }

  // Get all AI diffs for all sheets
  getAllSheetAIDiffs(): { [fileName: string]: any } {
    try {
      const stored = localStorage.getItem(this.AI_DIFF_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error getting all sheet AI diffs:', error);
      return {};
    }
  }

  // Clear AI diff for a specific sheet by filename
  clearSheetAIDiff(fileName: string): void {
    try {
      const cleanName = this.cleanFilename(fileName);
      const allDiffs = this.getAllSheetAIDiffs();
      delete allDiffs[cleanName];
      localStorage.setItem(this.AI_DIFF_KEY, JSON.stringify(allDiffs));
      console.log(`🗑️ Cleared AI diff for sheet "${fileName}" (key: ${cleanName})`);
    } catch (error) {
      console.error('❌ Error clearing sheet AI diff:', error);
    }
  }

  // Clear all AI diffs for all sheets
  clearAllSheetAIDiffs(): void {
    try {
      localStorage.removeItem(this.AI_DIFF_KEY);
      console.log('🗑️ Cleared all sheet AI diffs');
    } catch (error) {
      console.error('❌ Error clearing all sheet AI diffs:', error);
    }
  }

  // Get summary of all stored data
  getStorageSummary(): {
    totalSheets: number;
    totalChanges: number;
    sheets: Array<{
      fileName: string;
      changesCount: number;
      hasAIDiff: boolean;
    }>;
  } {
    try {
      const allChanges = this.getAllSheetChanges();
      const allDiffs = this.getAllSheetAIDiffs();
      
      const sheets = Object.keys(allChanges).map(fileName => ({
        fileName,
        changesCount: allChanges[fileName]?.length || 0,
        hasAIDiff: !!allDiffs[fileName]
      }));

      const totalChanges = sheets.reduce((sum, sheet) => sum + sheet.changesCount, 0);

      return {
        totalSheets: sheets.length,
        totalChanges,
        sheets
      };
    } catch (error) {
      console.error('❌ Error getting storage summary:', error);
      return { totalSheets: 0, totalChanges: 0, sheets: [] };
    }
  }

  // Migration helper: Convert old sheet-ID-based storage to filename-based
  migrateFromSheetIDs(): void {
    try {
      console.log('🔄 Migrating localStorage from sheet IDs to filenames...');
      
      // Check for old storage keys
      const oldChanges = localStorage.getItem('sheet_specific_changes');
      const oldAIDiffs = localStorage.getItem('sheet_specific_ai_diff');
      
      if (oldChanges || oldAIDiffs) {
        console.log('📦 Found old localStorage data to migrate');
        
        // For now, we can't automatically map sheet IDs to filenames
        // So we'll just log what we found and let the user know
        if (oldChanges) {
          const parsedChanges = JSON.parse(oldChanges);
          console.log('📋 Old changes found for sheet IDs:', Object.keys(parsedChanges));
        }
        
        if (oldAIDiffs) {
          const parsedDiffs = JSON.parse(oldAIDiffs);
          console.log('📋 Old AI diffs found for sheet IDs:', Object.keys(parsedDiffs));
        }
        
        console.log('⚠️ Manual migration may be required - old data will be preserved');
      } else {
        console.log('✅ No old localStorage data found to migrate');
      }
      
    } catch (error) {
      console.error('❌ Error during migration:', error);
    }
  }
}

export const sheetSpecificStorage = new SheetSpecificStorageService();
export type { SheetSpecificChange, SheetSpecificChanges };

