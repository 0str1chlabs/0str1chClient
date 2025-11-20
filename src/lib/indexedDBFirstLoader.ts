/**
 * IndexedDB-first loading service
 * Always loads from IndexedDB first, only fetches from Backblaze if not found
 */

import { indexedDBService, SheetData } from './indexedDBService';
import { sessionTracker } from './sessionTracker';
import BackblazeApiService from '../services/backblazeApiService';

interface LoadedSheet {
  sheetId: string;
  sheetName: string;
  csvData: string;
  source: 'indexeddb' | 'backblaze';
  lastModified: number;
  isActive?: boolean;
  rowCount?: number;
  colCount?: number;
  changes?: Array<{
    cellId: string;
    previousValue: any;
    newValue: any;
    timestamp: number;
  }>;
}

class IndexedDBFirstLoaderService {
  private backblazeService: BackblazeApiService | null = null;

  constructor() {
    this.backblazeService = BackblazeApiService.getInstance();
  }

  // Load all sheets with IndexedDB-first strategy
  async loadAllSheets(userEmail: string): Promise<LoadedSheet[]> {
    console.log('🔄 Starting IndexedDB-first sheet loading for user:', userEmail);
    console.log('🔍 IndexedDB service available:', !!indexedDBService);
    
    try {
      // Step 1: Load all sheets from IndexedDB
      console.log('📊 Step 1: Checking IndexedDB for existing sheets...');
      const indexedDBSheets = await this.loadSheetsFromIndexedDB();
      console.log('📊 Found', indexedDBSheets.length, 'sheets in IndexedDB');
      
      if (indexedDBSheets.length > 0) {
        // We have sheets in IndexedDB, use them as primary source
        console.log('✅ IndexedDB has data - using as primary source (no Backblaze call needed)');
        console.log('📋 IndexedDB sheets:', indexedDBSheets.map(s => ({ name: s.sheetName, size: s.csvData?.length || 0 })));
        
        return indexedDBSheets.map(sheet => ({
          sheetId: sheet.sheetId,
          sheetName: sheet.sheetName,
          csvData: sheet.csvData,
          source: 'indexeddb' as const,
          lastModified: sheet.lastModified,
          isActive: sheet.isActive,
          rowCount: (sheet as any).rowCount || 0,
          colCount: (sheet as any).colCount || 0,
          changes: (sheet as any).changes || [] // Include changes from IndexedDB
        }));
      } else {
        console.log('📭 IndexedDB is empty - will fetch from Backblaze');
      }
      
      // Step 2: No sheets in IndexedDB, fetch from Backblaze
      console.log('📊 No sheets in IndexedDB, fetching from Backblaze...');
      const backblazeSheets = await this.loadSheetsFromBackblaze(userEmail);
      console.log('📊 Found', backblazeSheets.length, 'sheets in Backblaze');
      
      // Step 3: Save Backblaze sheets to IndexedDB for future use
      if (backblazeSheets.length > 0) {
        console.log('💾 Saving Backblaze sheets to IndexedDB...');
        for (const sheet of backblazeSheets) {
          try {
            await indexedDBService.saveSheet({
              name: sheet.sheetName,
              csvData: sheet.csvData,
              isActive: sheet.isActive,
              metadata: {
                rowCount: sheet.rowCount || 0,
                colCount: sheet.colCount || 0,
                fileSize: sheet.csvData.length,
                uploadDate: sheet.lastModified
              }
            });
            sessionTracker.trackIndexedDBChange(sheet.sheetId, 'create', 'Loaded from Backblaze and saved to IndexedDB');
          } catch (error) {
            console.error('❌ Error saving sheet to IndexedDB:', sheet.sheetName, error);
          }
        }
        console.log('✅ Backblaze sheets saved to IndexedDB');
      } else {
        console.log('📭 No sheets found in Backblaze either, starting with empty state');
      }
      
      return backblazeSheets;
      
    } catch (error) {
      console.error('❌ Error in IndexedDB-first loading:', error);
      console.log('🔄 Falling back to empty state due to loading errors');
      return [];
    }
  }

