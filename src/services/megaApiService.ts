import { gzip } from 'fflate';

export interface SheetDataMega {
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
  megaFileId?: string;
  megaFileUrl?: string;
  filePath: string;
}

export class MegaApiService {
  private static instance: MegaApiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = 'http://localhost:8090/api/mega';
  }

  public static getInstance(): MegaApiService {
    if (!MegaApiService.instance) {
      MegaApiService.instance = new MegaApiService();
    }
    return MegaApiService.instance;
  }

  /**
   * Check if MEGA service is available and authenticated
   */
  async checkMegaStatus(): Promise<{ success: boolean; message: string }> {
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
      console.error('❌ Error checking MEGA status:', error);
      return { 
        success: false, 
        message: `Failed to check MEGA status: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Store sheet data via backend MEGA API
   */
  async storeSheetData(
    userEmail: string,
    fileName: string,
    sheetData: any,
    metadata: any
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Compressing sheet data before sending to backend...');
      
      // Compress the sheet data using fflate
      const jsonData = JSON.stringify(sheetData);
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
      const compressedBase64 = btoa(String.fromCharCode(...compressedData));
      
      // Add compression metadata
      const enhancedMetadata = {
        ...metadata,
        totalSize: originalSize,
        compressionRatio,
        compressionLevel: 6,
        isCompressed: true
      };

      console.log('🔄 Sending compressed sheet data to backend for MEGA storage...');
      
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          fileName,
          compressedData: compressedBase64,
          metadata: enhancedMetadata
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sheet data successfully sent to backend for MEGA storage');
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

export default MegaApiService.getInstance();
