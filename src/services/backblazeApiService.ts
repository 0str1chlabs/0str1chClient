import { gzipSync, gunzipSync } from 'fflate';

// Backend API Configuration (for routing through backend)
// Use relative URL in development (Vite proxy), full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:8090');
const BACKBLAZE_API_URL = `${API_BASE_URL}/api/backblaze`;

interface BackblazeAuthResponse {
  accountId: string;
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
}

interface BackblazeUploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

interface BackblazeFileInfo {
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
  contentLength: number;
  size: number;
  contentType: string;
}

// Removed direct API interfaces - using backend routing instead

interface BackblazeAccountInfo {
  accountId: string;
  accountType: string;
  allowed: any;
}

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
  backblazeFileId?: string;
  backblazeFileUrl?: string;
  filePath: string;
}

class BackblazeApiService {
  private static instance: BackblazeApiService;

  private constructor() {}

  static getInstance(): BackblazeApiService {
    if (!BackblazeApiService.instance) {
      BackblazeApiService.instance = new BackblazeApiService();
    }
    return BackblazeApiService.instance;
  }


  // Authenticate with Backblaze B2 via backend (no CORS issues)
  async authenticate(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Backblaze authentication successful via backend');
      
      return { success: true, message: 'Backblaze authentication successful' };
    } catch (error) {
      console.error('❌ Backblaze authentication failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  // Backend handles bucket ID and upload URLs internally


  // Compress data using fflate
  private compressData(data: unknown): Uint8Array {
    const jsonString = JSON.stringify(data);
    const input = new TextEncoder().encode(jsonString);
    return gzipSync(input);
  }

  // Decompress data using fflate
  private decompressData(compressedData: Uint8Array): unknown {
    const decompressed = gunzipSync(compressedData);
    const jsonString = new TextDecoder().decode(decompressed);
    return JSON.parse(jsonString);
  }

  // Upload file via backend with frontend compression (no CORS issues)
  async uploadFile(userEmail: string, fileName: string, data: unknown, metadata: Record<string, unknown> = {}): Promise<{ success: boolean; fileId?: string; message: string }> {
    try {
      // Compress data on frontend for efficiency
      const compressedData = this.compressData(data);
      const originalSize = JSON.stringify(data).length;
      const compressedSize = compressedData.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      console.log('📊 Frontend compression completed:', {
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio.toFixed(1)}%`
      });

      // Add compression metadata
      const enhancedMetadata = {
        ...metadata,
        originalSize,
        compressedSize,
        compressionRatio,
        uploadTimestamp: Date.now()
      };

      // Convert compressed data to base64 for JSON transmission
      const base64Data = btoa(String.fromCharCode(...compressedData));

      // Send compressed data to backend for upload to Backblaze B2
      const response = await fetch(`${BACKBLAZE_API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail,
          fileName,
          compressedData: base64Data,
          metadata: enhancedMetadata
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ File uploaded successfully via backend to Backblaze B2');

      return {
        success: true,
        fileId: result.data?.fileId,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // List files for a user via backend
  async listUserFiles(userEmail: string): Promise<{ success: boolean; files?: BackblazeFileInfo[]; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/files/${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        files: result.data || [],
        message: result.message || `Found ${result.data?.length || 0} files for user`
      };
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list files'
      };
    }
  }

  // Download file via backend with automatic decompression
  async downloadFile(userEmail: string, fileName: string): Promise<{ success: boolean; data?: unknown; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/retrieve/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.sheetData) {
        // Data is already decompressed by the backend
        return {
          success: true,
          data: result.data.sheetData,
          message: 'File downloaded successfully'
        };
      } else {
        throw new Error(result.message || 'Download failed');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  // Delete file via backend
  async deleteFile(userEmail: string, fileName: string, fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/delete/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId
        })
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: result.message || 'File deleted successfully'
      };
    } catch (error) {
      console.error('❌ Delete failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  // Check if user has any files via backend
  async checkUserFiles(userEmail: string): Promise<{ success: boolean; hasFiles: boolean; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/check/${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Check failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        hasFiles: result.hasData || false,
        message: result.message || 'Check completed'
      };
    } catch (error) {
      return {
        success: false,
        hasFiles: false,
        message: error instanceof Error ? error.message : 'Check failed'
      };
    }
  }

  // Store sheet data (main method for frontend)
  async storeSheetData(userEmail: string, fileName: string, sheetData: unknown, metadata: Record<string, unknown> = {}): Promise<{ success: boolean; message: string; data?: unknown }> {
    const fullFileName = `user_${userEmail}/${fileName}`;
    const result = await this.uploadFile(userEmail, fullFileName, sheetData, metadata);
    
    if (result.success) {
      return {
        success: true,
        message: 'Sheet data stored successfully',
        data: {
          fileName: fullFileName,
          fileId: result.fileId,
          userEmail,
          uploadDate: new Date(),
          metadata
        }
      };
    }
    
    return result;
  }

  // Retrieve sheet data (main method for frontend)
  async retrieveSheetData(userEmail: string, fileName: string): Promise<{ success: boolean; data?: unknown; message: string }> {
    return await this.downloadFile(userEmail, fileName);
  }

  // Delete sheet data (main method for frontend)
  async deleteSheetData(userEmail: string, fileName: string, fileId: string): Promise<{ success: boolean; message: string }> {
    return await this.deleteFile(userEmail, fileName, fileId);
  }

  // Get storage info via backend
  async getStorageInfo(): Promise<{ success: boolean; data?: BackblazeAccountInfo; message: string }> {
    try {
      const response = await fetch(`${BACKBLAZE_API_URL}/storage-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get storage info: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result.data,
        message: result.message || 'Storage info retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get storage info'
      };
    }
  }
}

export default BackblazeApiService;