  // Load a specific sheet with IndexedDB-first strategy
  async loadSheet(sheetId: string, userEmail: string): Promise<LoadedSheet | null> {
    console.log('🔄 Loading sheet with IndexedDB-first strategy:', sheetId);
    
    try {
      // Step 1: Try to load from IndexedDB first
      const indexedDBSheet = await indexedDBService.getSheet(sheetId);
      if (indexedDBSheet) {
        console.log('✅ Sheet found in IndexedDB:', sheetId);
        return {
          sheetId: indexedDBSheet.id,
          sheetName: indexedDBSheet.name,
          csvData: indexedDBSheet.csvData,
          source: 'indexeddb',
          lastModified: indexedDBSheet.lastModified
        };
      }
      
      // Step 2: Not found in IndexedDB, fetch from Backblaze
      console.log('📊 Sheet not found in IndexedDB, fetching from Backblaze...');
      const backblazeSheet = await this.loadSheetFromBackblaze(sheetId, userEmail);
      if (backblazeSheet) {
        // Save to IndexedDB for future use
        await indexedDBService.saveSheet({
          name: backblazeSheet.sheetName,
          csvData: backblazeSheet.csvData,
          isActive: false,
          metadata: {
            rowCount: 0,
            colCount: 0,
            fileSize: backblazeSheet.csvData.length,
            uploadDate: Date.now()
          }
        });
        sessionTracker.trackIndexedDBChange(backblazeSheet.sheetId, 'create', 'Loaded from Backblaze and saved to IndexedDB');
        console.log('✅ Sheet loaded from Backblaze and saved to IndexedDB');
      }
      
      return backblazeSheet;
      
    } catch (error) {
      console.error('❌ Error loading sheet:', error);
      return null;
    }
  }

