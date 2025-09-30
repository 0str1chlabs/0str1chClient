// Simplified single interface for all sheet data
interface SheetRecord {
  id: string;                    // Unique sheet identifier
  name: string;                  // Sheet name (e.g., "Employee Data")
  csvData: string;              // Raw CSV data
  processedData?: any;          // Optional processed spreadsheet data
  lastModified: number;         // Timestamp
  isActive: boolean;           // Whether this is the currently active sheet
  changes?: Array<{             // Optional AI changes tracking
    cellId: string;
    previousValue: any;
    newValue: any;
    timestamp: number;
  }>;
  metadata?: {                  // Optional metadata
    rowCount: number;
    colCount: number;
    fileSize: number;
    uploadDate: number;
  };
}

// Legacy interfaces for backward compatibility (will be removed)
interface CSVFile {
  id: string;
  name: string;
  data: string;
  uploadedAt: number;
  lastModified: number;
  sheetId?: string;
}

interface SheetData {
  sheetId: string;
  sheetName: string;
  csvData: string;
  lastModified: number;
  isActive: boolean;
}

interface SheetChanges {
  sheetId: string;
  changes: Array<{
    cellId: string;
    previousValue: any;
    newValue: any;
    timestamp: number;
  }>;
  lastUpdated: number;
}

