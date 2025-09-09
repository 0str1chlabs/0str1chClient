import pako from 'pako';

export interface SheetDataMongo {
  userEmail: string;
  fileName: string;
  compressedData: string; // Base64 encoded compressed data
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  uploadDate: Date;
  lastAccessed: Date;
  metadata: {
    totalRows: number;
    totalColumns: number;
    headers: string[];
    dataTypes: string[];
  };
}

export class MongoDBService {
  private static instance: MongoDBService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api' 
      : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090') + '/api';
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  /**
   * Compress and store sheet data in MongoDB
   */
  async storeSheetData(
    userEmail: string,
    fileName: string,
    sheetData: any,
    metadata: any
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Safely convert sheet data to JSON string, handling circular references
      let jsonData: string;
      try {
        jsonData = JSON.stringify(sheetData);
      } catch (stringifyError) {
        console.warn('JSON.stringify failed, trying to clean data:', stringifyError);
        // Clean the data by removing potential circular references
        const cleanData = this.cleanCircularReferences(sheetData);
        jsonData = JSON.stringify(cleanData);
      }
      
      const originalSize = new Blob([jsonData]).size;

      // Compress the data using pako (gzip)
      const compressedData = pako.gzip(jsonData);
      const compressedSize = compressedData.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      // Convert compressed data to base64 for storage
      const base64Data = btoa(String.fromCharCode(...compressedData));

      console.log('📊 Data compression stats:', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`,
        userEmail,
        fileName
      });

      const payload: SheetDataMongo = {
        userEmail,
        fileName,
        compressedData: base64Data,
        originalSize,
        compressedSize,
        compressionRatio,
        uploadDate: new Date(),
        lastAccessed: new Date(),
        metadata
      };

      const response = await fetch(`${this.baseUrl}/sheet-data/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Sheet data compressed and stored in MongoDB:', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`,
        userEmail,
        fileName
      });

      return { success: true, message: 'Sheet data stored successfully', data: result };
    } catch (error) {
      console.error('❌ Error storing sheet data in MongoDB:', error);
      return { 
        success: false, 
        message: `Failed to store sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Retrieve and decompress sheet data from MongoDB
   */
  async retrieveSheetData(
    userEmail: string,
    fileName?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const params = new URLSearchParams({ userEmail });
      if (fileName) {
        params.append('fileName', fileName);
      }

      const response = await fetch(`${this.baseUrl}/sheet-data/retrieve?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, message: 'No sheet data found for this user' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.data || !result.data.compressedData) {
        return { success: false, message: 'Invalid data format received from server' };
      }

      // Decompress the data
      const compressedData = Uint8Array.from(
        atob(result.data.compressedData), 
        c => c.charCodeAt(0)
      );
      
      const decompressedData = pako.ungzip(compressedData, { to: 'string' });
      const sheetData = JSON.parse(decompressedData);

      console.log('✅ Sheet data retrieved and decompressed from MongoDB:', {
        fileName: result.data.fileName,
        originalSize: `${(result.data.originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(result.data.compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${result.data.compressionRatio.toFixed(1)}%`,
        userEmail
      });

      return { 
        success: true, 
        message: 'Sheet data retrieved successfully', 
        data: { ...result.data, sheetData } 
      };
    } catch (error) {
      console.error('❌ Error retrieving sheet data from MongoDB:', error);
      return { 
        success: false, 
        message: `Failed to retrieve sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if user has existing sheet data
   */
  async checkUserSheetData(userEmail: string): Promise<{ success: boolean; hasData: boolean; data?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/sheet-data/check?userEmail=${userEmail}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return { 
        success: true, 
        hasData: result.hasData || false, 
        data: result.data 
      };
    } catch (error) {
      console.error('❌ Error checking user sheet data:', error);
      return { 
        success: false, 
        hasData: false, 
        message: `Failed to check sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(userEmail: string, fileName: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sheet-data/update-access`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ userEmail, fileName })
      });
    } catch (error) {
      console.error('❌ Error updating last accessed timestamp:', error);
    }
  }

  /**
   * Clean circular references from data to prevent JSON.stringify errors
   */
  private cleanCircularReferences(obj: any, seen = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    
    seen.add(obj);
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanCircularReferences(item, seen));
    }
    
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        try {
          cleaned[key] = this.cleanCircularReferences(obj[key], seen);
        } catch (error) {
          cleaned[key] = '[Error Processing]';
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Delete sheet data from MongoDB
   */
  async deleteSheetData(userEmail: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sheet-data/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ userEmail, fileName })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Sheet data deleted from MongoDB:', { fileName, userEmail });
      return { success: true, message: 'Sheet data deleted successfully' };
    } catch (error) {
      console.error('❌ Error deleting sheet data from MongoDB:', error);
      return { 
        success: false, 
        message: `Failed to delete sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export default MongoDBService.getInstance();