  // Sync IndexedDB changes to Backblaze
  async syncToBackblaze(userEmail: string): Promise<boolean> {
    if (!this.backblazeService) {
      console.error('❌ Backblaze service not available');
      return false;
    }

    try {
      console.log('🔄 Starting sync to Backblaze for user:', userEmail);
      
      // Check if sync is needed
      if (!sessionTracker.needsBackblazeSync()) {
        console.log('📭 No changes detected, skipping Backblaze sync');
        return true;
      }

      // Authenticate with Backblaze
      const authResult = await this.backblazeService.authenticate();
      if (!authResult.success) {
        console.error('❌ Backblaze authentication failed:', authResult.message);
        return false;
      }

      // Get all sheets from IndexedDB
      const indexedDBSheets = await indexedDBService.getAllSheets();
      console.log('📊 Syncing', indexedDBSheets.length, 'sheets to Backblaze');

      let successCount = 0;
      for (const sheet of indexedDBSheets) {
        try {
          // Convert CSV data to the format expected by Backblaze
          const csvData = sheet.csvData;
          const fileName = `${sheet.name}.csv`;
          
          // Upload to Backblaze
          const uploadResult = await this.backblazeService.uploadFile(
            userEmail,
            fileName,
            csvData,
            { contentType: 'text/csv' }
          );
          
          if (uploadResult.success) {
            successCount++;
            console.log('✅ Synced sheet to Backblaze:', sheet.name);
          } else {
            console.error('❌ Failed to sync sheet to Backblaze:', sheet.name, uploadResult.message);
          }
        } catch (error) {
          console.error('❌ Error syncing sheet to Backblaze:', sheet.name, error);
        }
      }

      if (successCount > 0) {
        // Update sync timestamp
        sessionTracker.setLastBackblazeSyncTime();
        console.log('✅ Successfully synced', successCount, 'sheets to Backblaze');
        return true;
      } else {
        console.error('❌ No sheets were successfully synced to Backblaze');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error syncing to Backblaze:', error);
      return false;
    }
  }

  // Load sheets from IndexedDB
  private async loadSheetsFromIndexedDB(): Promise<SheetData[]> {
    try {
      console.log('🔧 Initializing IndexedDB service...');
      await indexedDBService.init();
      console.log('✅ IndexedDB service initialized');
      
      // Use the new simplified method instead of the old complex one
      console.log('📊 Fetching all sheets from IndexedDB...');
      const sheets = await indexedDBService.getAllSheets();
      console.log('📊 Raw IndexedDB response:', {
        sheetsCount: sheets.length,
        sheetsData: sheets.map(s => ({
          id: s.id,
          name: s.name,
          csvDataLength: s.csvData?.length || 0,
          lastModified: new Date(s.lastModified).toISOString(),
          isActive: s.isActive
        }))
      });
      
      if (sheets.length === 0) {
        console.log('📭 IndexedDB is completely empty - no sheets found');
        return [];
      }
      
      // Convert simplified structure back to expected format for backward compatibility
      // IMPORTANT: Include changes so they can be applied after loading
      const convertedSheets: SheetData[] = sheets.map(sheet => ({
        sheetId: sheet.id,
        sheetName: sheet.name,
        csvData: sheet.csvData,
        lastModified: sheet.lastModified,
        isActive: sheet.isActive,
        rowCount: sheet.metadata?.rowCount || 0,
        colCount: sheet.metadata?.colCount || 0,
        changes: sheet.changes || [] // Include changes for later application
      }));
      
      console.log('✅ Successfully converted', convertedSheets.length, 'sheets from IndexedDB');
      return convertedSheets;
    } catch (error) {
      console.error('❌ Error loading sheets from IndexedDB:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // If it's a schema error, try to clear and reinitialize
      if (error instanceof Error && error.message.includes('object stores was not found')) {
        console.log('🔄 IndexedDB schema needs update, clearing database...');
        try {
          // Clear the database to force schema update
          await this.clearIndexedDB();
          await indexedDBService.init();
          console.log('✅ IndexedDB cleared and reinitialized');
          return [];
        } catch (clearError) {
          console.error('❌ Error clearing IndexedDB:', clearError);
        }
      }
      
      return [];
    }
  }

  // Clear IndexedDB to force schema update
  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('AISheetsDB');
      deleteRequest.onsuccess = () => {
        console.log('✅ IndexedDB database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => {
        console.error('❌ Error deleting IndexedDB database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
    });
  }

  // Load sheets from Backblaze
  private async loadSheetsFromBackblaze(userEmail: string): Promise<LoadedSheet[]> {
    if (!this.backblazeService) {
      console.error('❌ Backblaze service not available');
      return [];
    }

    try {
      // Authenticate with Backblaze
      const authResult = await this.backblazeService.authenticate();
      if (!authResult.success) {
        console.error('❌ Backblaze authentication failed:', authResult.message);
        return [];
      }

      // Get list of user files
      const filesResult = await this.backblazeService.listUserFiles(userEmail);
      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        console.log('📭 No files found in Backblaze for user:', userEmail);
        return [];
      }

      const loadedSheets: LoadedSheet[] = [];
      const processedSheetNames = new Set<string>(); // Track processed sheet names to avoid duplicates
      
      console.log('📋 Files found in Backblaze:', filesResult.files.map(f => f.fileName));
      
      // Load each file from Backblaze with deduplication
      for (const file of filesResult.files) {
        try {
          // Clean the filename to check for duplicates
          const { cleanFilename } = await import('./filenameUtils');
          const cleanedName = cleanFilename(file.fileName, userEmail, true);
          
          // Skip if we've already processed a sheet with this cleaned name
          if (processedSheetNames.has(cleanedName)) {
            console.log(`🔄 Skipping duplicate sheet: "${file.fileName}" -> "${cleanedName}" (already processed)`);
            continue;
          }
          
          console.log(`📄 Processing sheet: "${file.fileName}" -> "${cleanedName}"`);
          const sheet = await this.loadSheetFromBackblazeFile(file, userEmail);
          if (sheet) {
            // Use the cleaned name for the sheet
            sheet.sheetName = cleanedName;
            loadedSheets.push(sheet);
            processedSheetNames.add(cleanedName);
            console.log(`✅ Added sheet: "${cleanedName}"`);
          }
        } catch (error) {
          console.error('❌ Error loading file from Backblaze:', file.fileName, error);
        }
      }

      console.log('📊 Loaded', loadedSheets.length, 'sheets from Backblaze');
      return loadedSheets;
      
    } catch (error) {
      console.error('❌ Error loading sheets from Backblaze:', error);
      return [];
    }
  }

  // Load a specific sheet from Backblaze
  private async loadSheetFromBackblaze(sheetId: string, userEmail: string): Promise<LoadedSheet | null> {
    if (!this.backblazeService) {
      return null;
    }

    try {
      // This would need to be implemented based on how you identify sheets in Backblaze
      // For now, we'll return null as this is a placeholder
      console.log('⚠️ loadSheetFromBackblaze not yet implemented for specific sheet ID');
      return null;
    } catch (error) {
      console.error('❌ Error loading sheet from Backblaze:', error);
      return null;
    }
  }

  // Load a sheet from a Backblaze file
  private async loadSheetFromBackblazeFile(file: any, userEmail: string): Promise<LoadedSheet | null> {
    if (!this.backblazeService) {
      return null;
    }

    try {
      // The backend already strips folder prefix and .gz when listing; use provided name directly
      const baseFileName = file.fileName;
      console.log('🔄 Downloading file from Backblaze (using API-provided name):', {
        fileName: baseFileName,
        userEmail: userEmail
      });
      
      // Prefer retrieving by fileId to avoid any path/encoding ambiguity
      let downloadResult = null as any;
      if ((file as any).fileId) {
        downloadResult = await this.backblazeService.downloadFileById(userEmail, (file as any).fileId);
        if (!downloadResult.success) {
          // Fallback to name-based download if needed
          downloadResult = await this.backblazeService.downloadFile(userEmail, baseFileName);
        }
      } else {
        downloadResult = await this.backblazeService.downloadFile(userEmail, baseFileName);
      }
      if (!downloadResult.success || !downloadResult.data) {
        console.error('❌ Failed to download file from Backblaze:', baseFileName);
        return null;
      }

      // Parse CSV data - handle different data formats
      let csvData = downloadResult.data;
      console.log('🔍 Raw download data type:', typeof csvData);
      console.log('🔍 Raw download data sample:', csvData);
      
      // Handle different data formats
      if (typeof csvData === 'string') {
        // Already a string, keep as is
        console.log('📝 Data is already a string');
      } else if (Array.isArray(csvData)) {
        // If it's an array, join it as CSV
        console.log('📋 Converting array to CSV string');
        csvData = csvData.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
      } else if (typeof csvData === 'object' && csvData !== null) {
        // Check if it's processed spreadsheet data
        const dataObj = csvData as any;
        if (dataObj.cells && dataObj.rowCount && dataObj.colCount) {
          console.log('📊 Data is processed spreadsheet format - keeping as object');
          // Keep as object - the frontend will handle conversion
        } else {
          // Other object, try to stringify it
          console.log('🔄 Converting object to JSON string');
          csvData = JSON.stringify(csvData);
        }
      } else {
        // Convert to string
        console.log('🔄 Converting to string');
        csvData = String(csvData);
      }
      
      console.log('✅ Final data type:', typeof csvData);
      if (typeof csvData === 'string') {
        console.log('📝 Final data sample:', csvData.substring(0, 100));
      } else {
        console.log('📊 Final data structure:', csvData);
      }
      
      const sheetId = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sheetName = baseFileName.replace('.csv.gz', '').replace('.csv', '');

      return {
        sheetId,
        sheetName,
        csvData: csvData as string,
        source: 'backblaze',
        lastModified: file.uploadTimestamp || Date.now()
      };
      
    } catch (error) {
      console.error('❌ Error loading sheet from Backblaze file:', error);
      return null;
    }
  }
}

export const indexedDBFirstLoader = new IndexedDBFirstLoaderService();
export type { LoadedSheet };