class IndexedDBService {
  private dbName = 'AISheetsDB';
  private version = 3; // Increment version to trigger schema update to simplified structure
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Delete old complex structure if it exists
        const oldStores = ['csvFiles', 'sheetData', 'sheetChanges'];
        oldStores.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            console.log(`🗑️ Deleting old object store: ${storeName}`);
            db.deleteObjectStore(storeName);
          }
        });
        
        // Create simplified single object store for all sheet data
        if (!db.objectStoreNames.contains('sheets')) {
          console.log('📁 Creating simplified single object store: sheets');
          const sheetsStore = db.createObjectStore('sheets', { keyPath: 'id' });
          
          // Create indexes for efficient querying
          sheetsStore.createIndex('name', 'name', { unique: false });
          sheetsStore.createIndex('isActive', 'isActive', { unique: false });
          sheetsStore.createIndex('lastModified', 'lastModified', { unique: false });
          sheetsStore.createIndex('uploadDate', 'metadata.uploadDate', { unique: false });
          
          console.log('✅ Simplified IndexedDB structure created successfully');
        }
      };
    });
  }

  async saveCSVFile(csvData: string, fileName: string, sheetId?: string): Promise<string> {
    if (!this.db) await this.init();

    // Clean the filename before storing to prevent folder paths in IndexedDB
    const { cleanFilename } = await import('./filenameUtils');
    const cleanFileName = cleanFilename(fileName, undefined, true);
    
    console.log('🧹 Cleaning filename for IndexedDB storage:', fileName, '->', cleanFileName);

    const id = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const csvFile: CSVFile = {
      id,
      name: cleanFileName, // Use cleaned filename
      data: csvData,
      uploadedAt: Date.now(),
      lastModified: Date.now(),
      sheetId
    };

    console.log('💾 Saving CSV to IndexedDB:', {
      id,
      originalFileName: fileName,
      cleanedFileName: cleanFileName,
      dataLength: csvData.length,
      firstChars: csvData.substring(0, 100)
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvFiles'], 'readwrite');
      const store = transaction.objectStore('csvFiles');
      const request = store.add(csvFile);

      request.onsuccess = () => {
        console.log('✅ CSV saved successfully to IndexedDB with ID:', id);
        resolve(id);
      };
      request.onerror = () => {
        console.error('❌ Failed to save CSV to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async getCSVFile(id: string): Promise<CSVFile | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvFiles'], 'readonly');
      const store = transaction.objectStore('csvFiles');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateCSVFile(id: string, csvData: string): Promise<void> {
    console.log('🔄 updateCSVFile called for ID:', id);
    console.log('📊 CSV data size:', csvData.length, 'chars');
    
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvFiles'], 'readwrite');
      const store = transaction.objectStore('csvFiles');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const csvFile = getRequest.result;
        if (csvFile) {
          console.log('📄 Found CSV file to update:', csvFile.name);
          csvFile.data = csvData;
          csvFile.lastModified = Date.now();
          
          const updateRequest = store.put(csvFile);
          updateRequest.onsuccess = () => {
            console.log('✅ CSV file updated successfully in IndexedDB');
            resolve();
          };
          updateRequest.onerror = () => {
            console.error('❌ Failed to update CSV file in IndexedDB:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          console.error('❌ CSV file not found for ID:', id);
          reject(new Error('CSV file not found'));
        }
      };
      getRequest.onerror = () => {
        console.error('❌ Failed to get CSV file from IndexedDB:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async getAllCSVFiles(): Promise<CSVFile[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvFiles'], 'readonly');
      const store = transaction.objectStore('csvFiles');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCSVFile(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvFiles'], 'readwrite');
      const store = transaction.objectStore('csvFiles');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Debug function to check if IndexedDB is working
  async testIndexedDB(): Promise<void> {
    try {
      await this.init();
      console.log('✅ IndexedDB initialized successfully');
      
      const allFiles = await this.getAllCSVFiles();
      console.log('📊 Current CSV files in IndexedDB:', allFiles.length);
      allFiles.forEach(file => {
        console.log(`  - ${file.name} (${file.id}) - ${file.data.length} chars`);
      });
    } catch (error) {
      console.error('❌ IndexedDB test failed:', error);
    }
  }

  // Save sheet data with sheet-specific storage
  async saveSheetData(sheetId: string, sheetName: string, csvData: string): Promise<void> {
    if (!this.db) await this.init();

    // Clean the sheet name before storing to prevent folder paths in IndexedDB
    const { cleanFilename } = await import('./filenameUtils');
    const cleanSheetName = cleanFilename(sheetName, undefined, true);
    
    console.log('🧹 Cleaning sheet name for IndexedDB storage:', sheetName, '->', cleanSheetName);

    const sheetData: SheetData = {
      sheetId,
      sheetName: cleanSheetName, // Use cleaned sheet name
      csvData,
      lastModified: Date.now(),
      isActive: true
    };

    console.log('💾 Saving sheet data to IndexedDB:', {
      sheetId,
      sheetName,
      dataLength: csvData.length
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetData'], 'readwrite');
      const store = transaction.objectStore('sheetData');
      
      // First, mark all other sheets as inactive
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const allSheets = getAllRequest.result;
        allSheets.forEach(sheet => {
          if (sheet.sheetId !== sheetId) {
            sheet.isActive = false;
            store.put(sheet);
          }
        });
        
        // Save the new sheet data
        const request = store.put(sheetData);
        request.onsuccess = () => {
          console.log('✅ Sheet data saved successfully to IndexedDB');
          resolve();
        };
        request.onerror = () => reject(request.error);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  // Get sheet data by sheet ID
  async getSheetData(sheetId: string): Promise<SheetData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetData'], 'readonly');
      const store = transaction.objectStore('sheetData');
      const request = store.get(sheetId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all sheet data
  async getAllSheetData(): Promise<SheetData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetData'], 'readonly');
      const store = transaction.objectStore('sheetData');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save sheet changes
  async saveSheetChanges(sheetId: string, changes: Array<{
    cellId: string;
    previousValue: any;
    newValue: any;
    timestamp: number;
  }>): Promise<void> {
    if (!this.db) await this.init();

    const sheetChanges: SheetChanges = {
      sheetId,
      changes,
      lastUpdated: Date.now()
    };

    console.log('💾 Saving sheet changes to IndexedDB:', {
      sheetId,
      changesCount: changes.length
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetChanges'], 'readwrite');
      const store = transaction.objectStore('sheetChanges');
      const request = store.put(sheetChanges);

      request.onsuccess = () => {
        console.log('✅ Sheet changes saved successfully to IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get sheet changes
  async getSheetChanges(sheetId: string): Promise<SheetChanges | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetChanges'], 'readonly');
      const store = transaction.objectStore('sheetChanges');
      const request = store.get(sheetId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ===== NEW SIMPLIFIED METHODS =====
  
  // Save a sheet using the new simplified structure
  async saveSheet(sheetData: Omit<SheetRecord, 'id' | 'lastModified'>): Promise<string> {
    if (!this.db) await this.init();

    // Clean the sheet name before storing to prevent folder paths in IndexedDB
    const { cleanFilename } = await import('./filenameUtils');
    const cleanSheetName = cleanFilename(sheetData.name, undefined, true);
    
    console.log('🧹 Cleaning sheet name for IndexedDB storage:', sheetData.name, '->', cleanSheetName);

    // Use filename-based ID for consistency, but check if sheet already exists
    const baseId = `sheet_${cleanSheetName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Check if a sheet with this name already exists
    const existingSheets = await this.getAllSheets();
    const existingSheet = existingSheets.find(s => s.name === cleanSheetName);
    
    let id: string;
    let operation: 'add' | 'put' = 'add';
    
    if (existingSheet) {
      // Update existing sheet
      id = existingSheet.id;
      operation = 'put';
      console.log('🔄 Updating existing sheet with ID:', id);
    } else {
      // Create new sheet with filename-based ID
      id = baseId;
      console.log('➕ Creating new sheet with ID:', id);
    }
    
    const record: SheetRecord = {
      ...sheetData,
      name: cleanSheetName, // Use cleaned sheet name
      id,
      lastModified: Date.now()
    };

    console.log('💾 Saving sheet to simplified IndexedDB structure:', {
      id,
      name: record.name,
      hasCsvData: !!record.csvData,
      hasChanges: !!record.changes?.length
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const request = operation === 'add' ? store.add(record) : store.put(record);

      request.onsuccess = () => {
        console.log('✅ Sheet saved successfully to simplified structure');
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get a sheet by ID using the new simplified structure
  async getSheet(sheetId: string): Promise<SheetRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const request = store.get(sheetId);

      request.onsuccess = () => {
        const result = request.result;
        console.log('📖 Retrieved sheet from simplified structure:', {
          sheetId,
          found: !!result,
          name: result?.name
        });
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all sheets using the new simplified structure
  async getAllSheets(): Promise<SheetRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result || [];
        console.log('📚 Retrieved all sheets from simplified structure:', {
          count: result.length,
          sheets: result.map(s => ({ id: s.id, name: s.name, isActive: s.isActive }))
        });
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get active sheet using the new simplified structure
  async getActiveSheet(): Promise<SheetRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const index = store.index('isActive');
      const request = index.get(1); // Use 1 instead of true for boolean index

      request.onsuccess = () => {
        const result = request.result;
        console.log('⭐ Retrieved active sheet from simplified structure:', {
          found: !!result,
          name: result?.name
        });
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Set active sheet (deactivates others) using the new simplified structure
  async setActiveSheet(sheetId: string): Promise<void> {
    if (!this.db) await this.init();

    console.log('🔄 Setting active sheet in simplified structure:', sheetId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      
      // First, deactivate all sheets
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const sheets = getAllRequest.result;
        let completed = 0;
        const total = sheets.length;

        if (total === 0) {
          resolve();
          return;
        }

        sheets.forEach(sheet => {
          if (sheet.id === sheetId) {
            // Activate the target sheet
            const activateRequest = store.put({ ...sheet, isActive: true, lastModified: Date.now() });
            activateRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                console.log('✅ Active sheet set successfully');
                resolve();
              }
            };
            activateRequest.onerror = () => reject(activateRequest.error);
          } else {
            // Deactivate other sheets
            const deactivateRequest = store.put({ ...sheet, isActive: false, lastModified: Date.now() });
            deactivateRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                console.log('✅ Active sheet set successfully');
                resolve();
              }
            };
            deactivateRequest.onerror = () => reject(deactivateRequest.error);
          }
        });
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  // Add changes to a sheet using the new simplified structure
  async addChangesToSheet(sheetId: string, changes: Array<{ cellId: string; previousValue: any; newValue: any }>): Promise<void> {
    if (!this.db) await this.init();

    const sheet = await this.getSheet(sheetId);
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    const newChanges = changes.map(change => ({
      ...change,
      timestamp: Date.now()
    }));

    const updatedChanges = [...(sheet.changes || []), ...newChanges];

    console.log('🔄 Adding changes to sheet in simplified structure:', {
      sheetId,
      newChangesCount: newChanges.length,
      totalChangesCount: updatedChanges.length
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const putRequest = store.put({ ...sheet, changes: updatedChanges, lastModified: Date.now() });

      putRequest.onsuccess = () => {
        console.log('✅ Changes added successfully to sheet');
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  // Get storage info using the new simplified structure
  async getSimplifiedStorageInfo(): Promise<{ totalSheets: number; totalSize: number; activeSheet?: string }> {
    const sheets = await this.getAllSheets();
    const activeSheet = sheets.find(s => s.isActive);
    
    const totalSize = sheets.reduce((sum, sheet) => {
      return sum + (sheet.csvData?.length || 0) + (sheet.metadata?.fileSize || 0);
    }, 0);

    console.log('📊 Simplified storage info:', {
      totalSheets: sheets.length,
      totalSize,
      activeSheet: activeSheet?.id
    });

    return {
      totalSheets: sheets.length,
      totalSize,
      activeSheet: activeSheet?.id
    };
  }

  // Clean existing IndexedDB data to remove folder paths from filenames
  async cleanExistingFilenames(): Promise<void> {
    if (!this.db) await this.init();

    console.log('🧹 Cleaning existing filenames in IndexedDB...');
    
    try {
      // Clean CSV files
      const csvFiles = await this.getAllCSVFiles();
      for (const file of csvFiles) {
        const { cleanFilename } = await import('./filenameUtils');
        const cleanName = cleanFilename(file.name, undefined, true);
        
        if (cleanName !== file.name) {
          console.log(`🧹 Cleaning CSV file: "${file.name}" -> "${cleanName}"`);
          file.name = cleanName;
          await this.updateCSVFile(file.id, file.data);
        }
      }

      // Clean sheets
      const sheets = await this.getAllSheets();
      for (const sheet of sheets) {
        const { cleanFilename } = await import('./filenameUtils');
        const cleanName = cleanFilename(sheet.name, undefined, true);
        
        if (cleanName !== sheet.name) {
          console.log(`🧹 Cleaning sheet: "${sheet.name}" -> "${cleanName}"`);
          // Update the sheet with the cleaned name
          const updatedSheet = { ...sheet, name: cleanName };
          await this.saveSheet(updatedSheet);
        }
      }

      console.log('✅ Filename cleaning completed');
    } catch (error) {
      console.error('❌ Error cleaning filenames:', error);
    }
  }
}

export const indexedDBService = new IndexedDBService();
export type { CSVFile, SheetData, SheetChanges, SheetRecord };
