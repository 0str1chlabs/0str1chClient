// Unified Change Manager - Coordinates between IndexedDB, localStorage, and UI
import { indexedDBService } from './indexedDBService';
import { sheetSpecificStorage } from './sheetSpecificStorage';
import { logAIDiff } from './aiChangeLogger';

interface UnifiedChange {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  source: 'indexeddb' | 'localstorage' | 'ai';
}

class UnifiedChangeManager {
  private static instance: UnifiedChangeManager;
  
  public static getInstance(): UnifiedChangeManager {
    if (!UnifiedChangeManager.instance) {
      UnifiedChangeManager.instance = new UnifiedChangeManager();
    }
    return UnifiedChangeManager.instance;
  }

  // Load all pending changes for a sheet from both IndexedDB and localStorage
  async loadPendingChanges(sheetId: string): Promise<UnifiedChange[]> {
    console.log('🔄 Loading pending changes for sheet:', sheetId);
    
    const allChanges: UnifiedChange[] = [];
    
    try {
      // Load changes from IndexedDB
      const sheet = await indexedDBService.getSheet(sheetId);
      if (sheet?.changes) {
        const indexedDBChanges = sheet.changes.map(change => ({
          ...change,
          source: 'indexeddb' as const
        }));
        allChanges.push(...indexedDBChanges);
        console.log('📊 Loaded', indexedDBChanges.length, 'changes from IndexedDB');
      }
      
      // Load changes from localStorage
      const localStorageChanges = sheetSpecificStorage.getSheetChanges(sheetId);
      if (localStorageChanges && localStorageChanges.length > 0) {
        const localStorageUnifiedChanges = localStorageChanges.map(change => ({
          cellId: change.cellId,
          previousValue: change.previousValue,
          newValue: change.newValue,
          timestamp: change.timestamp,
          source: 'localstorage' as const
        }));
        allChanges.push(...localStorageUnifiedChanges);
        console.log('📊 Loaded', localStorageUnifiedChanges.length, 'changes from localStorage');
      }
      
      // Sort by timestamp to get chronological order
      allChanges.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log('📊 Total pending changes:', allChanges.length);
      return allChanges;
      
    } catch (error) {
      console.error('❌ Error loading pending changes:', error);
      return [];
    }
  }

  // Convert unified changes to AI updates format
  convertToAIUpdates(changes: UnifiedChange[]) {
    return changes.map(change => ({
      cellId: change.cellId,
      originalValue: change.previousValue,
      aiValue: change.newValue,
      timestamp: change.timestamp,
      reasoning: `Change from ${change.source}`
    }));
  }

  // Save changes to IndexedDB
  async saveChangesToIndexedDB(sheetId: string, changes: UnifiedChange[]): Promise<void> {
    try {
      console.log('💾 Saving', changes.length, 'changes to IndexedDB for sheet:', sheetId);
      
      // Convert to the format expected by IndexedDB
      const indexedDBChanges = changes.map(change => ({
        cellId: change.cellId,
        previousValue: change.previousValue,
        newValue: change.newValue,
        timestamp: change.timestamp
      }));
      
      await indexedDBService.addChangesToSheet(sheetId, indexedDBChanges);
      console.log('✅ Changes saved to IndexedDB');
      
    } catch (error) {
      console.error('❌ Error saving changes to IndexedDB:', error);
      throw error;
    }
  }

  // Clear all changes for a sheet
  async clearAllChanges(sheetId: string): Promise<void> {
    try {
      console.log('🗑️ Clearing all changes for sheet:', sheetId);
      
      // Clear from localStorage
      sheetSpecificStorage.clearSheetChanges(sheetId);
      
      // Clear from IndexedDB by setting changes to empty array
      const sheet = await indexedDBService.getSheet(sheetId);
      if (sheet) {
        const { lastModified, ...sheetWithoutLastModified } = sheet;
        await indexedDBService.saveSheet({
          ...sheetWithoutLastModified,
          changes: []
        });
      }
      
      console.log('✅ All changes cleared for sheet:', sheetId);
      
    } catch (error) {
      console.error('❌ Error clearing changes:', error);
      throw error;
    }
  }

  // Apply changes to the UI and log them
  async applyChangesToUI(sheetId: string, changes: UnifiedChange[], createAIUpdates: (updates: any[]) => void): Promise<void> {
    try {
      console.log('🎯 Applying', changes.length, 'changes to UI for sheet:', sheetId);
      
      // Convert to AI updates format
      const aiUpdates = this.convertToAIUpdates(changes);
      
      // Create AI updates in the UI
      createAIUpdates(aiUpdates);
      
      // Log the changes
      const diffUpdates = changes.map(change => ({
        cellId: change.cellId,
        value: change.newValue
      }));
      
      logAIDiff(diffUpdates, (cellId) => {
        // Find the previous value from the changes
        const change = changes.find(c => c.cellId === cellId);
        return change?.previousValue;
      }, sheetId);
      
      console.log('✅ Changes applied to UI');
      
    } catch (error) {
      console.error('❌ Error applying changes to UI:', error);
      throw error;
    }
  }

  // Get change summary for debugging
  async getChangeSummary(sheetId: string): Promise<{
    indexedDBChanges: number;
    localStorageChanges: number;
    totalChanges: number;
  }> {
    try {
      const changes = await this.loadPendingChanges(sheetId);
      
      const indexedDBChanges = changes.filter(c => c.source === 'indexeddb').length;
      const localStorageChanges = changes.filter(c => c.source === 'localstorage').length;
      
      return {
        indexedDBChanges,
        localStorageChanges,
        totalChanges: changes.length
      };
      
    } catch (error) {
      console.error('❌ Error getting change summary:', error);
      return {
        indexedDBChanges: 0,
        localStorageChanges: 0,
        totalChanges: 0
      };
    }
  }
}

export const unifiedChangeManager = UnifiedChangeManager.getInstance();
