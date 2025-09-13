import { gzip } from 'fflate';

export interface SheetDataBackblaze {
  userEmail: string;
  fileName: string;
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
  firebaseFilePath?: string;
  firebaseFileURL?: string;
  filePath: string;
}

export class BackblazeApiService {
  private static instance: BackblazeApiService;
  private baseUrl: string;

  private constructor() {
    // Use VITE_BACKEND_URL if available, otherwise fallback to localhost for development
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
    this.baseUrl = backendUrl + '/api/backblaze';
    console.log('🔧 BackblazeApiService initialized with baseUrl:', this.baseUrl);
    console.log('🔧 VITE_BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
  }

  public static getInstance(): BackblazeApiService {
    if (!BackblazeApiService.instance) {
      BackblazeApiService.instance = new BackblazeApiService();
    }
    return BackblazeApiService.instance;
  }

  /**
   * Check if Backblaze service is available and authenticated
   */
  async checkBackblazeStatus(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error checking Backblaze status:', error);
      return {
        success: false,
        message: `Failed to check Backblaze status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clean data to remove circular references and complex objects
   */
  private cleanDataForSerialization(data: any): any {
    const seen = new WeakSet();
    
    const clean = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(clean);
      }
      
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Only include primitive values and simple objects
        if (value === null || 
            typeof value === 'string' || 
            typeof value === 'number' || 
            typeof value === 'boolean' ||
            (typeof value === 'object' && value.constructor === Object)) {
          cleaned[key] = clean(value);
        } else {
          // Skip complex objects like functions, DOM elements, etc.
          cleaned[key] = '[Complex Object]';
        }
      }
      
      seen.delete(obj);
      return cleaned;
    };
    
    return clean(data);
  }

  /**
   * Store sheet data via backend Backblaze API
   */
  async storeSheetData(
    userEmail: string,
    fileName: string,
    sheetData: any,
    metadata: any
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Compressing sheet data before sending to backend...');
      
      // Clean the data to remove circular references and complex objects
      console.log('🧹 Cleaning data for serialization...');
      const cleanedSheetData = this.cleanDataForSerialization(sheetData);
      const cleanedMetadata = this.cleanDataForSerialization(metadata);
      
      console.log('📊 Data cleaning completed:', {
        originalCellsCount: Object.keys(sheetData.cells || {}).length,
        cleanedCellsCount: Object.keys(cleanedSheetData.cells || {}).length,
        metadataKeys: Object.keys(cleanedMetadata)
      });
      
      // Compress the sheet data using fflate
      let jsonData: string;
      try {
        jsonData = JSON.stringify(cleanedSheetData);
      } catch (stringifyError) {
        console.error('❌ JSON stringify failed:', stringifyError);
        throw new Error(`Failed to serialize sheet data: ${stringifyError instanceof Error ? stringifyError.message : 'Unknown error'}`);
      }
      
      const originalSize = new Blob([jsonData]).size;
      
      // Compress data using fflate
      const compressedData = await new Promise<Uint8Array>((resolve, reject) => {
        gzip(
          new TextEncoder().encode(jsonData),
          { level: 6 }, // Default compression level
          (err, compressed) => {
            if (err) {
              reject(err);
            } else {
              resolve(compressed);
            }
          }
        );
      });

      const compressedSize = compressedData.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      console.log('📊 Compression completed:', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`
      });

      // Convert compressed data to base64 for JSON transmission
      // Use a more efficient approach to avoid stack overflow with large arrays
      console.log('🔄 Converting compressed data to base64...');
      let compressedBase64: string;
      try {
        // Use a more memory-efficient approach for large arrays
        console.log(`📊 Converting ${compressedData.length} bytes to base64...`);
        const binaryString = Array.from(compressedData, byte => String.fromCharCode(byte)).join('');
        compressedBase64 = btoa(binaryString);
        console.log('✅ Base64 conversion completed successfully');
      } catch (base64Error) {
        console.error('❌ Base64 conversion failed:', base64Error);
        throw new Error(`Failed to convert compressed data to base64: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`);
      }
      
      // Add compression metadata
      const enhancedMetadata = {
        ...cleanedMetadata,
        totalSize: originalSize,
        compressionRatio,
        compressionLevel: 6,
        isCompressed: true
      };

      console.log('🔄 Sending compressed sheet data to backend for Backblaze storage...');
      
      // Prepare the request body with error handling
      let requestBody: string;
      try {
        requestBody = JSON.stringify({
          userEmail,
          fileName,
          compressedData: compressedBase64,
          metadata: enhancedMetadata
        });
        console.log(`📊 Request body size: ${(requestBody.length / 1024).toFixed(2)} KB`);
      } catch (requestBodyError) {
        console.error('❌ Failed to stringify request body:', requestBodyError);
        throw new Error(`Failed to prepare request body: ${requestBodyError instanceof Error ? requestBodyError.message : 'Unknown error'}`);
      }
      
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sheet data successfully sent to backend for Backblaze storage');
        return result;
      } else {
        console.error('❌ Backend failed to store sheet data:', result.message);
        return result;
      }
    } catch (error) {
      console.error('❌ Error sending sheet data to backend:', error);
      return { 
        success: false, 
        message: `Failed to send sheet data to backend: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if user has existing sheet data via backend
   */
  async checkUserSheetData(userEmail: string): Promise<{ success: boolean; hasData: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/check/${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error checking user sheet data via backend:', error);
      return { 
        success: false, 
        hasData: false, 
        message: `Failed to check sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * List all files for a user via backend
   */
  async listUserFiles(userEmail: string): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error listing user files via backend:', error);
      return { 
        success: false, 
        message: `Failed to list user files: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Retrieve sheet data via backend
   */
  async retrieveSheetData(
    userEmail: string,
    fileName: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Requesting sheet data retrieval from backend...');
      
      const response = await fetch(`${this.baseUrl}/retrieve/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sheet data successfully retrieved via backend');
        return result;
      } else {
        console.error('❌ Backend failed to retrieve sheet data:', result.message);
        return result;
      }
    } catch (error) {
      console.error('❌ Error retrieving sheet data via backend:', error);
      return { 
        success: false, 
        message: `Failed to retrieve sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete sheet data via backend
   */
  async deleteSheetData(userEmail: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/delete/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error deleting sheet data via backend:', error);
      return { 
        success: false, 
        message: `Failed to delete sheet data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get storage information via backend
   */
  async getStorageInfo(): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/storage-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error getting storage info via backend:', error);
      return { 
        success: false, 
        message: `Failed to get storage info: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export default BackblazeApiService.getInstance();
