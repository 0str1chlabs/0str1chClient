import { AIUpdate } from '@/types/spreadsheet';

interface LocalStorageChange {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
}

/**
 * Converts localStorage changes into AI updates that can be displayed in the sheet
 * This mimics the existing AI update system to show pending changes
 */
export function convertLocalStorageToAIUpdates(): AIUpdate[] {
  try {
    const changesJson = localStorage.getItem('updated_sheet_values');
    if (!changesJson) {
      return [];
    }

    const changes: LocalStorageChange[] = JSON.parse(changesJson);
    if (changes.length === 0) {
      return [];
    }

    console.log(`🔄 Converting ${changes.length} localStorage changes to AI updates`);
    console.log('🔍 Raw localStorage changes:', changes);

    // Convert localStorage changes to AI updates format
    const aiUpdates: AIUpdate[] = changes.map(change => ({
      cellId: change.cellId,
      originalValue: change.previousValue,
      aiValue: change.newValue,
      timestamp: change.timestamp,
      reasoning: 'Pending change from previous session'
    }));

    console.log('📋 Converted localStorage changes to AI updates:', aiUpdates);
    console.log('🔍 Sample changes:', aiUpdates.slice(0, 3));
    console.log('🔍 Full AI updates array:', aiUpdates);
    return aiUpdates;

  } catch (error) {
    console.error('❌ Error converting localStorage changes to AI updates:', error);
    return [];
  }
}

/**
 * Clears localStorage changes after they've been processed
 */
export function clearLocalStorageChanges(): void {
  try {
    localStorage.removeItem('updated_sheet_values');
    console.log('🧹 Cleared localStorage changes');
  } catch (error) {
    console.error('❌ Error clearing localStorage changes:', error);
  }
}

/**
 * Checks if there are pending changes in localStorage
 */
export function hasLocalStorageChanges(): boolean {
  try {
    const changesJson = localStorage.getItem('updated_sheet_values');
    if (!changesJson) return false;
    
    const changes = JSON.parse(changesJson);
    return Array.isArray(changes) && changes.length > 0;
  } catch {
    return false;
  }
}

/**
 * Debug function to log localStorage state
 */
export function debugLocalStorageState(): void {
  try {
    const changesJson = localStorage.getItem('updated_sheet_values');
    const csvId = localStorage.getItem('currentCSVId');
    
    console.log('🔍 localStorage Debug State:');
    console.log('  - currentCSVId:', csvId);
    console.log('  - updated_sheet_values:', changesJson ? JSON.parse(changesJson).length + ' entries' : 'null');
    
    if (changesJson) {
      const changes = JSON.parse(changesJson);
      console.log('  - Sample changes:', changes.slice(0, 3));
    }
  } catch (error) {
    console.error('❌ Error debugging localStorage state:', error);
  }
}
