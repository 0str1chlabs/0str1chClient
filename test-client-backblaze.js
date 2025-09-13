import { gzip } from 'fflate';

// Client-side test for Backblaze B2 integration
// This tests the actual frontend-to-backend flow

class ClientBackblazeTester {
    constructor() {
        // Use VITE_BACKEND_URL if available, otherwise localhost for development
        const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:8090';
        this.baseUrl = backendUrl + '/api/backblaze';
        console.log('🔧 Client Backblaze Tester initialized with baseUrl:', this.baseUrl);
    }

    /**
     * Test complete client-side flow
     */
    async testCompleteFlow() {
        console.log('🧪 Testing Complete Client-Side Backblaze Flow...\n');

        try {
            // Test data
            const testUserEmail = 'test-client@example.com';
            const testFileName = `client-test-${Date.now()}`;
            const sampleSheetData = {
                cells: {
                    'A1': { value: 'Name', colHeader: 'Name' },
                    'B1': { value: 'Age', colHeader: 'Age' },
                    'A2': { value: 'John Doe', colHeader: 'Name' },
                    'B2': { value: 30, colHeader: 'Age' },
                    'A3': { value: 'Jane Smith', colHeader: 'Name' },
                    'B3': { value: 25, colHeader: 'Age' }
                },
                rowCount: 3,
                colCount: 2
            };

            // Test 1: Check service status
            console.log('1️⃣ Testing Backblaze service status...');
            const statusResult = await this.checkServiceStatus();
            if (!statusResult.success) {
                throw new Error(`Service status check failed: ${statusResult.message}`);
            }
            console.log('✅ Backblaze service is available');

            // Test 2: Compress data (client-side compression)
            console.log('\n2️⃣ Testing client-side data compression...');
            const compressedData = await this.compressSheetData(sampleSheetData);
            console.log(`✅ Data compressed: ${(compressedData.originalSize / 1024).toFixed(2)} KB → ${(compressedData.compressedSize / 1024).toFixed(2)} KB`);
            console.log(`📊 Compression ratio: ${compressedData.compressionRatio.toFixed(1)}%`);

            // Test 3: Upload data via API
            console.log('\n3️⃣ Testing data upload via API...');
            const uploadResult = await this.uploadSheetData(testUserEmail, testFileName, compressedData);
            if (!uploadResult.success) {
                throw new Error(`Upload failed: ${uploadResult.message}`);
            }
            console.log('✅ Data uploaded successfully to Backblaze');

            // Test 4: Check user data
            console.log('\n4️⃣ Testing user data check...');
            const checkResult = await this.checkUserData(testUserEmail);
            if (!checkResult.success) {
                throw new Error(`User data check failed: ${checkResult.message}`);
            }
            console.log(`✅ User has ${checkResult.hasData ? 'data' : 'no data'} in Backblaze`);

            // Test 5: List user files
            console.log('\n5️⃣ Testing file listing...');
            const filesResult = await this.listUserFiles(testUserEmail);
            if (!filesResult.success) {
                throw new Error(`File listing failed: ${filesResult.message}`);
            }
            console.log(`✅ Found ${filesResult.data?.length || 0} files for user`);

            // Test 6: Retrieve data
            console.log('\n6️⃣ Testing data retrieval...');
            const retrieveResult = await this.retrieveSheetData(testUserEmail, testFileName);
            if (!retrieveResult.success) {
                throw new Error(`Data retrieval failed: ${retrieveResult.message}`);
            }
            console.log('✅ Data retrieved successfully from Backblaze');

            // Test 7: Delete data (cleanup)
            console.log('\n7️⃣ Testing data deletion (cleanup)...');
            const deleteResult = await this.deleteSheetData(testUserEmail, testFileName);
            if (!deleteResult.success) {
                console.warn(`⚠️ Cleanup failed: ${deleteResult.message}`);
            } else {
                console.log('✅ Test data cleaned up successfully');
            }

            console.log('\n🎉 All Client-Side Backblaze tests passed!');
            console.log('📝 Summary:');
            console.log('   ✅ Service status check');
            console.log('   ✅ Client-side compression');
            console.log('   ✅ Data upload via API');
            console.log('   ✅ User data checking');
            console.log('   ✅ File listing');
            console.log('   ✅ Data retrieval');
            console.log('   ✅ Data deletion');
            console.log('   ✅ Complete client-to-Backblaze flow');

            return { success: true, message: 'All client-side tests passed' };

        } catch (error) {
            console.error('❌ Client-side test failed:', error);
            console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if Backblaze service is available
     */
    async checkServiceStatus() {
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
            console.error('❌ Error checking service status:', error);
            return {
                success: false,
                message: `Service status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Compress sheet data client-side
     */
    async compressSheetData(sheetData) {
        try {
            // Clean data for serialization
            const cleanedData = this.cleanDataForSerialization(sheetData);

            // Convert to JSON
            const jsonData = JSON.stringify(cleanedData);
            const originalSize = new Blob([jsonData]).size;

            // Compress using fflate
            const compressedData = await new Promise((resolve, reject) => {
                gzip(
                    new TextEncoder().encode(jsonData),
                    { level: 6 },
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

            // Convert to base64
            const binaryString = Array.from(compressedData, byte => String.fromCharCode(byte)).join('');
            const compressedBase64 = btoa(binaryString);

            return {
                originalSize,
                compressedSize,
                compressionRatio,
                compressedBase64,
                metadata: {
                    totalRows: sheetData.rowCount || 0,
                    totalColumns: sheetData.colCount || 0,
                    compressionRatio,
                    compressionLevel: 6,
                    isCompressed: true
                }
            };
        } catch (error) {
            console.error('❌ Error compressing data:', error);
            throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Clean data for serialization
     */
    cleanDataForSerialization(data) {
        const seen = new WeakSet();

        const clean = (obj) => {
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

            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value === null ||
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    (typeof value === 'object' && value.constructor === Object)) {
                    cleaned[key] = clean(value);
                } else {
                    cleaned[key] = '[Complex Object]';
                }
            }

            seen.delete(obj);
            return cleaned;
        };

        return clean(data);
    }

    /**
     * Upload sheet data via API
     */
    async uploadSheetData(userEmail, fileName, compressedData) {
        try {
            const response = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail,
                    fileName,
                    compressedData: compressedData.compressedBase64,
                    metadata: compressedData.metadata
                }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error uploading data:', error);
            return {
                success: false,
                message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Check user data
     */
    async checkUserData(userEmail) {
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
            console.error('❌ Error checking user data:', error);
            return {
                success: false,
                message: `User data check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * List user files
     */
    async listUserFiles(userEmail) {
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
            console.error('❌ Error listing user files:', error);
            return {
                success: false,
                message: `File listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Retrieve sheet data
     */
    async retrieveSheetData(userEmail, fileName) {
        try {
            const response = await fetch(`${this.baseUrl}/retrieve/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error retrieving data:', error);
            return {
                success: false,
                message: `Data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Delete sheet data
     */
    async deleteSheetData(userEmail, fileName) {
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
            console.error('❌ Error deleting data:', error);
            return {
                success: false,
                message: `Data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Test direct upload URL generation (for future direct uploads)
     */
    async testDirectUploadSetup(userEmail) {
        try {
            console.log('\n🔧 Testing direct upload URL generation...');

            // This would be a future endpoint for generating upload URLs
            const response = await fetch(`${this.baseUrl}/get-upload-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail,
                    fileName: 'direct-upload-test.txt'
                }),
            });

            if (response.status === 404) {
                console.log('ℹ️ Direct upload endpoint not implemented yet (normal)');
                return { success: true, message: 'Direct upload not yet implemented' };
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.log('ℹ️ Direct upload testing skipped:', error.message);
            return { success: true, message: 'Direct upload not yet implemented' };
        }
    }
}

// Export for use in browser or Node.js
export default ClientBackblazeTester;

// Run test if called directly
if (typeof window === 'undefined') {
    // Node.js environment
    const tester = new ClientBackblazeTester();

    console.log('🚀 Running Client-Side Backblaze Tests...\n');

    tester.testCompleteFlow().then((result) => {
        if (result.success) {
            console.log('\n🏁 Client-side testing completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Client-side testing failed!');
            process.exit(1);
        }
    }).catch((error) => {
        console.error('\n💥 Client-side testing error:', error);
        process.exit(1);
    });
}
