/**
 * Migration Script: Complex IndexedDB → Simple IndexedDB
 * 
 * This script helps migrate from the current complex multi-store
 * structure to the simplified single-store approach.
 */

import { simpleIndexedDBService, type SheetRecord } from './simpleIndexedDBService';

class IndexedDBMigrator {
  private oldDbName = 'AISheetsDB';
  private oldVersion = 2;

  async migrate(): Promise<{ success: boolean; migratedSheets: number; errors: string[] }> {
    const errors: string[] = [];
    let migratedSheets = 0;

    try {
      console.log('🔄 Starting IndexedDB migration to simplified structure...');

      // Initialize the new simple service
      await simpleIndexedDBService.init();

      // Open the old database
      const oldDb = await this.openOldDatabase();
      if (!oldDb) {
        throw new Error('Could not open old database');
      }

      // Migrate CSV files
      const csvFiles = await this.migrateCSVFiles(oldDb);
      console.log(`📁 Migrated ${csvFiles.length} CSV files`);

      // Migrate sheet data
      const sheetData = await this.migrateSheetData(oldDb);
      console.log(`📊 Migrated ${sheetData.length} sheet data records`);

      // Migrate sheet changes
      const sheetChanges = await this.migrateSheetChanges(oldDb);
      console.log(`🔄 Migrated ${sheetChanges.length} sheet changes`);

      // Combine and create unified records
      const unifiedRecords = this.combineRecords(csvFiles, sheetData, sheetChanges);
      
      // Save to new structure
      for (const record of unifiedRecords) {
        try {
          await simpleIndexedDBService.saveSheet(record);
          migratedSheets++;
        } catch (error) {
          errors.push(`Failed to migrate sheet ${record.name}: ${error}`);
        }
      }

      console.log(`✅ Migration completed: ${migratedSheets} sheets migrated`);
      
      return {
        success: errors.length === 0,
        migratedSheets,
        errors
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      errors.push(`Migration failed: ${error}`);
      
      return {
        success: false,
        migratedSheets,
        errors
      };
    }
  }

  private async openOldDatabase(): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.oldDbName, this.oldVersion);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.log('⚠️ Old database not found or accessible');
        resolve(null);
      };
    });
  }

  private async migrateCSVFiles(db: IDBDatabase): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('csvFiles')) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(['csvFiles'], 'readonly');
      const store = transaction.objectStore('csvFiles');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async migrateSheetData(db: IDBDatabase): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('sheetData')) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(['sheetData'], 'readonly');
      const store = transaction.objectStore('sheetData');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async migrateSheetChanges(db: IDBDatabase): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('sheetChanges')) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(['sheetChanges'], 'readonly');
      const store = transaction.objectStore('sheetChanges');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private combineRecords(csvFiles: any[], sheetData: any[], sheetChanges: any[]): Omit<SheetRecord, 'id' | 'lastModified'>[] {
    const records: Omit<SheetRecord, 'id' | 'lastModified'>[] = [];

    // Process CSV files as primary source
    for (const csvFile of csvFiles) {
      const matchingSheetData = sheetData.find(sd => sd.sheetId === csvFile.sheetId);
      const matchingChanges = sheetChanges.find(sc => sc.sheetId === csvFile.sheetId);

      const record: Omit<SheetRecord, 'id' | 'lastModified'> = {
        name: csvFile.name,
        csvData: csvFile.data,
        isActive: matchingSheetData?.isActive || false,
        changes: matchingChanges?.changes || [],
        metadata: {
          rowCount: matchingSheetData?.rowCount || 0,
          colCount: matchingSheetData?.colCount || 0,
          fileSize: csvFile.data?.length || 0,
          uploadDate: csvFile.uploadedAt || Date.now()
        }
      };

      records.push(record);
    }

    // Add any sheet data records that don't have corresponding CSV files
    for (const sheet of sheetData) {
      const hasCsvFile = csvFiles.some(csv => csv.sheetId === sheet.sheetId);
      if (!hasCsvFile) {
        const matchingChanges = sheetChanges.find(sc => sc.sheetId === sheet.sheetId);
        
        const record: Omit<SheetRecord, 'id' | 'lastModified'> = {
          name: sheet.sheetName,
          csvData: '', // No CSV data available
          isActive: sheet.isActive || false,
          changes: matchingChanges?.changes || [],
          metadata: {
            rowCount: sheet.rowCount || 0,
            colCount: sheet.colCount || 0,
            fileSize: 0,
            uploadDate: sheet.lastModified || Date.now()
          }
        };

        records.push(record);
      }
    }

    return records;
  }

  // Clean up old database after successful migration
  async cleanupOldDatabase(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old database structure...');
      
      // This would require closing all connections and reopening
      // For now, we'll just log that cleanup is needed
      console.log('⚠️ Manual cleanup required: Delete old IndexedDB stores');
      console.log('   - Close all browser tabs with the app');
      console.log('   - Clear browser data for this site');
      console.log('   - Or use browser dev tools to delete the old database');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

export const migrator = new IndexedDBMigrator();

// Auto-migration function
export async function autoMigrateToSimpleIndexedDB(): Promise<boolean> {
  try {
    console.log('🚀 Starting automatic migration to simplified IndexedDB...');
    
    const result = await migrator.migrate();
    
    if (result.success) {
      console.log(`✅ Migration successful: ${result.migratedSheets} sheets migrated`);
      return true;
    } else {
      console.error('❌ Migration failed:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    return false;
  }
}

