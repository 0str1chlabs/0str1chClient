/**
 * Simplified IndexedDB Service - Single Object Store Approach
 * 
 * This service uses a single object store to store all sheet data,
 * making it much simpler and more efficient than the current
 * multi-store approach.
 */

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

class SimpleIndexedDBService {
  private dbName = 'AISheetsDB';
  private version = 3; // Increment to trigger schema update
  private db: IDBDatabase | null = null;
  private static instance: SimpleIndexedDBService;

  static getInstance(): SimpleIndexedDBService {
    if (!SimpleIndexedDBService.instance) {
      SimpleIndexedDBService.instance = new SimpleIndexedDBService();
    }
    return SimpleIndexedDBService.instance;
  }

  async init(): Promise<void> {
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
        
        // Create single object store for all sheet data
        if (!db.objectStoreNames.contains('sheets')) {
          const sheetsStore = db.createObjectStore('sheets', { keyPath: 'id' });
          
          // Create indexes for efficient querying
          sheetsStore.createIndex('name', 'name', { unique: false });
          sheetsStore.createIndex('isActive', 'isActive', { unique: false });
          sheetsStore.createIndex('lastModified', 'lastModified', { unique: false });
          sheetsStore.createIndex('uploadDate', 'metadata.uploadDate', { unique: false });
        }

        // Clean up old object stores if they exist
        const oldStores = ['csvFiles', 'sheetData', 'sheetChanges'];
        oldStores.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
          }
        });
      };
    });
  }

  // Save a new sheet
  async saveSheet(sheetData: Omit<SheetRecord, 'id' | 'lastModified'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: SheetRecord = {
      ...sheetData,
      id,
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const request = store.add(record);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get a sheet by ID
  async getSheet(sheetId: string): Promise<SheetRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const request = store.get(sheetId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get a sheet by name
  async getSheetByName(name: string): Promise<SheetRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const index = store.index('name');
      const request = index.get(name);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all sheets
  async getAllSheets(): Promise<SheetRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get active sheet
  async getActiveSheet(): Promise<SheetRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const index = store.index('isActive');
      const request = index.get(true);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Update a sheet
  async updateSheet(sheetId: string, updates: Partial<SheetRecord>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const getRequest = store.get(sheetId);

      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        if (!existingRecord) {
          reject(new Error('Sheet not found'));
          return;
        }

        const updatedRecord = {
          ...existingRecord,
          ...updates,
          lastModified: Date.now()
        };

        const putRequest = store.put(updatedRecord);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Set active sheet (deactivates others)
  async setActiveSheet(sheetId: string): Promise<void> {
    if (!this.db) await this.init();

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
              if (completed === total) resolve();
            };
            activateRequest.onerror = () => reject(activateRequest.error);
          } else {
            // Deactivate other sheets
            const deactivateRequest = store.put({ ...sheet, isActive: false, lastModified: Date.now() });
            deactivateRequest.onsuccess = () => {
              completed++;
              if (completed === total) resolve();
            };
            deactivateRequest.onerror = () => reject(deactivateRequest.error);
          }
        });
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  // Delete a sheet
  async deleteSheet(sheetId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const request = store.delete(sheetId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Add changes to a sheet
  async addChanges(sheetId: string, changes: Array<{ cellId: string; previousValue: any; newValue: any }>): Promise<void> {
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

    await this.updateSheet(sheetId, { changes: updatedChanges });
  }

  // Get changes for a sheet
  async getChanges(sheetId: string): Promise<Array<{ cellId: string; previousValue: any; newValue: any; timestamp: number }>> {
    const sheet = await this.getSheet(sheetId);
    return sheet?.changes || [];
  }

  // Clear changes for a sheet
  async clearChanges(sheetId: string): Promise<void> {
    await this.updateSheet(sheetId, { changes: [] });
  }

  // Get storage info
  async getStorageInfo(): Promise<{ totalSheets: number; totalSize: number; activeSheet?: string }> {
    const sheets = await this.getAllSheets();
    const activeSheet = sheets.find(s => s.isActive);
    
    const totalSize = sheets.reduce((sum, sheet) => {
      return sum + (sheet.csvData?.length || 0) + (sheet.metadata?.fileSize || 0);
    }, 0);

    return {
      totalSheets: sheets.length,
      totalSize,
      activeSheet: activeSheet?.id
    };
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const simpleIndexedDBService = new SimpleIndexedDBService();
export { SimpleIndexedDBService, type SheetRecord };

