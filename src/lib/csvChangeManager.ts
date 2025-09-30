import { indexedDBService, CSVFile } from './indexedDBService';

interface AIChange {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
}

class CSVChangeManager {
  private currentCSVId: string | null = null;

  // Set the current CSV file ID
  setCurrentCSV(csvId: string): void {
    this.currentCSVId = csvId;
  }

  // Get current CSV ID
  getCurrentCSV(): string | null {
    return this.currentCSVId;
  }

  // Apply AI changes to CSV data and update IndexedDB
  async applyChangesToCSV(): Promise<boolean> {
    console.log('🔄 applyChangesToCSV called');
    
    if (!this.currentCSVId) {
      console.error('❌ No current CSV file set');
      return false;
    }

    console.log('🔍 Current CSV ID:', this.currentCSVId);

    try {
      // Ensure IndexedDB is initialized
      await indexedDBService.init();
      console.log('✅ IndexedDB initialized');
      
      // Get AI changes from localStorage
      const changesJson = localStorage.getItem('updated_sheet_values');
      if (!changesJson) {
        console.log('ℹ️ No AI changes to apply');
        return true;
      }

      const changes: AIChange[] = JSON.parse(changesJson);
      if (changes.length === 0) {
        console.log('ℹ️ No AI changes to apply (empty array)');
        return true;
      }

      console.log(`📝 Found ${changes.length} AI changes to apply:`, changes.slice(0, 3));

      // Get current CSV file from IndexedDB
      const csvFile = await indexedDBService.getCSVFile(this.currentCSVId);
      if (!csvFile) {
        console.error('❌ CSV file not found in IndexedDB');
        return false;
      }

      console.log('📄 CSV file found:', csvFile.name, 'Size:', csvFile.data.length, 'chars');

      // Parse CSV data
      const csvLines = csvFile.data.split('\n');
      const headers = csvLines[0].split(',');
      
      // Apply changes to CSV data
      let modifiedLines = [...csvLines];
      
      changes.forEach(change => {
        const { cellId, newValue } = change;
        
        // Parse cell ID (e.g., "A2" -> column A, row 2)
        const columnMatch = cellId.match(/^([A-Z]+)(\d+)$/);
        if (!columnMatch) return;
        
        const columnLetter = columnMatch[1];
        const rowNumber = parseInt(columnMatch[2]) - 1; // Convert to 0-based index
        
        // Convert column letter to index (A=0, B=1, etc.)
        const columnIndex = this.columnLetterToIndex(columnLetter);
        
        if (columnIndex >= 0 && rowNumber >= 0 && rowNumber < modifiedLines.length) {
          const line = modifiedLines[rowNumber + 1].split(','); // +1 to skip header
          if (columnIndex < line.length) {
            line[columnIndex] = String(newValue);
            modifiedLines[rowNumber + 1] = line.join(',');
          }
        }
      });

      // Update CSV file in IndexedDB
      const updatedCSVData = modifiedLines.join('\n');
      console.log('📝 Updating CSV in IndexedDB...');
      console.log('🔍 Original CSV size:', csvFile.data.length, 'chars');
      console.log('🔍 Updated CSV size:', updatedCSVData.length, 'chars');
      
      await indexedDBService.updateCSVFile(this.currentCSVId, updatedCSVData);
      console.log('✅ CSV updated in IndexedDB');

      // Clear AI changes from localStorage
      localStorage.removeItem('updated_sheet_values');
      console.log('🧹 Cleared AI changes from localStorage');
      
      console.log(`✅ Applied ${changes.length} AI changes to CSV file: ${csvFile.name}`);
      return true;

    } catch (error) {
      console.error('Error applying changes to CSV:', error);
      return false;
    }
  }

  // Convert column letter to index (A=0, B=1, C=2, etc.)
  private columnLetterToIndex(columnLetter: string): number {
    let index = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      index = index * 26 + (columnLetter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  }

  // Get pending AI changes count
  getPendingChangesCount(): number {
    try {
      const changesJson = localStorage.getItem('updated_sheet_values');
      if (!changesJson) return 0;
      const changes: AIChange[] = JSON.parse(changesJson);
      return changes.length;
    } catch {
      return 0;
    }
  }

  // Get pending AI changes
  getPendingChanges(): AIChange[] {
    try {
      const changesJson = localStorage.getItem('updated_sheet_values');
      if (!changesJson) return [];
      return JSON.parse(changesJson);
    } catch {
      return [];
    }
  }

  // Clear pending changes without applying
  clearPendingChanges(): void {
    localStorage.removeItem('updated_sheet_values');
  }
}

export const csvChangeManager = new CSVChangeManager();
export type { AIChange };
